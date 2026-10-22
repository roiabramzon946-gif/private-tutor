-- =====================================================================
-- Tutor Marketplace — נתוני דמה (Seed)
-- להרצה ב-SQL Editor אחרי tutor_marketplace_schema.sql
-- אפשר להריץ שוב ושוב: הקובץ מוחק קודם את משתמשי הדמה ויוצר אותם מחדש.
--
-- כל משתמשי הדמה יכולים גם להתחבר לאפליקציה:
--   סיסמה לכולם: Demo1234!
--   מורים:  dana@example.com, yossi@example.com, michal@example.com,
--           avi@example.com,  noa@example.com
--   תלמידים: itay@example.com, shira@example.com, omer@example.com
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. ניקוי משתמשי דמה קודמים (מוחק בשרשרת גם profiles/teachers/reviews...)
-- ---------------------------------------------------------------------
delete from auth.users
 where id in (
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333',
   '44444444-4444-4444-4444-444444444444',
   '55555555-5555-5555-5555-555555555555',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'cccccccc-cccc-cccc-cccc-cccccccccccc'
 );


-- ---------------------------------------------------------------------
-- 1. משתמשים ב-auth.users
-- הטריגר handle_new_user יוצר אוטומטית את profiles (ו-teachers למורים)
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  u.id::uuid,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', u.role, 'full_name', u.full_name),
  now() - u.joined_ago,
  now(),
  '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111', 'dana@example.com',   'teacher', 'דנה לוי',      interval '400 days'),
  ('22222222-2222-2222-2222-222222222222', 'yossi@example.com',  'teacher', 'יוסי כהן',     interval '200 days'),
  ('33333333-3333-3333-3333-333333333333', 'michal@example.com', 'teacher', 'מיכל אברהם',   interval '300 days'),
  ('44444444-4444-4444-4444-444444444444', 'avi@example.com',    'teacher', 'אבי מזרחי',    interval '90 days'),
  ('55555555-5555-5555-5555-555555555555', 'noa@example.com',    'teacher', 'נועה פרץ',     interval '20 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'itay@example.com',   'student', 'איתי שמעוני',  interval '150 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'shira@example.com',  'student', 'שירה גולן',    interval '120 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'omer@example.com',   'student', 'עומר דהן',     interval '60 days')
) as u(id, email, role, full_name, joined_ago);

-- זהות email — נדרשת כדי שאפשר יהיה להתחבר עם המשתמשים האלה
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(), now(), now()
from auth.users u
where u.email like '%@example.com'
  and u.id in (
    '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  );


-- ---------------------------------------------------------------------
-- 2. פרטי פרופיל המורים
-- ---------------------------------------------------------------------
update public.teachers t
   set bio               = v.bio,
       hourly_rate       = v.rate,
       city              = v.city,
       region            = v.region,
       teaches_online    = v.online,
       teaches_in_person = v.in_person,
       years_experience  = v.years,
       created_at        = now() - v.joined_ago
  from (values
    ('11111111-1111-1111-1111-111111111111'::uuid,
     'מורה למתמטיקה ופיזיקה עם 12 שנות ניסיון. מתמחה בהכנה לבגרות 5 יחידות ובבניית ביטחון אצל תלמידים שמתקשים. שיעורים מותאמים אישית עם חומרי תרגול מסודרים.',
     180, 'תל אביב', 'מרכז', true, true, 12, interval '400 days'),

    ('22222222-2222-2222-2222-222222222222'::uuid,
     'מורה לאנגלית, דובר אנגלית כשפת אם. הכנה לבגרות, פסיכומטרי ואנגלית מדוברת למבוגרים. גישה שיחתית וכיפית.',
     140, 'חיפה', 'צפון', true, true, 7, interval '200 days'),

    ('33333333-3333-3333-3333-333333333333'::uuid,
     'סטודנטית לרפואה, מלמדת ביולוגיה וכימיה ברמת בגרות. מסבירה בסבלנות ובעזרת שרטוטים ודוגמאות מהחיים.',
     150, 'ירושלים', 'ירושלים', false, true, 4, interval '300 days'),

    ('44444444-4444-4444-4444-444444444444'::uuid,
     'מהנדס תוכנה שמלמד מתמטיקה ומדעי המחשב. Python, Java ובגרות במדעי המחשב. מתאים גם לסטודנטים בשנה א''.',
     120, 'תל אביב', 'מרכז', true, true, 3, interval '90 days'),

    ('55555555-5555-5555-5555-555555555555'::uuid,
     'מורה צעירה ואנרגטית למתמטיקה ואנגלית לחטיבת ביניים ויסודי. עוזרת להשלים פערים ולבנות הרגלי למידה.',
     100, 'חיפה', 'צפון', true, false, 2, interval '20 days')
  ) as v(id, bio, rate, city, region, online, in_person, years, joined_ago)
 where t.id = v.id;


-- ---------------------------------------------------------------------
-- 3. מקצועות לכל מורה
-- ---------------------------------------------------------------------
insert into public.teacher_subjects (teacher_id, subject_id, levels)
select v.teacher_id, s.id, v.levels
  from (values
    ('11111111-1111-1111-1111-111111111111'::uuid, 'math',             array['חטיבת ביניים','תיכון','בגרות 5 יח"ל']),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'physics',          array['תיכון','בגרות 5 יח"ל']),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'english',          array['תיכון','בגרות','פסיכומטרי','מבוגרים']),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'biology',          array['תיכון','בגרות']),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'chemistry',        array['תיכון','בגרות']),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'math',             array['תיכון','אוניברסיטה']),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'computer-science', array['תיכון','בגרות','אוניברסיטה']),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'math',             array['יסודי','חטיבת ביניים']),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'english',          array['יסודי','חטיבת ביניים'])
  ) as v(teacher_id, slug, levels)
  join public.subjects s on s.slug = v.slug;


