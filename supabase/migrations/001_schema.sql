-- =====================================================================
-- Tutor Marketplace — Supabase schema (שלב 1: Backend + DB)
-- להרצה ב-SQL Editor של Supabase, פעם אחת, על פרויקט נקי
-- =====================================================================


-- =====================================================================
-- 1. ENUMS
-- =====================================================================
create type public.user_role as enum ('student', 'teacher');

-- הסדר קובע עדיפות בחיפוש: premium > pro > free
create type public.subscription_tier as enum ('free', 'pro', 'premium');

create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'canceled', 'expired');


-- =====================================================================
-- 2. HELPER: updated_at
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =====================================================================
-- 3. TABLES
-- =====================================================================

-- כל משתמש (מורה או תלמיד). מידע ציבורי בלבד — שם ותמונה.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'student',
  full_name   text not null default '' check (char_length(full_name) <= 100),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- הרחבה למורים בלבד (1:1 מול profiles)
create table public.teachers (
  id                 uuid primary key references public.profiles(id) on delete cascade,
  bio                text check (char_length(bio) <= 3000),
  hourly_rate        numeric(8,2) check (hourly_rate > 0 and hourly_rate < 10000),
  city               text,
  region             text,
  teaches_online     boolean not null default false,
  teaches_in_person  boolean not null default true,
  years_experience   smallint check (years_experience between 0 and 70),
  is_active          boolean not null default true,

  -- שדות שמנוהלים ע"י המערכת בלבד (טריגרים) — המורה לא יכול לערוך אותם
  subscription_tier  public.subscription_tier not null default 'free',
  rating_avg         numeric(3,2) not null default 0,
  reviews_count      integer not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index teachers_city_idx on public.teachers (lower(trim(city))) where is_active;

-- קטלוג מקצועות (מנוהל ע"י אדמין)
create table public.subjects (
  id        smallint generated always as identity primary key,
  name      text not null unique,
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category  text
);

-- איזה מורה מלמד איזה מקצוע (N:N)
create table public.teacher_subjects (
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  subject_id  smallint not null references public.subjects(id) on delete cascade,
  levels      text[] not null default '{}',   -- למשל {'יסודי','תיכון','בגרות 5 יח'''}
  primary key (teacher_id, subject_id)
);

create index teacher_subjects_subject_idx on public.teacher_subjects (subject_id);

-- ביקורות: תלמיד אחד = ביקורת אחת לכל מורה
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.teachers(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (teacher_id, student_id),
  check (teacher_id <> student_id)
);

create index reviews_teacher_idx on public.reviews (teacher_id, created_at desc);

-- מנויים בתשלום. נכתבים רק מהשרת (webhook של ספק התשלומים, עם service_role)
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  teacher_id                uuid not null references public.teachers(id) on delete cascade,
  tier                      public.subscription_tier not null check (tier <> 'free'),
  status                    public.subscription_status not null default 'active',
  current_period_start      timestamptz not null default now(),
  current_period_end        timestamptz not null,
  provider                  text,          -- 'stripe' / 'tranzila' / 'cardcom' ...
  provider_subscription_id  text unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (current_period_end > current_period_start)
);

create index subscriptions_teacher_idx
  on public.subscriptions (teacher_id, status, current_period_end);

-- updated_at triggers
create trigger profiles_updated_at      before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger teachers_updated_at      before update on public.teachers
  for each row execute function public.set_updated_at();
create trigger reviews_updated_at       before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();


-- =====================================================================
-- 4. AUTOMATION (TRIGGERS)
-- =====================================================================

-- 4a. יצירת profile (ו-teacher אם צריך) אוטומטית בהרשמה.
-- בצד הלקוח: supabase.auth.signUp({ email, password,
--   options: { data: { role: 'teacher', full_name: 'ישראל ישראלי' } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  v_role := case
              when new.raw_user_meta_data->>'role' = 'teacher' then 'teacher'::public.user_role
              else 'student'::public.user_role
            end;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, coalesce(new.raw_user_meta_data->>'full_name', ''));

  if v_role = 'teacher' then
    insert into public.teachers (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 4b. עדכון ממוצע דירוג ומספר ביקורות אצל המורה
create or replace function public.refresh_teacher_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_teacher uuid := coalesce(new.teacher_id, old.teacher_id);
begin
  update public.teachers t
     set rating_avg    = coalesce(r.avg_rating, 0),
         reviews_count = r.cnt
    from (
      select round(avg(rating), 2) as avg_rating, count(*)::int as cnt
        from public.reviews
       where teacher_id = v_teacher
    ) r
   where t.id = v_teacher;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_teacher_rating();


-- 4c. סנכרון subscription_tier אצל המורה לפי המנוי הפעיל הגבוה ביותר
create or replace function public.sync_teacher_tier(p_teacher uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.teachers t
     set subscription_tier = coalesce((
           select max(s.tier)
             from public.subscriptions s
            where s.teacher_id = p_teacher
              and s.status in ('active', 'trialing')
              and s.current_period_end > now()
         ), 'free')
   where t.id = p_teacher;
$$;

create or replace function public.on_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_teacher_tier(coalesce(new.teacher_id, old.teacher_id));
  return null;
end;
$$;

create trigger subscriptions_sync_tier
  after insert or update or delete on public.subscriptions
  for each row execute function public.on_subscription_change();


-- 4d. סימון מנויים שפג תוקפם (הטריגר למעלה יעדכן את המורה)
create or replace function public.expire_subscriptions()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.subscriptions
     set status = 'expired'
   where status in ('active', 'trialing')
     and current_period_end <= now();
$$;

-- אופציונלי: להפעיל את התוסף pg_cron (Database → Extensions) ואז:
-- select cron.schedule('expire-subscriptions', '5 * * * *',
--                      $$select public.expire_subscriptions()$$);

-- פונקציות פנימיות — לא נחשפות ל-API
revoke execute on function public.sync_teacher_tier(uuid)  from public, anon, authenticated;
revoke execute on function public.expire_subscriptions()   from public, anon, authenticated;


-- =====================================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.teachers         enable row level security;
alter table public.subjects         enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.reviews          enable row level security;
alter table public.subscriptions    enable row level security;

-- ---------- profiles ----------
create policy "profiles: public read"
  on public.profiles for select
  using (true);

create policy "profiles: owner update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- אין INSERT מהלקוח (רק הטריגר), ואי אפשר לשנות role
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- ---------- teachers ----------
create policy "teachers: public read active"
  on public.teachers for select
  using (is_active or id = (select auth.uid()));

create policy "teachers: owner update"
  on public.teachers for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- המורה יכול לערוך רק את שדות הפרופיל — לא דירוג ולא מנוי
revoke insert, update, delete on public.teachers from anon, authenticated;
grant update (bio, hourly_rate, city, region, teaches_online,
              teaches_in_person, years_experience, is_active)
  on public.teachers to authenticated;

-- ---------- subjects ----------
create policy "subjects: public read"
  on public.subjects for select
  using (true);

revoke insert, update, delete on public.subjects from anon, authenticated;

-- ---------- teacher_subjects ----------
create policy "teacher_subjects: public read"
  on public.teacher_subjects for select
  using (true);

create policy "teacher_subjects: owner insert"
  on public.teacher_subjects for insert to authenticated
  with check (teacher_id = (select auth.uid()));

create policy "teacher_subjects: owner update"
  on public.teacher_subjects for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "teacher_subjects: owner delete"
  on public.teacher_subjects for delete to authenticated
  using (teacher_id = (select auth.uid()));

revoke insert, update, delete on public.teacher_subjects from anon;

-- ---------- reviews ----------
create policy "reviews: public read"
  on public.reviews for select
  using (true);

create policy "reviews: students insert own"
  on public.reviews for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'student'
    )
  );

create policy "reviews: owner update"
  on public.reviews for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "reviews: owner delete"
  on public.reviews for delete to authenticated
  using (student_id = (select auth.uid()));

revoke insert, update, delete on public.reviews from anon;
revoke update on public.reviews from authenticated;
grant update (rating, comment) on public.reviews to authenticated;

-- ---------- subscriptions ----------
-- מורה רואה רק את המנויים שלו. כתיבה רק דרך service_role (עוקף RLS).
create policy "subscriptions: owner read"
  on public.subscriptions for select to authenticated
  using (teacher_id = (select auth.uid()));

revoke insert, update, delete on public.subscriptions from anon, authenticated;


-- =====================================================================
-- 6. STORAGE — תמונות פרופיל
-- נתיב קובץ: avatars/<user_id>/avatar.webp
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars'
         and (storage.foldername(name))[1] = (select auth.uid())::text);


-- =====================================================================
-- 7. SEARCH FUNCTION
-- סדר: דרגת מנוי פעיל (premium → pro → free),
--       אחר כך דירוג "מתוקן" (Bayesian) כדי שמורה עם ביקורת 5 יחידה
--       לא יעקוף מורה עם 4.8 מ-60 ביקורות, ואז מספר ביקורות.
-- =====================================================================
create or replace function public.search_teachers(
  p_subject_slug    text    default null,
  p_city            text    default null,
  p_include_online  boolean default false,
  p_min_price       numeric default null,
  p_max_price       numeric default null,
  p_limit           int     default 20,
  p_offset          int     default 0
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
security definer   -- צריך לקרוא subscriptions של כל המורים; מחזיר רק שדות ציבוריים
set search_path = ''
as $$
  select
    t.id,
    p.full_name,
    p.avatar_url,
    t.city,
    t.region,
    left(t.bio, 300),
    t.hourly_rate,
    t.teaches_online,
    t.teaches_in_person,
    t.rating_avg,
    t.reviews_count,
    coalesce(subj.names, '{}'),
    lt.effective_tier,
    lt.effective_tier <> 'free',
    count(*) over ()
  from public.teachers t
  join public.profiles p on p.id = t.id
  -- דרגת מנוי "חיה" — לא תלויה בזה שה-cron רץ
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
          select 1
            from public.teacher_subjects ts
            join public.subjects sj on sj.id = ts.subject_id
           where ts.teacher_id = t.id
             and sj.slug = p_subject_slug))
    and (p_city is null
         or lower(trim(t.city)) = lower(trim(p_city))
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

grant execute on function public.search_teachers(text, text, boolean, numeric, numeric, int, int)
  to anon, authenticated;

-- דוגמת קריאה:
-- select * from public.search_teachers('math', 'תל אביב', true);
-- מ-Next.js:
-- supabase.rpc('search_teachers', { p_subject_slug: 'math', p_city: 'תל אביב', p_include_online: true })


-- =====================================================================
-- 8. SEED — מקצועות התחלתיים
-- =====================================================================
insert into public.subjects (name, slug, category) values
  ('מתמטיקה',      'math',              'מדעים מדויקים'),
  ('פיזיקה',       'physics',           'מדעים מדויקים'),
  ('מדעי המחשב',   'computer-science',  'מדעים מדויקים'),
  ('כימיה',        'chemistry',         'מדעי הטבע'),
  ('ביולוגיה',     'biology',           'מדעי הטבע'),
  ('אנגלית',       'english',           'שפות'),
  ('ערבית',        'arabic',            'שפות'),
  ('לשון',         'hebrew-language',   'שפות'),
  ('ספרות',        'literature',        'מדעי הרוח'),
  ('היסטוריה',     'history',           'מדעי הרוח'),
  ('תנ"ך',         'bible',             'מדעי הרוח'),
  ('אזרחות',       'civics',            'מדעי הרוח')
on conflict do nothing;
