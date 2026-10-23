-- =====================================================================
-- Migration 014 — התראות צ'אט במייל דרך Resend עם הדומיין tutoril.co
-- להריץ אחרי 007 (שמגדיר את פונקציית השליחה עם תמיכה ב-Resend וב-Gmail),
-- ורק אחרי שהדומיין מאומת ב-Resend.
-- =====================================================================

insert into public.app_settings (key, value) values
  ('email_provider', 'resend'),
  ('email_from',     'TutorIL <noreply@tutoril.co>'),
  ('site_url',       'https://tutoril.co')
on conflict (key) do update set value = excluded.value;

-- בדיקה
select key, value from public.app_settings order by key;

-- =====================================================================
-- שלב נפרד — עדכון מפתח ה-API של Resend (המפתח החדש, לא זה שנחשף):
--
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'resend_api_key'),
--     're_המפתח_החדש'
--   );
--
-- בדיקה שההתראות יוצאות (אחרי שמישהו קיבל הודעה ולא קרא אותה 5 דקות):
--   select id, status_code, content from net._http_response order by id desc limit 5;
-- =====================================================================
