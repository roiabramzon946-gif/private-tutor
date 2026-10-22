-- =====================================================================
-- Migration 002 — מספרי טלפון + צ'אט באתר
-- להרצה ב-SQL Editor של Supabase, פעם אחת, אחרי הסכמה ונתוני הדמה
-- =====================================================================


-- =====================================================================
-- 1. טלפונים
-- טבלה נפרדת מ-profiles (שהיא ציבורית) כדי שהטלפון לא ייחשף לכולם.
-- מורה בוחר/ת אם להציג את הטלפון בפרופיל (show_phone).
-- טלפון של תלמיד גלוי רק לתלמיד עצמו.
-- =====================================================================

-- נרמול מספר ישראלי לפורמט 05XXXXXXXX / 0XXXXXXXX (מקבל גם +972, רווחים ומקפים)
create or replace function public.normalize_il_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when d ~ '^972[0-9]{8,9}$' then '0' || substr(d, 4)
           when d ~ '^0[0-9]{8,9}$'   then d
           else null
         end
    from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s;
$$;

create table public.user_contacts (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  phone       text check (phone ~ '^0[0-9]{8,9}$'),
  show_phone  boolean not null default false,
  updated_at  timestamptz not null default now()
);

create trigger user_contacts_updated_at before update on public.user_contacts
  for each row execute function public.set_updated_at();

-- שורה לכל משתמש קיים
insert into public.user_contacts (user_id)
select id from public.profiles
on conflict do nothing;

alter table public.user_contacts enable row level security;

create policy "contacts: owner read"
  on public.user_contacts for select to authenticated
  using (user_id = (select auth.uid()));

-- טלפון של מורה פעיל שבחר להציגו — גלוי רק למשתמשים מחוברים
create policy "contacts: visible teacher phone"
  on public.user_contacts for select to authenticated
  using (
    show_phone
    and phone is not null
    and exists (select 1 from public.teachers t where t.id = user_id and t.is_active)
  );

create policy "contacts: owner update"
  on public.user_contacts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_contacts from anon;
revoke insert, update, delete on public.user_contacts from authenticated;
grant update (phone, show_phone) on public.user_contacts to authenticated;


-- עדכון טריגר ההרשמה: שומר גם טלפון והעדפת הצגה
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := case
              when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher'::public.user_role
              else 'student'::public.user_role
            end;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data->>'full_name', ''));

  if v_role = 'teacher' then
    insert into public.teachers (id) values (new.id);
  end if;

  insert into public.user_contacts (user_id, phone, show_phone)
  values (
    new.id,
    public.normalize_il_phone(new.raw_user_meta_data->>'phone'),
    v_role = 'teacher' and new.raw_user_meta_data->>'show_phone' = 'true'
  );

  return new;
end;
$$;


-- =====================================================================
-- 2. צ'אט
-- שיחה = זוג תלמיד+מורה. רק תלמיד פותח שיחה; שני הצדדים כותבים.
-- =====================================================================
create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (student_id, teacher_id),
  check (student_id <> teacher_id)
);

create index conversations_student_idx on public.conversations (student_id, last_message_at desc);
create index conversations_teacher_idx on public.conversations (teacher_id, last_message_at desc);

create table public.messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  body             text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- האם המשתמש המחובר משתתף בשיחה
create or replace function public.is_conversation_participant(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
     where c.id = p_conversation
       and (select auth.uid()) in (c.student_id, c.teacher_id)
  );
$$;

-- עדכון זמן ההודעה האחרונה בשיחה
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();


-- ---------- RLS: conversations ----------
alter table public.conversations enable row level security;

create policy "conversations: participants read"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (student_id, teacher_id));

create policy "conversations: student starts"
  on public.conversations for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role = 'student')
    and exists (select 1 from public.teachers t
                 where t.id = teacher_id and t.is_active)
  );

revoke all on public.conversations from anon;
revoke insert, update, delete on public.conversations from authenticated;
grant insert (student_id, teacher_id) on public.conversations to authenticated;


-- ---------- RLS: messages ----------
alter table public.messages enable row level security;

create policy "messages: participants read"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "messages: participants send"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

-- הנמען מסמן כ"נקרא"
create policy "messages: recipient marks read"
  on public.messages for update to authenticated
  using (public.is_conversation_participant(conversation_id) and sender_id <> (select auth.uid()))
  with check (public.is_conversation_participant(conversation_id) and sender_id <> (select auth.uid()));

