-- =====================================================================
-- Migration 020 — תיקון דחוף ל-019
-- מדיניות הקריאה של profiles בדקה את טבלת conversations ישירות, ולמבקרים
-- לא מחוברים (anon) אין הרשאה לטבלה הזו — ולכן כל קריאה של פרופיל נכשלה
-- ("permission denied for table conversations"), גם של מורים.
-- הפתרון: הבדיקה עוברת לפונקציה security definer.
-- =====================================================================

create or replace function public.shares_conversation_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from public.conversations c
        where (c.student_id = p_user and c.teacher_id = (select auth.uid()))
           or (c.teacher_id = p_user and c.student_id = (select auth.uid()))
     );
$$;

revoke execute on function public.shares_conversation_with(uuid) from public;
grant  execute on function public.shares_conversation_with(uuid) to anon, authenticated;

drop policy if exists "profiles: read teachers, self and chat partners" on public.profiles;
create policy "profiles: read teachers, self and chat partners"
  on public.profiles for select
  using (
    role = 'teacher'
    or id = (select auth.uid())
    or public.shares_conversation_with(id)
  );