-- ---------------------------------------------------------------------
-- 4. מנויים
--   דנה  → premium פעיל
--   יוסי → pro פעיל
--   נועה → premium שפג אתמול (עדיין מסומן active — בודק שהחיפוש לא נותן לה עדיפות)
--   מיכל ואבי → בלי מנוי (free)
-- ---------------------------------------------------------------------
insert into public.subscriptions
  (teacher_id, tier, status, current_period_start, current_period_end, provider)
values
  ('11111111-1111-1111-1111-111111111111', 'premium', 'active', now() - interval '5 days',  now() + interval '25 days', 'demo'),
  ('22222222-2222-2222-2222-222222222222', 'pro',     'active', now() - interval '10 days', now() + interval '20 days', 'demo'),
  ('55555555-5555-5555-5555-555555555555', 'premium', 'active', now() - interval '31 days', now() - interval '1 day',   'demo');


-- ---------------------------------------------------------------------
-- 5. ביקורות (הטריגר מעדכן rating_avg ו-reviews_count אוטומטית)
-- ---------------------------------------------------------------------
insert into public.reviews (teacher_id, student_id, rating, comment, created_at)
values
  -- דנה: 5.0 משלוש ביקורות
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 'דנה פשוט מדהימה! עליתי מ-60 ל-92 בבגרות במתמטיקה.', now() - interval '40 days'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, 'מסבירה פיזיקה בצורה הכי ברורה שיש. ממליצה בחום.',   now() - interval '25 days'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'סבלנית, מקצועית ותמיד מגיעה מוכנה.',                now() - interval '10 days'),

  -- יוסי: 4.5 משתי ביקורות
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 'שיעורים נעימים, השיפור באנגלית מדוברת מורגש.',       now() - interval '30 days'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, 'הכנה מעולה לפסיכומטרי בחלק האנגלית.',               now() - interval '12 days'),

  -- מיכל: 4.67 משלוש ביקורות
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 'הסברים מעולים בביולוגיה, עם הרבה דוגמאות.',          now() - interval '50 days'),
  ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, 'טובה מאוד בכימיה, לפעמים קצת ממהרת.',                now() - interval '35 days'),
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'עזרה לי לעבור את הבגרות בכימיה בהצלחה.',             now() - interval '5 days'),

  -- אבי: 5.0 משתי ביקורות בלבד
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 5, 'מלמד Python בצורה מעשית וברורה.',                     now() - interval '20 days'),
  ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 5, 'עזר לי מאוד באינפי בשנה א''.',                        now() - interval '7 days');

  -- נועה: מורה חדשה, עדיין בלי ביקורות


-- =====================================================================
-- 6. שאילתות בדיקה — להריץ כל אחת בנפרד ולהשוות לתוצאה הצפויה
-- =====================================================================

-- א. כל המורים, בלי סינון:
--    צפוי: דנה (premium) → יוסי (pro) → ואז ה-free לפי דירוג מתוקן:
--          אבי (5.0/2) → מיכל (4.67/3) → נועה (בלי ביקורות)
-- select full_name, city, tier, is_promoted, rating_avg, reviews_count
--   from public.search_teachers();

-- ב. מתמטיקה בתל אביב:
--    צפוי: דנה (premium) → אבי (free)
-- select full_name, city, tier, rating_avg, subjects
--   from public.search_teachers('math', 'תל אביב');

-- ג. מתמטיקה בתל אביב + מורים אונליין מכל הארץ:
--    צפוי: דנה → אבי → נועה (חיפה, אונליין; המנוי שלה פג ולכן היא free)
-- select full_name, city, tier, teaches_online
--   from public.search_teachers('math', 'תל אביב', true);

-- ד. אנגלית בכל הארץ:
--    צפוי: יוסי (pro) לפני נועה (free)
-- select full_name, city, tier
--   from public.search_teachers('english');

-- ה. סינון מחיר: מורים עד 130 ש"ח לשעה
--    צפוי: אבי (120), נועה (100)
-- select full_name, hourly_rate
--   from public.search_teachers(p_max_price => 130);
