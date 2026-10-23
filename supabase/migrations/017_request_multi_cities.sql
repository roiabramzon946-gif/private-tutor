-- =====================================================================
-- Migration 017 — בקשת לימוד עם כמה ערים (עד 5)
-- city = העיר הראשונה, extra_cities = השאר. כל עיר חייבת להיות מרשימת היישובים.
-- =====================================================================

alter table public.lesson_requests
  add column if not exists extra_cities text[] not null default '{}';

alter table public.lesson_requests drop constraint if exists lesson_requests_extra_cities_max;
alter table public.lesson_requests
  add constraint lesson_requests_extra_cities_max check (cardinality(extra_cities) <= 4);

-- כל עיר נוספת חייבת להיות ברשימת היישובים
create or replace function public.lesson_requests_check_cities()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.extra_cities) c
              where not exists (select 1 from public.localities l where l.name = c)) then
    raise exception 'unknown city in extra_cities';
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_requests_check_cities on public.lesson_requests;
create trigger lesson_requests_check_cities
  before insert or update of extra_cities on public.lesson_requests
  for each row execute function public.lesson_requests_check_cities();

grant insert (extra_cities) on public.lesson_requests to authenticated;

-- הרשימה למורים מחזירה גם את הערים הנוספות, וסינון לפי אזור בודק את כולן
drop function if exists public.list_open_requests(text, boolean, text, int, int);

create or replace function public.list_open_requests(
  p_subject_slug      text    default null,
  p_only_my_subjects  boolean default true,
  p_region            text    default null,
  p_limit             int     default 30,
  p_offset            int     default 0
)
returns table (
  id               uuid,
  subject_name     text,
  subject_slug     text,
  level            text,
  city             text,
  extra_cities     text[],
  region           text,
  in_person_ok     boolean,
  online_ok        boolean,
  budget_max       numeric,
  description      text,
  created_at       timestamptz,
  offers_count     integer,
  student_first    text,
  already_offered  boolean,
  total_count      bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, s.name, s.slug, r.level, r.city, r.extra_cities, l.region, r.in_person_ok, r.online_ok,
    r.budget_max, r.description, r.created_at, r.offers_count,
    split_part(btrim(p.full_name), ' ', 1),
    exists (select 1 from public.request_offers o
             where o.request_id = r.id and o.teacher_id = (select auth.uid())),
    count(*) over ()
  from public.lesson_requests r
  join public.subjects s on s.id = r.subject_id
  join public.profiles p on p.id = r.student_id
  left join public.localities l on l.name = r.city
  where exists (select 1 from public.profiles me
                 where me.id = (select auth.uid()) and me.role = 'teacher')
    and r.status = 'open'
    and r.created_at > now() - interval '30 days'
    and r.offers_count < 10
    and r.student_id <> (select auth.uid())
    and (p_subject_slug is null or s.slug = p_subject_slug)
    and (not p_only_my_subjects or exists (
          select 1 from public.teacher_subjects ts
           where ts.teacher_id = (select auth.uid()) and ts.subject_id = r.subject_id))
    and (p_region is null or r.online_ok or l.region = p_region
         or exists (select 1 from public.localities l2
                     where l2.name = any(r.extra_cities) and l2.region = p_region))
  order by r.created_at desc
  limit  least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.list_open_requests(text, boolean, text, int, int) from public, anon;
grant  execute on function public.list_open_requests(text, boolean, text, int, int) to authenticated;
