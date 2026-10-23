-- =====================================================================
-- Migration 009 — בקשות לימוד + צ'אט בין מורים
--
-- 1. מורים יכולים לפתוח שיחה עם מורים אחרים.
-- 2. "בקשות לימוד": תלמיד מפרסם בקשה (בלי פרטי קשר), מורים שמלמדים
--    את המקצוע שולחים הצעה, וההצעה פותחת שיחה בצ'אט.
--    הגבלות: עד 3 בקשות פתוחות לתלמיד, עד 10 הצעות לבקשה,
--    הצעה אחת לכל מורה, בקשה פתוחה 30 יום.
--
-- הערה על שמות העמודות ב-conversations:
--   student_id = המשתתף שפתח את השיחה (או התלמיד בשיחה מבקשת לימוד),
--   teacher_id = המורה שאליו פנו. בשיחה בין מורים שני הצדדים מורים.
--   initiated_by = מי פתח את השיחה בפועל.
-- אפשר להריץ יותר מפעם אחת.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. שיחות: מי פתח, ומאיזו בקשה
-- ---------------------------------------------------------------------
alter table public.conversations
  add column if not exists initiated_by uuid references public.profiles(id) on delete set null,
  add column if not exists request_id uuid;

update public.conversations set initiated_by = student_id where initiated_by is null;
alter table public.conversations alter column initiated_by set default auth.uid();

-- מורה פותח שיחה עם מורה אחר
drop policy if exists "conversations: teacher contacts teacher" on public.conversations;
create policy "conversations: teacher contacts teacher"
  on public.conversations for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role = 'teacher')
    and exists (select 1 from public.teachers t
                 where t.id = teacher_id and t.is_active)
  );

-- הרשימה שלי: הצד שלא פתח את השיחה רואה אותה רק אחרי ההודעה הראשונה
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
    c.id, p.id, p.full_name, p.avatar_url, p.role,
    lm.body, lm.sender_id, c.last_message_at,
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
    and (lm.body is not null or coalesce(c.initiated_by, c.student_id) = (select auth.uid()))
  order by c.last_message_at desc;
$$;


-- ---------------------------------------------------------------------
-- 2. בקשות לימוד
-- ---------------------------------------------------------------------
create table if not exists public.lesson_requests (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  subject_id    smallint not null references public.subjects(id),
  level         text check (char_length(level) <= 100),
  city          text references public.localities(name) on update cascade,
  in_person_ok  boolean not null default true,
  online_ok     boolean not null default true,
  budget_max    numeric(8,2) check (budget_max is null or (budget_max > 0 and budget_max < 10000)),
  description   text not null check (char_length(btrim(description)) between 10 and 1000),
  status        text not null default 'open' check (status in ('open', 'closed')),
  offers_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  check (in_person_ok or online_ok),
  check (not in_person_ok or city is not null)
);

create index if not exists lesson_requests_open_idx
  on public.lesson_requests (subject_id, created_at desc) where status = 'open';
create index if not exists lesson_requests_student_idx
  on public.lesson_requests (student_id, created_at desc);

create table if not exists public.request_offers (
  request_id       uuid not null references public.lesson_requests(id) on delete cascade,
  teacher_id       uuid not null references public.teachers(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  created_at       timestamptz not null default now(),
  primary key (request_id, teacher_id)
);

alter table public.conversations drop constraint if exists conversations_request_fk;
alter table public.conversations
  add constraint conversations_request_fk foreign key (request_id)
  references public.lesson_requests(id) on delete set null;

-- עד 3 בקשות פתוחות לתלמיד; שדות המערכת נקבעים כאן ולא בלקוח
create or replace function public.lesson_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.lesson_requests
       where student_id = new.student_id
         and status = 'open'
         and created_at > now() - interval '30 days') >= 3 then
    raise exception 'too many open requests' using errcode = 'P0001';
  end if;
  new.status       := 'open';
  new.offers_count := 0;
  new.created_at   := now();
  new.closed_at    := null;
  return new;
end;
$$;

drop trigger if exists lesson_requests_before_insert on public.lesson_requests;
create trigger lesson_requests_before_insert
  before insert on public.lesson_requests
  for each row execute function public.lesson_requests_before_insert();

create or replace function public.lesson_requests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'closed' and new.status = 'open' then
    raise exception 'closed requests cannot be reopened' using errcode = 'P0001';
  end if;
  if new.status = 'closed' and old.status <> 'closed' then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_requests_before_update on public.lesson_requests;
create trigger lesson_requests_before_update
  before update on public.lesson_requests
  for each row execute function public.lesson_requests_before_update();

-- RLS: תלמיד רואה ומנהל רק את הבקשות שלו. מורים רואים בקשות רק דרך list_open_requests.
alter table public.lesson_requests enable row level security;
alter table public.request_offers  enable row level security;

