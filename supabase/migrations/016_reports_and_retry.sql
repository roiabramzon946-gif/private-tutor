-- =====================================================================
-- Migration 016 — דיווחים על משתמשים + שליחה חוזרת של התראות שנכשלו
-- להריץ אחרי 015.
-- =====================================================================


-- ---------- 1. דיווחים ----------
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reported_user_id  uuid not null references public.profiles(id) on delete cascade,
  conversation_id   uuid references public.conversations(id) on delete set null,
  reason            text not null check (reason in ('harassment','spam','fake_profile','inappropriate','other')),
  details           text check (char_length(details) <= 1000),
  status            text not null default 'open' check (status in ('open','handled')),
  created_at        timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports: insert own" on public.reports;
create policy "reports: insert own"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (conversation_id is null or public.is_conversation_participant(conversation_id))
  );

drop policy if exists "reports: reporter reads own" on public.reports;
create policy "reports: reporter reads own"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reported_user_id, conversation_id, reason, details) on public.reports to authenticated;

-- עד 10 דיווחים ביום למשתמש
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.reports
       where reporter_id = new.reporter_id
         and created_at > now() - interval '1 day') >= 10 then
    raise exception 'יותר מדי דיווחים היום. נסו שוב מחר.';
  end if;
  new.status := 'open';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- מייל למנהל האתר על כל דיווח חדש
insert into public.app_settings (key, value) values ('admin_email', 'tutor.il.notifications@gmail.com')
on conflict (key) do nothing;

