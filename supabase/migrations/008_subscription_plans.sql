-- =====================================================================
-- Migration 008 — מודל המנויים: חינמי ופרימיום בלבד
--
--  - פרימיום: 100 ש"ח לחודש, מתחדש כל חודש.
--  - ביטול בכל עת: המנוי נשאר בתוקף עד סוף החודש ששולם, לא מתחדש,
--    ואז המורה חוזר אוטומטית למנוי חינמי (החיפוש כבר בודק current_period_end).
--  - דרגת Pro מבוטלת; מנויי Pro קיימים (נתוני דמה) מומרים לפרימיום.
-- אפשר להריץ יותר מפעם אחת.
-- =====================================================================

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz;

-- Pro → פרימיום
update public.subscriptions set tier = 'premium' where tier = 'pro';
update public.teachers     set subscription_tier = 'premium' where subscription_tier = 'pro';

-- מעכשיו מנוי בתשלום הוא פרימיום בלבד
alter table public.subscriptions drop constraint if exists subscriptions_tier_check;
alter table public.subscriptions drop constraint if exists subscriptions_tier_premium_only;
alter table public.subscriptions add constraint subscriptions_tier_premium_only check (tier = 'premium');

-- המורה רואה את מצב הביטול של המנוי שלו (קריאה כבר מותרת ב-RLS)

-- ביטול / חידוש של המנוי הפעיל של המורה המחובר
create or replace function public.set_my_subscription_cancel(p_cancel boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscriptions s
     set cancel_at_period_end = p_cancel,
         canceled_at          = case when p_cancel then now() else null end
   where s.teacher_id = (select auth.uid())
     and s.status in ('active', 'trialing')
     and s.current_period_end > now();

  if not found then
    raise exception 'no active subscription' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_my_subscription_cancel(boolean) from public, anon;
grant  execute on function public.set_my_subscription_cancel(boolean) to authenticated;
