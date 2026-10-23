-- =====================================================================
-- Migration 007 — שליחת התראות מייל דרך Gmail
--
-- Supabase לא יכול לשלוח SMTP ישירות, ולכן הפונקציה שולחת בקשת HTTP
-- לאתר (‎/api/send-email ב-Vercel), והאתר שולח את המייל דרך Gmail.
-- הבקשה מאובטחת בסוד משותף (notify_secret ב-Vault ו-NOTIFY_SECRET ב-Vercel).
--
-- email_provider ב-app_settings קובע את הספק: 'gmail' (ברירת מחדל מעכשיו)
-- או 'resend' (כשיהיה דומיין מאומת).
-- =====================================================================

insert into public.app_settings (key, value) values ('email_provider', 'gmail')
on conflict (key) do update set value = excluded.value;

-- כתובת האתר החי (לקישורים במייל, ו-Supabase שולח אליה את הבקשה)
insert into public.app_settings (key, value) values ('site_url', 'https://private-tutor-delta.vercel.app')
on conflict (key) do update set value = excluded.value;

create or replace function public.send_unread_email_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider  text;
  v_key       text;
  v_secret    text;
  v_site      text;
  v_from      text;
  v_sent      integer := 0;
  r           record;
  v_name      text;
  v_subject   text;
  v_html      text;
begin
  select value into v_provider from public.app_settings where key = 'email_provider';
  select value into v_site     from public.app_settings where key = 'site_url';
  select value into v_from     from public.app_settings where key = 'email_from';

  if coalesce(v_provider, 'gmail') = 'gmail' then
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_secret' limit 1;
    -- Supabase לא יכול להגיע ל-localhost, צריך את כתובת האתר החי
    if v_secret is null or v_site is null or v_site like 'http://localhost%' then
      return 0;
    end if;
  else
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
    if v_key is null then
      return 0;
    end if;
  end if;

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
    ), candidates as (
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
         and u.email not like '%@example.com'
    )
    select * from candidates
     where last_notified is null
        or (last_notified < first_unread_at and last_notified < now() - interval '1 hour')
     order by first_unread_at
     limit 50
  loop
    v_name := replace(replace(replace(r.sender_name, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    v_subject := 'הודעה חדשה מ' || r.sender_name || ' | מורים פרטיים';
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

    if coalesce(v_provider, 'gmail') = 'gmail' then
      perform net.http_post(
        url     := v_site || '/api/send-email',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
        body    := jsonb_build_object('to', r.email, 'subject', v_subject, 'html', v_html),
        timeout_milliseconds := 15000
      );
    else
      perform net.http_post(
        url     := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
        body    := jsonb_build_object('from', v_from, 'to', jsonb_build_array(r.email),
                                      'subject', v_subject, 'html', v_html)
      );
    end if;

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
