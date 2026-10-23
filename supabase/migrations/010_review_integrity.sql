-- =====================================================================
-- Migration 010 — הגנה מפני ביקורות פיקטיביות
--
-- ביקורת חדשה מותרת רק לתלמיד ש:
--   1. אישר את כתובת המייל שלו
--   2. החשבון שלו קיים לפחות 7 ימים
--   3. התכתב עם המורה באתר: שני הצדדים כתבו, וההודעה הראשונה נשלחה לפני 48 שעות לפחות
-- בנוסף: מורה יכול לקבל עד 5 ביקורות חדשות ביממה,
-- ואפשר להסתיר ביקורת חשודה (is_hidden) — היא לא תוצג ולא תיספר בדירוג.
-- ביקורות קיימות לא נפגעות, וכותבן עדיין יכול לערוך אותן.
-- =====================================================================


-- ---------- 1. הסתרת ביקורות (ניהול) ----------
alter table public.reviews
  add column if not exists is_hidden boolean not null default false;

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read"
  on public.reviews for select
  using (not is_hidden or student_id = (select auth.uid()));

-- הדירוג נספר רק מביקורות גלויות
create or replace function public.refresh_teacher_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher uuid := coalesce(new.teacher_id, old.teacher_id);
begin
  update public.teachers t
     set rating_avg    = coalesce(r.avg_rating, 0),
         reviews_count = r.cnt
    from (
      select round(avg(rating), 2) as avg_rating, count(*)::int as cnt
        from public.reviews
       where teacher_id = v_teacher
         and not is_hidden
    ) r
   where t.id = v_teacher;
  return null;
end;
$$;


-- ---------- 2. בדיקת זכאות לכתוב ביקורת ----------
-- מחזירה null אם מותר, אחרת קוד סיבה (לתצוגה בממשק)
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

  if not coalesce(v_both, false) then
    return 'no_conversation';
  end if;
  if v_first_msg > now() - interval '48 hours' then
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


-- ---------- 3. האכיפה עצמה: מדיניות ההוספה ----------
drop policy if exists "reviews: students insert own" on public.reviews;
create policy "reviews: students insert own"
  on public.reviews for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and public.review_eligibility(teacher_id) is null
  );

-- is_hidden לא ניתן לשינוי מהאתר (רק מה-SQL Editor)
revoke insert on public.reviews from authenticated;
grant insert (teacher_id, student_id, rating, comment) on public.reviews to authenticated;


-- =====================================================================
-- להסתרת ביקורת חשודה (מה-SQL Editor):
--   update public.reviews set is_hidden = true where id = '<review id>';
-- לרשימת הביקורות האחרונות:
--   select r.id, r.created_at, t.full_name as teacher, s.full_name as student, r.rating, r.comment
--     from public.reviews r
--     join public.profiles t on t.id = r.teacher_id
--     join public.profiles s on s.id = r.student_id
--    order by r.created_at desc limit 50;
-- =====================================================================
