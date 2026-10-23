-- =====================================================================
-- Migration 012 — איחוד יישובי השבטים בנגב לפריט אחד: "יישובי הפזורה בנגב"
--
-- 23 היישובים עם "(שבט)" באזור הדרום מוצגים מעכשיו כפריט אחד ברשימה.
-- מורים, ערים נוספות ובקשות לימוד שהיו משויכים לאחד מהם עוברים לפריט החדש.
-- ח'ואלד (שבט) נמצא בצפון ולא בנגב — הוא מאוחד עם "ח'ואלד" שכבר קיים ברשימה.
-- אפשר להריץ יותר מפעם אחת.
-- =====================================================================

do $$
declare
  v_new constant text := 'יישובי הפזורה בנגב';
begin
  -- 1. הפריט החדש (קוד פנימי שלא קיים בלמ"ס)
  insert into public.localities (code, name, region)
  values (900001, v_new, 'דרום')
  on conflict (code) do update set name = excluded.name, region = excluded.region;

  -- 2. העברת השיוכים
  update public.teachers
     set city = v_new, region = 'דרום'
   where city like '%(שבט)%'
     and city in (select name from public.localities where region = 'דרום');

  update public.lesson_requests
     set city = v_new
   where city like '%(שבט)%'
     and city in (select name from public.localities where region = 'דרום');

  if to_regclass('public.teacher_cities') is not null then
    insert into public.teacher_cities (teacher_id, city)
    select distinct tc.teacher_id, v_new
      from public.teacher_cities tc
      join public.localities l on l.name = tc.city
     where l.name like '%(שבט)%' and l.region = 'דרום'
       and not exists (select 1 from public.teacher_cities x
                        where x.teacher_id = tc.teacher_id and x.city = v_new)
    on conflict do nothing;

    delete from public.teacher_cities tc
     using public.localities l
     where l.name = tc.city
       and l.name like '%(שבט)%' and l.region = 'דרום';
  end if;

  -- 3. מחיקת הפריטים הישנים מהרשימה
  delete from public.localities
   where name like '%(שבט)%' and region = 'דרום';

  -- 4. ח'ואלד בצפון: כבר קיים ברשימה גם בלי "(שבט)", אז מאחדים אליו
  if exists (select 1 from public.localities where name = 'ח''ואלד') then
    update public.teachers        set city = 'ח''ואלד' where city = 'ח''ואלד (שבט)';
    update public.lesson_requests set city = 'ח''ואלד' where city = 'ח''ואלד (שבט)';
    if to_regclass('public.teacher_cities') is not null then
      insert into public.teacher_cities (teacher_id, city)
      select teacher_id, 'ח''ואלד' from public.teacher_cities where city = 'ח''ואלד (שבט)'
      on conflict do nothing;
      delete from public.teacher_cities where city = 'ח''ואלד (שבט)';
    end if;
    delete from public.localities where name = 'ח''ואלד (שבט)';
  else
    update public.localities set name = 'ח''ואלד' where name = 'ח''ואלד (שבט)';
  end if;
end $$;

-- בדיקה: אמור לחזור 0
select count(*) as left_with_shevet from public.localities where name like '%(שבט)%';
