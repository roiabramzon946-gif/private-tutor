-- =====================================================================
-- Migration 004 — מקצועות נוספים: פסיכומטרי ומבחנים + לימודים אקדמיים
-- אפשר להריץ יותר מפעם אחת (מקצוע שכבר קיים לא יתווסף שוב)
-- =====================================================================

insert into public.subjects (name, slug, category) values
  -- פסיכומטרי ומבחנים
  ('פסיכומטרי',                 'psychometric',            'פסיכומטרי ומבחנים'),
  ('אמי"ר / אמיר"ם',            'amir',                    'פסיכומטרי ומבחנים'),
  ('יע"ל (מבחן בעברית)',         'yael',                    'פסיכומטרי ומבחנים'),

  -- אקדמיה
  ('חדו"א / אינפי',              'calculus',                'אקדמיה'),
  ('אלגברה לינארית',             'linear-algebra',          'אקדמיה'),
  ('מתמטיקה בדידה',              'discrete-math',           'אקדמיה'),
  ('משוואות דיפרנציאליות',       'differential-equations',  'אקדמיה'),
  ('סטטיסטיקה והסתברות',         'statistics',              'אקדמיה'),
  ('תכנות (Python, Java, C)',    'programming',             'אקדמיה'),
  ('מבני נתונים ואלגוריתמים',    'data-structures',         'אקדמיה'),
  ('פיזיקה אקדמית',              'academic-physics',        'אקדמיה'),
  ('כלכלה',                      'economics',               'אקדמיה'),
  ('חשבונאות',                   'accounting',              'אקדמיה')
on conflict do nothing;


-- נתוני דמה: יוסי מלמד גם פסיכומטרי, אבי מלמד גם חדו"א ותכנות
insert into public.teacher_subjects (teacher_id, subject_id, levels)
select v.teacher_id, s.id, v.levels
  from (values
    ('22222222-2222-2222-2222-222222222222'::uuid, 'psychometric', array['פרק האנגלית']),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'calculus',     array['שנה א''', 'הנדסה', 'מדעי המחשב']),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'programming',  array['מבוא', 'Python', 'Java'])
  ) as v(teacher_id, slug, levels)
  join public.subjects s on s.slug = v.slug
 where exists (select 1 from public.teachers t where t.id = v.teacher_id)
on conflict do nothing;
