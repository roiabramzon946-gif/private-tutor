-- =====================================================================
-- Migration 018 — סינון לפי רמה וזמינות
--
-- 1. רמות קבועות לכל מקצוע של מורה (במקום טקסט חופשי):
--    יסודי · חטיבת ביניים · בגרות 3 יח"ל · בגרות 4 יח"ל · בגרות 5 יח"ל · אקדמיה
--    מקצועות בקטגוריית "אקדמיה" מקבלים אוטומטית את הרמה "אקדמיה".
-- 2. זמינות שבועית של המורה: ימים × חלקי יום (בוקר / צהריים / אחה"צ / ערב).
-- 3. חיפוש מורים: פרמטרים חדשים p_level, p_day, p_slot.
-- =====================================================================


-- ---------- 1. רמות ----------
-- המרת הרמות הקיימות (טקסט חופשי) לרמות הקבועות
update public.teacher_subjects ts
   set levels = coalesce((
     select array_agg(distinct lv order by lv)
       from (
         select unnest(case
           when l ilike '%יסודי%'                                then array['יסודי']
           when l ilike '%חטיב%'                                 then array['חטיבת ביניים']
           when l ilike '%3 יח%'                                 then array['בגרות 3 יח"ל']
           when l ilike '%4 יח%'                                 then array['בגרות 4 יח"ל']
           when l ilike '%5 יח%'                                 then array['בגרות 5 יח"ל']
           when l ilike '%בגרות%' or l ilike '%תיכון%'           then array['בגרות 3 יח"ל', 'בגרות 4 יח"ל', 'בגרות 5 יח"ל']
           when l ilike any (array['%אקדמ%', '%אוניברסיט%', '%תואר%', '%שנה א%', '%הנדסה%', '%סטודנט%', '%מבוא%'])
                                                                 then array['אקדמיה']
           else array[]::text[]
         end) as lv
           from unnest(ts.levels) l
       ) x
   ), '{}');

-- מקצועות אקדמיים: תמיד "אקדמיה"
update public.teacher_subjects ts
   set levels = array['אקדמיה']
  from public.subjects sj
 where sj.id = ts.subject_id and sj.category = 'אקדמיה';

-- מעכשיו רק ערכים מהרשימה
alter table public.teacher_subjects drop constraint if exists teacher_subjects_levels_valid;
alter table public.teacher_subjects
  add constraint teacher_subjects_levels_valid check (
    levels <@ array['יסודי', 'חטיבת ביניים', 'בגרות 3 יח"ל', 'בגרות 4 יח"ל', 'בגרות 5 יח"ל', 'אקדמיה']::text[]
  );

create index if not exists teacher_subjects_levels_idx on public.teacher_subjects using gin (levels);


-- ---------- 2. זמינות ----------
-- ערכים בפורמט "<יום>-<חלק ביום>": יום 0=ראשון … 6=שבת;
-- חלק ביום: morning (8–12) / noon (12–16) / afternoon (16–20) / evening (20–23)
alter table public.teachers
  add column if not exists availability text[] not null default '{}';

alter table public.teachers drop constraint if exists teachers_availability_valid;
alter table public.teachers
  add constraint teachers_availability_valid check (
    cardinality(availability) <= 28
    and availability <@ array[
      '0-morning', '0-noon', '0-afternoon', '0-evening',
      '1-morning', '1-noon', '1-afternoon', '1-evening',
      '2-morning', '2-noon', '2-afternoon', '2-evening',
      '3-morning', '3-noon', '3-afternoon', '3-evening',
      '4-morning', '4-noon', '4-afternoon', '4-evening',
      '5-morning', '5-noon', '5-afternoon', '5-evening',
      '6-morning', '6-noon', '6-afternoon', '6-evening'
    ]::text[]
  );

grant update (availability) on public.teachers to authenticated;


-- ---------- 3. חיפוש ----------
drop function if exists public.search_teachers(text, text, boolean, numeric, numeric, int, int, text);

create function public.search_teachers(
  p_subject_slug    text    default null,
  p_city            text    default null,
  p_include_online  boolean default false,
  p_min_price       numeric default null,
  p_max_price       numeric default null,
  p_limit           int     default 20,
  p_offset          int     default 0,
  p_region          text    default null,
  p_level           text    default null,
  p_day             int     default null,
  p_slot            text    default null
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
    -- רמה: המורה מלמד/ת את הרמה הזו (במקצוע שנבחר, אם נבחר).
    -- מקצועות של פסיכומטרי ומבחנים אין להם רמות, ולכן לא מסוננים לפי רמה
    and (p_level is null or exists (
          select 1 from public.teacher_subjects ts
            join public.subjects sj on sj.id = ts.subject_id
           where ts.teacher_id = t.id
             and (p_subject_slug is null or sj.slug = p_subject_slug)
             and (p_level = any(ts.levels) or sj.category = 'פסיכומטרי ומבחנים')))
    -- זמינות: יום ו/או חלק ביום (מורים שלא מילאו זמינות לא מופיעים כשמסננים)
    and (p_day is null and p_slot is null or exists (
          select 1 from unnest(t.availability) a
           where (p_day is null or split_part(a, '-', 1) = p_day::text)
             and (p_slot is null or split_part(a, '-', 2) = p_slot)))
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

grant execute on function public.search_teachers(text, text, boolean, numeric, numeric, int, int, text, text, int, text)
  to anon, authenticated;
