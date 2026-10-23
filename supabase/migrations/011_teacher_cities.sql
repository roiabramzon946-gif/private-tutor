-- =====================================================================
-- Migration 011 — מורה יכול/ה ללמד בכמה ערים
--
-- teachers.city נשארת העיר הראשית (מוצגת בכרטיס ובפרופיל).
-- ערים נוספות נשמרות ב-teacher_cities (עד 10), והחיפוש לפי עיר או אזור
-- מוצא מורה גם לפי הערים הנוספות.
-- =====================================================================

create table if not exists public.teacher_cities (
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  city        text not null references public.localities(name) on update cascade,
  created_at  timestamptz not null default now(),
  primary key (teacher_id, city)
);

create index if not exists teacher_cities_city_idx on public.teacher_cities (city);

-- עד 10 ערים נוספות למורה
create or replace function public.limit_teacher_cities()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.teacher_cities where teacher_id = new.teacher_id) >= 10 then
    raise exception 'אפשר להוסיף עד 10 ערים נוספות';
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_cities_limit on public.teacher_cities;
create trigger teacher_cities_limit
  before insert on public.teacher_cities
  for each row execute function public.limit_teacher_cities();

alter table public.teacher_cities enable row level security;

drop policy if exists "teacher_cities: public read" on public.teacher_cities;
create policy "teacher_cities: public read"
  on public.teacher_cities for select
  using (true);

drop policy if exists "teacher_cities: owner insert" on public.teacher_cities;
create policy "teacher_cities: owner insert"
  on public.teacher_cities for insert to authenticated
  with check (teacher_id = (select auth.uid()));

drop policy if exists "teacher_cities: owner delete" on public.teacher_cities;
create policy "teacher_cities: owner delete"
  on public.teacher_cities for delete to authenticated
  using (teacher_id = (select auth.uid()));

revoke all on public.teacher_cities from anon;
revoke update on public.teacher_cities from authenticated;
grant select on public.teacher_cities to anon;
grant select, insert, delete on public.teacher_cities to authenticated;


-- ---------- חיפוש: עיר/אזור כוללים גם את הערים הנוספות ----------
create or replace function public.search_teachers(
  p_subject_slug    text    default null,
  p_city            text    default null,
  p_include_online  boolean default false,
  p_min_price       numeric default null,
  p_max_price       numeric default null,
  p_limit           int     default 20,
  p_offset          int     default 0,
  p_region          text    default null
)
returns table (
  teacher_id         uuid,
  full_name          text,
  avatar_url         text,
  city               text,
  region             text,
  bio_preview        text,
  hourly_rate        numeric,
  teaches_online     boolean,
  teaches_in_person  boolean,
  rating_avg         numeric,
  reviews_count      integer,
  subjects           text[],
  tier               public.subscription_tier,
  is_promoted        boolean,
  total_count        bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id, p.full_name, p.avatar_url, t.city, t.region, left(t.bio, 300),
    t.hourly_rate, t.teaches_online, t.teaches_in_person, t.rating_avg, t.reviews_count,
    coalesce(subj.names, '{}'), lt.effective_tier, lt.effective_tier <> 'free',
    count(*) over ()
  from public.teachers t
  join public.profiles p on p.id = t.id
  cross join lateral (
    select coalesce(max(s.tier), 'free'::public.subscription_tier) as effective_tier
      from public.subscriptions s
     where s.teacher_id = t.id
       and s.status in ('active', 'trialing')
       and s.current_period_end > now()
  ) lt
  cross join lateral (
    select array_agg(sj.name order by sj.name) as names
      from public.teacher_subjects ts
      join public.subjects sj on sj.id = ts.subject_id
     where ts.teacher_id = t.id
  ) subj
  where t.is_active
    and t.hourly_rate is not null
    and (p_subject_slug is null or exists (
          select 1 from public.teacher_subjects ts
            join public.subjects sj on sj.id = ts.subject_id
           where ts.teacher_id = t.id and sj.slug = p_subject_slug))
    -- עיר: מורים בעיר (פרונטלי) או אונליין אם ביקשו
    and (p_city is null
         or (t.teaches_in_person and (
               lower(trim(t.city)) = lower(trim(p_city))
               or exists (select 1 from public.teacher_cities tc
                           where tc.teacher_id = t.id
                             and lower(tc.city) = lower(trim(p_city)))))
         or (p_include_online and t.teaches_online))
    -- אזור: חל רק כשלא נבחרה עיר
    and (p_region is null or p_city is not null
         or (t.teaches_in_person and (
               t.region = p_region
               or exists (select 1 from public.teacher_cities tc
                            join public.localities l on l.name = tc.city
                           where tc.teacher_id = t.id and l.region = p_region)))
         or (p_include_online and t.teaches_online))
    and (p_min_price is null or t.hourly_rate >= p_min_price)
    and (p_max_price is null or t.hourly_rate <= p_max_price)
  order by
    lt.effective_tier desc,
    (t.rating_avg * t.reviews_count + 4.0 * 5) / (t.reviews_count + 5) desc,
    t.reviews_count desc,
    t.created_at,
    t.id
  limit  least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_teachers(text, text, boolean, numeric, numeric, int, int, text)
  to anon, authenticated;
