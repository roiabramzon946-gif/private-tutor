-- =====================================================================
-- Migration 019 — הידוק פרטיות
--
-- 1. פרופילים: פרופיל של מורה ציבורי (זה כל הרעיון). פרופיל של תלמיד
--    (שם מלא, תמונה) גלוי רק לו עצמו ולמי שמתכתב איתו — לא לכל העולם.
-- 2. ביקורות: שם הכותב מוצג כשם פרטי + אות ראשונה של שם המשפחה.
-- 3. טלפון מורה: גם אם המורה בחר/ה לשתף — הוא נחשף לתלמיד רק אחרי
--    שהמורה ענה לו בצ'אט (כלומר שני הצדדים מעוניינים).
-- =====================================================================


-- ---------- 1. פרופילים ----------
drop policy if exists "profiles: public read" on public.profiles;
drop policy if exists "profiles: read teachers, self and chat partners" on public.profiles;
create policy "profiles: read teachers, self and chat partners"
  on public.profiles for select
  using (
    role = 'teacher'
    or id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
       where (c.student_id = profiles.id and c.teacher_id = (select auth.uid()))
          or (c.teacher_id = profiles.id and c.student_id = (select auth.uid()))
    )
  );


-- ---------- 2. ביקורות עם שם מקוצר ----------
create or replace function public.teacher_reviews(p_teacher uuid)
returns table (
  id             uuid,
  rating         smallint,
  comment        text,
  created_at     timestamptz,
  reviewer_name  text,
  is_mine        boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.created_at,
         -- "שירה גולן" → "שירה ג."
         case
           when position(' ' in btrim(p.full_name)) > 0
             then split_part(btrim(p.full_name), ' ', 1) || ' '
                  || left(split_part(btrim(p.full_name), ' ', 2), 1) || '.'
           else coalesce(nullif(btrim(p.full_name), ''), 'תלמיד/ה')
         end,
         r.student_id = (select auth.uid())
    from public.reviews r
    join public.profiles p on p.id = r.student_id
   where r.teacher_id = p_teacher
     and (not r.is_hidden or r.student_id = (select auth.uid()))
   order by r.created_at desc;
$$;

revoke execute on function public.teacher_reviews(uuid) from public;
grant  execute on function public.teacher_reviews(uuid) to anon, authenticated;


-- ---------- 3. טלפון מורה רק אחרי שהמורה ענה בצ'אט ----------
drop policy if exists "contacts: visible teacher phone" on public.user_contacts;
create policy "contacts: visible teacher phone"
  on public.user_contacts for select to authenticated
  using (
    show_phone
    and phone is not null
    and exists (select 1 from public.teachers t where t.id = user_id and t.is_active)
    and exists (
      select 1
        from public.conversations c
        join public.messages m on m.conversation_id = c.id
       where m.sender_id = user_contacts.user_id
         and (
           (c.teacher_id = user_contacts.user_id and c.student_id = (select auth.uid()))
           or (c.student_id = user_contacts.user_id and c.teacher_id = (select auth.uid()))
         )
    )
  );
