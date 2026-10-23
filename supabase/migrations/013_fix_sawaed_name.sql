-- תיקון שם שהגיע שבור מהלמ"ס: "סואעד (כמאנה( )שבט)" → "סואעד (כמאנה)" (יישוב בצפון).
-- השיוכים של מורים ובקשות מתעדכנים אוטומטית (on update cascade).
update public.localities
   set name = 'סואעד (כמאנה)'
 where name = 'סואעד (כמאנה( )שבט)'
   and not exists (select 1 from public.localities where name = 'סואעד (כמאנה)');
