-- 025: סדר המורים בחיפוש ובדף הבית
-- כשיש שוויון בדירוג (למשל בהתחלה, כשלאף מורה אין ביקורות):
--   1. מורים עם פרופיל מלא (תמונה + "קצת עליי" של 50 תווים ומעלה) קודם
--   2. בתוך כל קבוצה — סבב שמתחלף כל יום, במקום "מי שנרשם ראשון"
-- הסדר העיקרי לא השתנה: פרימיום, ואז דירוג משוקלל ומספר ביקורות.
-- אפשר להריץ שוב בלי נזק.

create or replace function public.search_teachers(
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
    -- בשוויון: פרופיל מלא (תמונה + "קצת עליי") קודם
    (p.avatar_url is not null and char_length(coalesce(t.bio, '')) >= 50) desc,
    -- ובתוך כל קבוצה: סבב שמתחלף כל יום (לפי שעון ישראל), כדי שכל מורה יקבל חשיפה
    md5(t.id::text || to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD')),
    t.id
  limit  least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_teachers(text, text, boolean, numeric, numeric, int, int, text, text, int, text)
  to anon, authenticated;
