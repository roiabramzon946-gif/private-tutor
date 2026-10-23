-- 023: ניקוי אוטומטי של הרשמות שלא אומתו תוך 7 ימים
-- רץ פעם ביום ב-03:17 (UTC). מוחק רק חשבונות שהמייל שלהם לא אומת אף פעם.
-- כל מה שקשור לחשבון (פרופיל, רשומת מורה וכו') נמחק איתו.
-- אפשר להריץ שוב בלי נזק.

create or replace function public.delete_unconfirmed_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from auth.users
   where email_confirmed_at is null
     and created_at < now() - interval '7 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.delete_unconfirmed_users() from public, anon, authenticated;

-- מחליפים משימה קודמת באותו שם, אם יש
select cron.unschedule(jobid) from cron.job where jobname = 'delete-unconfirmed-users';
select cron.schedule(
  'delete-unconfirmed-users',
  '17 3 * * *',
  $$select public.delete_unconfirmed_users()$$
);
