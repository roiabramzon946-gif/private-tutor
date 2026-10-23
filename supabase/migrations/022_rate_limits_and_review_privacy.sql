-- 022: הגבלת קצב לצ'אט + הסתרת מזהה כותב הביקורת ממבקרים אנונימיים
-- אפשר להריץ שוב בלי נזק.

-- 1. עד 30 שיחות חדשות ביום למשתמש (כולל הצעות של מורים על בקשות)
create index if not exists conversations_initiator_idx
  on public.conversations (initiated_by, created_at desc);

create or replace function public.conversations_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.initiated_by, auth.uid());
begin
  if v_user is null then
    return new;  -- פעולה פנימית / אדמין
  end if;
  if (select count(*) from public.conversations
       where initiated_by = v_user
         and created_at > now() - interval '1 day') >= 30 then
    raise exception 'rate limit: too many new conversations today' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.conversations_rate_limit() from public, anon, authenticated;

drop trigger if exists conversations_rate_limit on public.conversations;
create trigger conversations_rate_limit
  before insert on public.conversations
  for each row execute function public.conversations_rate_limit();

-- 2. עד 30 הודעות בדקה ועד 500 ביום למשתמש
create index if not exists messages_sender_idx
  on public.messages (sender_id, created_at desc);

create or replace function public.messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.messages
       where sender_id = new.sender_id
         and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate limit: too many messages' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages
       where sender_id = new.sender_id
         and created_at > now() - interval '1 day') >= 500 then
    raise exception 'rate limit: too many messages' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.messages_rate_limit() from public, anon, authenticated;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.messages_rate_limit();

-- 3. ביקורות: מבקר אנונימי לא רואה את מזהה התלמיד שכתב
revoke select on public.reviews from anon;
grant select (id, teacher_id, rating, comment, created_at, updated_at, is_hidden) on public.reviews to anon;
