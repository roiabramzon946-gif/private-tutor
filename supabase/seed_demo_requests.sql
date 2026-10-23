-- =====================================================================
-- נתוני דמה: בקשות לימוד פתוחות מתלמידי הדמה (איתי, שירה, עומר)
-- להרצה ב-SQL Editor. אפשר להריץ שוב: הבקשות נמחקות ונוצרות מחדש.
-- (עד 3 בקשות פתוחות לתלמיד — הטריגר במסד אוכף את זה.)
-- =====================================================================

delete from public.lesson_requests
 where id in (
   'eeeeeeee-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000002',
   'eeeeeeee-0000-0000-0000-000000000003',
   'eeeeeeee-0000-0000-0000-000000000004',
   'eeeeeeee-0000-0000-0000-000000000005',
   'eeeeeeee-0000-0000-0000-000000000006'
 );

insert into public.lesson_requests
  (id, student_id, subject_id, level, city, in_person_ok, online_ok, budget_max, description)
select v.id::uuid, v.student_id::uuid, s.id, v.level, v.city, v.in_person_ok, v.online_ok, v.budget_max, v.description
  from (values
    -- איתי
    ('eeeeeeee-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'psychometric', 'פרק כמותי + מילולי', null::text, false, true, 160::numeric,
     'נבחן בפסיכומטרי בדצמבר, יש לי בעיקר קושי בפרק הכמותי ובניהול זמן. מחפש מורה לשיעור או שניים בשבוע, עדיף בערבים.'),
    ('eeeeeeee-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'literature', 'בגרות', 'תל אביב - יפו', true, true, 130,
     'צריך עזרה בהכנה לבגרות בספרות: ניתוח שירה ושני רומנים. כמה שיעורים בחודש הקרוב.'),
    -- שירה
    ('eeeeeeee-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'math', 'בגרות 5 יח"ל', 'רעננה', true, false, 180,
     'כיתה י"ב, מתכוננת לבגרות 5 יח"ל במתמטיקה. בעיקר אינטגרלים וגאומטריה אנליטית. מעדיפה שיעורים בבית.'),
    ('eeeeeeee-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'bible', 'בגרות', null, false, true, 120,
     'מחפשת מורה לתנ"ך לקראת הבגרות. צריכה עזרה בעיקר בפרשנות ובכתיבת תשובות מלאות.'),
    -- עומר
    ('eeeeeeee-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'statistics', 'שנה א'' - כלכלה', null, false, true, 170,
     'סטודנט שנה א'' בכלכלה, צריך עזרה בקורס מבוא לסטטיסטיקה והסתברות לפני המבחן. אונליין בלבד.'),
    ('eeeeeeee-0000-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'programming', 'מבוא למדעי המחשב (Python)', 'באר שבע', true, true, 150,
     'צריך עזרה בתרגילים בקורס מבוא ל-Python באוניברסיטה. אפשר פרונטלי בבאר שבע או אונליין.')
  ) as v(id, student_id, slug, level, city, in_person_ok, online_ok, budget_max, description)
  join public.subjects s on s.slug = v.slug
 where exists (select 1 from public.profiles p where p.id = v.student_id::uuid);

-- בדיקה: אמורות להופיע 6 בקשות פתוחות
select r.id, p.full_name, s.name as subject, r.city, r.status
  from public.lesson_requests r
  join public.profiles p on p.id = r.student_id
  join public.subjects s on s.id = r.subject_id
 where r.id::text like 'eeeeeeee-%'
 order by r.id;
