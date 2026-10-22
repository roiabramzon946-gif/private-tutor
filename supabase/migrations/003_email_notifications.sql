-- =====================================================================
-- Migration 003 — התראות במייל על הודעות צ'אט שלא נקראו
--
-- איך זה עובד:
--   כל דקה (pg_cron) הפונקציה send_unread_email_notifications בודקת אם יש
--   הודעות שלא נקראו כבר 5 דקות. אם כן — שולחת מייל לנמען דרך Resend (pg_net).
--   לכל היותר מייל אחד לשיחה בשעה, ולא שולחים שוב על אותן הודעות.
--   המייל לא כולל את תוכן ההודעה — רק מי שלח וקישור לשיחה.
--
-- אחרי ההרצה צריך להוסיף את מפתח ה-API של Resend (ראו בסוף הקובץ).
-- =====================================================================


-- ---------- 1. הרחבות ----------
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;


-- ---------- 2. הגדרות האפליקציה (לא נגישות מה-API) ----------
create table if not exists public.app_settings (
  key    text primary key,
  value  text not null
);
alter table public.app_settings enable row level security;   -- בלי policies = אין גישה מהלקוח
revoke all on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value) values
  ('site_url',   'http://localhost:3000'),
  ('email_from', 'מורים פרטיים <onboarding@resend.dev>')
on conflict (key) do nothing;


-- ---------- 3. העדפת משתמש + מעקב שליחה ----------
alter table public.user_contacts
  add column if not exists email_notifications boolean not null default true;

grant update (email_notifications) on public.user_contacts to authenticated;

alter table public.conversations
  add column if not exists student_notified_at timestamptz,
  add column if not exists teacher_notified_at timestamptz;


-- ---------- 4. פונקציית השליחה ----------
create or replace function public.send_unread_email_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key   text;
  v_site  text;
  v_from  text;
  v_sent  integer := 0;
  r       record;
  v_name  text;
  v_html  text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets
   where name = 'resend_api_key'
   limit 1;
  if v_key is null then
    return 0;   -- עוד לא הוגדר מפתח — לא עושים כלום
  end if;

  select value into v_site from public.app_settings where key = 'site_url';
  select value into v_from from public.app_settings where key = 'email_from';

  for r in
    with pending as (
      select m.conversation_id,
             m.sender_id,
             case when m.sender_id = c.student_id then c.teacher_id else c.student_id end as recipient_id,
             min(m.created_at) as first_unread_at,
             count(*)          as unread
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
       where m.read_at is null
         and m.created_at < now() - interval '5 minutes'
         and m.created_at > now() - interval '3 days'
       group by 1, 2, 3
    )
    , candidates as (
      select p.*,
             u.email,
             sp.full_name as sender_name,
             (p.recipient_id = c.student_id) as recipient_is_student,
             case when p.recipient_id = c.student_id
                  then c.student_notified_at else c.teacher_notified_at end as last_notified
        from pending p
        join public.conversations c on c.id = p.conversation_id
        join auth.users u           on u.id = p.recipient_id
        join public.profiles sp     on sp.id = p.sender_id
        left join public.user_contacts uc on uc.user_id = p.recipient_id
       where coalesce(uc.email_notifications, true)
         and u.email is not null
         and u.email not like '%@example.com'          -- משתמשי הדמה
    )
    select * from candidates
     -- לא שולחים שוב על אותן הודעות, ולא יותר ממייל בשעה לשיחה
     where last_notified is null
        or (last_notified < first_unread_at and last_notified < now() - interval '1 hour')
     order by first_unread_at
     limit 50
  loop
    v_name := replace(replace(replace(r.sender_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    v_html :=
      '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111827;max-width:480px">'
      || '<h2 style="color:#4338ca;margin:0 0 12px">יש לך הודעה חדשה</h2>'
      || '<p>' || v_name || ' שלח/ה לך '
      || case when r.unread > 1 then r.unread || ' הודעות' else 'הודעה' end
      || ' באתר מורים פרטיים.</p>'
      || '<p style="margin:24px 0"><a href="' || v_site || '/messages/' || r.conversation_id
      || '" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">'
      || 'לקריאה ולתשובה</a></p>'
      || '<p style="font-size:13px;color:#6b7280">לא רוצה לקבל התראות? אפשר לכבות אותן ב"האזור שלי" באתר.</p>'
      || '</div>';

    perform net.http_post(
      url     := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer ' || v_key,
                   'Content-Type',  'application/json'),
      body    := jsonb_build_object(
                   'from',    v_from,
                   'to',      jsonb_build_array(r.email),
                   'subject', 'הודעה חדשה מ' || r.sender_name || ' | מורים פרטיים',
                   'html',    v_html)
    );

    if r.recipient_is_student then
      update public.conversations set student_notified_at = now() where id = r.conversation_id;
    else
      update public.conversations set teacher_notified_at = now() where id = r.conversation_id;
    end if;

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke execute on function public.send_unread_email_notifications() from public, anon, authenticated;


-- ---------- 5. הרצה אוטומטית כל דקה ----------
select cron.schedule(
  'chat-email-notifications',
  '* * * * *',
  $$select public.send_unread_email_notifications()$$
);


-- =====================================================================
-- אחרי ההרצה — שלב נפרד, להריץ פעם אחת עם המפתח שלך מ-Resend:
--
--   select vault.create_secret('re_XXXXXXXXXXXX', 'resend_api_key');
--
-- בדיקות שימושיות:
--   select * from cron.job_run_details order by start_time desc limit 5;   -- האם ה-cron רץ
--   select id, status_code, content from net._http_response order by id desc limit 5;  -- תשובות Resend
-- =====================================================================