revoke all on public.messages from anon;
revoke insert, update, delete on public.messages from authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;


-- ---------- פונקציות לממשק ----------

-- רשימת השיחות שלי, עם הצד השני, ההודעה האחרונה ומספר הלא-נקראות
create or replace function public.my_conversations()
returns table (
  conversation_id  uuid,
  other_id         uuid,
  other_name       text,
  other_avatar     text,
  other_role       public.user_role,
  last_message     text,
  last_sender_id   uuid,
  last_message_at  timestamptz,
  unread_count     bigint
)
language sql
stable
set search_path = ''
as $$
  select
    c.id,
    p.id,
    p.full_name,
    p.avatar_url,
    p.role,
    lm.body,
    lm.sender_id,
    c.last_message_at,
    (select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.read_at is null
        and m.sender_id <> (select auth.uid()))
  from public.conversations c
  join public.profiles p
    on p.id = case when c.student_id = (select auth.uid()) then c.teacher_id else c.student_id end
  left join lateral (
    select m.body, m.sender_id
      from public.messages m
     where m.conversation_id = c.id
     order by m.created_at desc, m.id desc
     limit 1
  ) lm on true
  where (select auth.uid()) in (c.student_id, c.teacher_id)
    -- מורה לא רואה שיחה שתלמיד פתח ועוד לא כתב בה
    and (lm.body is not null or c.student_id = (select auth.uid()))
  order by c.last_message_at desc;
$$;

create or replace function public.unread_messages_count()
returns bigint
language sql
stable
set search_path = ''
as $$
  select count(*)
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where (select auth.uid()) in (c.student_id, c.teacher_id)
     and m.sender_id <> (select auth.uid())
     and m.read_at is null;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql
set search_path = ''
as $$
  update public.messages
     set read_at = now()
   where conversation_id = p_conversation
     and sender_id <> (select auth.uid())
     and read_at is null;
$$;

revoke execute on function public.my_conversations()               from public, anon;
revoke execute on function public.unread_messages_count()          from public, anon;
revoke execute on function public.mark_conversation_read(uuid)     from public, anon;
grant  execute on function public.my_conversations()               to authenticated;
grant  execute on function public.unread_messages_count()          to authenticated;
grant  execute on function public.mark_conversation_read(uuid)     to authenticated;


-- ---------- Realtime: הודעות חדשות מגיעות מיד ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;


-- =====================================================================
-- 3. נתוני דמה (רק אם משתמשי הדמה קיימים)
-- =====================================================================
update public.user_contacts set phone = '0501234567', show_phone = true
 where user_id = '11111111-1111-1111-1111-111111111111';   -- דנה: טלפון גלוי
update public.user_contacts set phone = '0527654321', show_phone = true
 where user_id = '22222222-2222-2222-2222-222222222222';   -- יוסי: טלפון גלוי
update public.user_contacts set phone = '0549876543', show_phone = false
 where user_id = '33333333-3333-3333-3333-333333333333';   -- מיכל: רק צ'אט
update public.user_contacts set phone = '0501112233'
 where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';   -- איתי (תלמיד)

-- שיחה לדוגמה: איתי ↔ דנה
insert into public.conversations (id, student_id, teacher_id, created_at, last_message_at)
select 'dddddddd-0000-0000-0000-000000000001',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       '11111111-1111-1111-1111-111111111111',
       now() - interval '2 days', now() - interval '2 days'
 where exists (select 1 from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
   and exists (select 1 from public.teachers where id = '11111111-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.messages (conversation_id, sender_id, body, created_at, read_at)
select v.conv::uuid, v.sender::uuid, v.body, now() - v.ago, v.read_at
  from (values
    ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'היי דנה, אני בכיתה י"א ומתכונן לבגרות 5 יח"ל במתמטיקה. יש לך זמן פנוי בימי שלישי?',
     interval '2 days', now() - interval '1 day'),
    ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     'היי איתי! כן, יש לי שלישי ב-17:00 או ב-18:30. מה מתאים לך?',
     interval '1 day', null)
  ) as v(conv, sender, body, ago, read_at)
 where exists (select 1 from public.conversations where id = 'dddddddd-0000-0000-0000-000000000001');