drop policy if exists "requests: owner read"   on public.lesson_requests;
drop policy if exists "requests: student insert" on public.lesson_requests;
drop policy if exists "requests: owner update" on public.lesson_requests;

create policy "requests: owner read"
  on public.lesson_requests for select to authenticated
  using (student_id = (select auth.uid()));

create policy "requests: student insert"
  on public.lesson_requests for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role = 'student')
  );

create policy "requests: owner update"
  on public.lesson_requests for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

revoke all on public.lesson_requests from anon;
revoke insert, update, delete on public.lesson_requests from authenticated;
grant insert (student_id, subject_id, level, city, in_person_ok, online_ok, budget_max, description)
  on public.lesson_requests to authenticated;
grant update (status) on public.lesson_requests to authenticated;

drop policy if exists "offers: teacher or request owner read" on public.request_offers;
create policy "offers: teacher or request owner read"
  on public.request_offers for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or exists (select 1 from public.lesson_requests r
                where r.id = request_id and r.student_id = (select auth.uid()))
  );

revoke all on public.request_offers from anon;
revoke insert, update, delete on public.request_offers from authenticated;


-- ---------------------------------------------------------------------
-- 3. לוח הבקשות למורים (בלי שם מלא ובלי פרטי קשר של התלמיד)
-- ---------------------------------------------------------------------
create or replace function public.list_open_requests(
  p_subject_slug      text    default null,
  p_only_my_subjects  boolean default true,
  p_region            text    default null,
  p_limit             int     default 30,
  p_offset            int     default 0
)
returns table (
  id               uuid,
  subject_name     text,
  subject_slug     text,
  level            text,
  city             text,
  region           text,
  in_person_ok     boolean,
  online_ok        boolean,
  budget_max       numeric,
  description      text,
  created_at       timestamptz,
  offers_count     integer,
  student_first    text,
  already_offered  boolean,
  total_count      bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, s.name, s.slug, r.level, r.city, l.region, r.in_person_ok, r.online_ok,
    r.budget_max, r.description, r.created_at, r.offers_count,
    split_part(btrim(p.full_name), ' ', 1),
    exists (select 1 from public.request_offers o
             where o.request_id = r.id and o.teacher_id = (select auth.uid())),
    count(*) over ()
  from public.lesson_requests r
  join public.subjects s on s.id = r.subject_id
  join public.profiles p on p.id = r.student_id
  left join public.localities l on l.name = r.city
  where exists (select 1 from public.profiles me
                 where me.id = (select auth.uid()) and me.role = 'teacher')
    and r.status = 'open'
    and r.created_at > now() - interval '30 days'
    and r.offers_count < 10
    and r.student_id <> (select auth.uid())
    and (p_subject_slug is null or s.slug = p_subject_slug)
    and (not p_only_my_subjects or exists (
          select 1 from public.teacher_subjects ts
           where ts.teacher_id = (select auth.uid()) and ts.subject_id = r.subject_id))
    and (p_region is null or r.online_ok or l.region = p_region)
  order by r.created_at desc
  limit  least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.list_open_requests(text, boolean, text, int, int) from public, anon;
grant  execute on function public.list_open_requests(text, boolean, text, int, int) to authenticated;


-- ---------------------------------------------------------------------
-- 4. שליחת הצעה על בקשה: פותח (או ממשיך) שיחה ושולח את ההודעה הראשונה
-- ---------------------------------------------------------------------
create or replace function public.send_request_offer(p_request uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_body  text := btrim(coalesce(p_body, ''));
  r       public.lesson_requests%rowtype;
  v_conv  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.teachers t
      join public.profiles p on p.id = t.id
     where t.id = v_uid and p.role = 'teacher' and t.is_active and t.hourly_rate is not null
  ) then
    raise exception 'teacher profile incomplete' using errcode = 'P0001';
  end if;

  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid message' using errcode = 'P0001';
  end if;

  select * into r from public.lesson_requests where id = p_request for update;
  if not found or r.status <> 'open' or r.created_at < now() - interval '30 days' then
    raise exception 'request closed' using errcode = 'P0001';
  end if;
  if r.offers_count >= 10 then
    raise exception 'request full' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.request_offers where request_id = p_request and teacher_id = v_uid) then
    raise exception 'already offered' using errcode = 'P0001';
  end if;

  select id into v_conv from public.conversations
   where student_id = r.student_id and teacher_id = v_uid;

  if v_conv is null then
    insert into public.conversations (student_id, teacher_id, initiated_by, request_id)
    values (r.student_id, v_uid, v_uid, p_request)
    returning id into v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (v_conv, v_uid, v_body);
  insert into public.request_offers (request_id, teacher_id, conversation_id) values (p_request, v_uid, v_conv);
  update public.lesson_requests set offers_count = offers_count + 1 where id = p_request;

  return v_conv;
end;
$$;

revoke execute on function public.send_request_offer(uuid, text) from public, anon;
grant  execute on function public.send_request_offer(uuid, text) to authenticated;