create or replace function public.reports_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key    text;
  v_from   text;
  v_admin  text;
  v_site   text;
  v_rep    text;
  v_target text;
  v_role   public.user_role;
  v_reason text;
  v_html   text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  select value into v_from  from public.app_settings where key = 'email_from';
  select value into v_admin from public.app_settings where key = 'admin_email';
  select value into v_site  from public.app_settings where key = 'site_url';
  if v_key is null or v_admin is null then
    return null;
  end if;

  select full_name into v_rep from public.profiles where id = new.reporter_id;
  select full_name, role into v_target, v_role from public.profiles where id = new.reported_user_id;
  v_reason := case new.reason
                when 'harassment'    then 'הטרדה או איומים'
                when 'spam'          then 'ספאם או פרסומת'
                when 'fake_profile'  then 'פרופיל מזויף'
                when 'inappropriate' then 'תוכן פוגעני'
                else 'אחר'
              end;

  v_html :=
    '<table role="presentation" width="100%" dir="rtl"><tr><td align="right" dir="rtl" '
    || 'style="direction:rtl;text-align:right;font-family:Arial,sans-serif;font-size:15px;color:#111827">'
    || '<h2 style="color:#b91c1c">דיווח חדש באתר</h2>'
    || '<p><b>סיבה:</b> ' || v_reason || '</p>'
    || '<p><b>מדווח/ת:</b> ' || replace(replace(coalesce(v_rep, ''), '<', '&lt;'), '>', '&gt;')
    || ' <span style="color:#6b7280">(' || new.reporter_id || ')</span></p>'
    || '<p><b>על:</b> ' || replace(replace(coalesce(v_target, ''), '<', '&lt;'), '>', '&gt;')
    || ' <span style="color:#6b7280">(' || new.reported_user_id || ')</span>'
    || case when v_role = 'teacher'
            then ' · <a href="' || v_site || '/teachers/' || new.reported_user_id || '">לפרופיל</a>'
            else '' end
    || '</p>'
    || case when new.conversation_id is not null
            then '<p><b>שיחה:</b> ' || new.conversation_id || '</p>' else '' end
    || '<p><b>פרטים:</b><br>'
    || replace(replace(replace(coalesce(new.details, '—'), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
    || '</p>'
    || '<p style="font-size:13px;color:#6b7280">מזהה דיווח: ' || new.id || '</p>'
    || '</td></tr></table>';

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object('from', v_from, 'to', jsonb_build_array(v_admin),
                                  'subject', 'דיווח חדש: ' || v_reason || ' | TutorIL', 'html', v_html)
  );
  return null;
end;
$$;

drop trigger if exists reports_notify_admin on public.reports;
create trigger reports_notify_admin
  after insert on public.reports
  for each row execute function public.reports_notify_admin();

revoke execute on function public.reports_before_insert() from public, anon, authenticated;
revoke execute on function public.reports_notify_admin() from public, anon, authenticated;


-- ---------- 2. התראות צ'אט: שליחה חוזרת אם נכשלה ----------
create table if not exists public.email_notification_log (
  id                    bigint generated always as identity primary key,
  request_id            bigint not null,
  conversation_id       uuid not null references public.conversations(id) on delete cascade,
  recipient_is_student  boolean not null,
  checked               boolean not null default false,
  created_at            timestamptz not null default now()
);
alter table public.email_notification_log enable row level security;   -- בלי policies = אין גישה מהאתר
revoke all on public.email_notification_log from anon, authenticated;

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
  v_req       bigint;
  f           record;
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

  -- התראות שנכשלו בשליחה: מסירים את הסימון "נשלח" כדי לנסות שוב
  -- (עד 3 ניסיונות בשעה לכל שיחה וצד)
  for f in
    select l.id, l.conversation_id, l.recipient_is_student,
           coalesce(resp.status_code between 200 and 299, false) as ok
      from public.email_notification_log l
      join net._http_response resp on resp.id = l.request_id
     where not l.checked
  loop
    update public.email_notification_log set checked = true where id = f.id;
    if not f.ok and (select count(*) from public.email_notification_log x
                      where x.conversation_id = f.conversation_id
                        and x.recipient_is_student = f.recipient_is_student
                        and x.created_at > now() - interval '1 hour') < 3 then
      if f.recipient_is_student then
        update public.conversations set student_notified_at = null where id = f.conversation_id;
      else
        update public.conversations set teacher_notified_at = null where id = f.conversation_id;
      end if;
    end if;
  end loop;

  delete from public.email_notification_log where created_at < now() - interval '7 days';

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
    v_subject := 'הודעה חדשה מ' || r.sender_name || ' | TutorIL';
    v_html :=
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr><td align="center">'
      || '<table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:480px;width:100%"><tr>'
      || '<td dir="rtl" align="right" style="direction:rtl;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111827">'
      || '<h2 style="color:#4338ca;margin:0 0 12px">יש לך הודעה חדשה</h2>'
      || '<p>' || v_name || ' שלח/ה לך '
      || case when r.unread > 1 then r.unread || ' הודעות' else 'הודעה' end
      || ' באתר TutorIL.</p>'
      || '<p style="margin:24px 0"><a href="' || v_site || '/messages/' || r.conversation_id
      || '" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">'
      || 'לקריאה ולתשובה</a></p>'
      || '<p style="font-size:13px;color:#6b7280">לא רוצה לקבל התראות? אפשר לכבות אותן ב"האזור שלי" באתר.</p>'
      || '</td></tr></table></td></tr></table>';

    if coalesce(v_provider, 'gmail') = 'gmail' then
      v_req := net.http_post(
        url     := v_site || '/api/send-email',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
        body    := jsonb_build_object('to', r.email, 'subject', v_subject, 'html', v_html),
        timeout_milliseconds := 15000
      );
    else
      v_req := net.http_post(
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

    insert into public.email_notification_log (request_id, conversation_id, recipient_is_student)
    values (v_req, r.conversation_id, r.recipient_is_student);

    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke execute on function public.send_unread_email_notifications() from public, anon, authenticated;


-- =====================================================================
-- שימושי (מה-SQL Editor):
--   דיווחים פתוחים:
--     select r.created_at, r.reason, rp.full_name as reporter, tg.full_name as reported, r.details, r.id
--       from public.reports r
--       join public.profiles rp on rp.id = r.reporter_id
--       join public.profiles tg on tg.id = r.reported_user_id
--      where r.status = 'open' order by r.created_at desc;
--   סימון כמטופל:
--     update public.reports set status = 'handled' where id = '<report id>';
-- =====================================================================
