-- 021: מקצועות נוספים
insert into public.subjects (name, slug, category) values
  -- בית ספר
  ('מדעים (חטיבת ביניים)',           'middle-school-science', 'מדעי הטבע'),
  ('גאוגרפיה',                       'geography',             'מדעי הרוח'),
  ('מחשבת ישראל',                    'jewish-thought',        'מדעי הרוח'),
  ('תושב"ע / גמרא',                  'oral-torah',            'מדעי הרוח'),
  ('הוראה מתקנת ולקויות למידה',      'remedial-teaching',     'הוראה מתקנת'),
  -- שפות
  ('צרפתית',                         'french',                'שפות'),
  ('ספרדית',                         'spanish',               'שפות'),
  ('רוסית',                          'russian',               'שפות'),
  ('עברית לעולים',                   'hebrew-for-olim',       'שפות'),
  -- אקדמיה
  ('Excel / SQL / ניתוח נתונים',     'data-analysis',         'אקדמיה'),
  ('אלקטרוניקה ומעגלים',             'electronics',           'אקדמיה'),
  ('הנחיה בכתיבה אקדמית',            'academic-writing',      'אקדמיה')
on conflict do nothing;
