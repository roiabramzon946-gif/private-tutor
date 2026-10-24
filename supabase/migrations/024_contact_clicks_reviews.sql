-- 024: לחיצה על וואטסאפ / טלפון בפרופיל מורה נחשבת כקשר לצורך ביקורת
-- תלמיד מחובר שלחץ על הוואטסאפ או הטלפון של מורה יכול לכתוב עליו ביקורת
-- 48 שעות אחרי הלחיצה הראשונה (כמו מי שהתכתב איתו בצ'אט).
-- שאר ההגנות נשארות: מייל מאומת, חשבון בן שבוע, ביקורת אחת, עד 5 ביום למורה.
-- אפשר להריץ שוב בלי נזק.

create table if not exists public.contact_clicks (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  kind        text not null check (kind in ('whatsapp', 'phone')),
  created_at  timestamptz not null default now(),
  primary key (student_id, teacher_id)   -- נשמרת רק הלחיצה הראשונה
);

alter table public.contact_clicks enable row level security;
revoke all on public.contact_clicks from anon, authenticated;

-- רישום לחיצה (רק דרך הפונקציה הזו)
create or replace function public.log_contact_click(p_teacher uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or v_uid = p_teacher or p_kind not in ('whatsapp', 'phone') then
    return;
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then
    return;
  end if;
  if not exists (select 1 from public.teachers where id = p_teacher) then
    return;
  end if;
  insert into public.contact_clicks (student_id, teacher_id, kind)
  values (v_uid, p_teacher, p_kind)
  on conflict do nothing;
end;
$$;
revoke execute on function public.log_contact_click(uuid, text) from public, anon;
grant  execute on function public.log_contact_click(uuid, text) to authenticated;

-- זכאות לביקורת: שיחה דו-צדדית באתר או לחיצה על וואטסאפ/טלפון, לפני 48 שעות לפחות
create or replace function public.review_eligibility(p_teacher uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_role       public.user_role;
  v_confirmed  timestamptz;
  v_created    timestamptz;
  v_first_msg  timestamptz;
  v_both       boolean;
  v_click      timestamptz;
  v_contact    timestamptz;
begin
  if v_uid is null then
    return 'not_logged_in';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'student' then
    return 'not_student';
  end if;

  if v_uid = p_teacher then
    return 'self';
  end if;

  select email_confirmed_at, created_at into v_confirmed, v_created
    from auth.users where id = v_uid;
  if v_confirmed is null then
    return 'email_unconfirmed';
  end if;
  if v_created > now() - interval '7 days' then
    return 'account_too_new';
  end if;

  select min(m.created_at),
         bool_or(m.sender_id = v_uid) and bool_or(m.sender_id = p_teacher)
    into v_first_msg, v_both
    from public.conversations c
    join public.messages m on m.conversation_id = c.id
   where c.student_id = v_uid
     and c.teacher_id = p_teacher;

  select created_at into v_click
    from public.contact_clicks
   where student_id = v_uid and teacher_id = p_teacher;

  -- המועד המוקדם ביותר של קשר תקף
  v_contact := least(
    case when coalesce(v_both, false) then v_first_msg end,
    v_click
  );

  if v_contact is null then
    return 'no_conversation';
  end if;
  if v_contact > now() - interval '48 hours' then
    return 'conversation_too_new';
  end if;

  if (select count(*) from public.reviews r
       where r.teacher_id = p_teacher
         and r.created_at > now() - interval '24 hours') >= 5 then
    return 'teacher_daily_limit';
  end if;

  return null;
end;
$$;

revoke execute on function public.review_eligibility(uuid) from public, anon;
grant  execute on function public.review_eligibility(uuid) to authenticated;
