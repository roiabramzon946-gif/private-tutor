-- ⚠️ ניקוי לפני השקה: מוחק את כל המשתמשים וכל התוכן שלהם. אי אפשר לבטל!
-- לא migration — להריץ פעם אחת בלבד, ידנית, ב-SQL Editor.
-- נשארים: מקצועות, יישובים, הגדרות האתר (app_settings) והמבנה של המסד.
-- נמחקים: כל החשבונות (כולל שלך), פרופילים, מורים, טלפונים, ביקורות, צ'אטים,
--          בקשות לימוד, הצעות, דיווחים, מנויים ויומן התראות המייל.

begin;

-- מחיקת החשבונות. כל שאר הטבלאות מחוברות אליהם ונמחקות איתם (on delete cascade)
delete from auth.users;

-- ליתר ביטחון: שאריות שלא היו מחוברות לחשבון (נתוני דמו ישנים)
delete from public.profiles;
delete from public.lesson_requests;
delete from public.conversations;
delete from public.reports;
delete from public.email_notification_log;
delete from public.subscriptions;

commit;

-- בדיקה: הכול צריך להיות 0
select
  (select count(*) from auth.users)               as users,
  (select count(*) from public.profiles)          as profiles,
  (select count(*) from public.teachers)          as teachers,
  (select count(*) from public.reviews)           as reviews,
  (select count(*) from public.conversations)     as conversations,
  (select count(*) from public.messages)          as messages,
  (select count(*) from public.lesson_requests)   as requests,
  (select count(*) from public.request_offers)    as offers,
  (select count(*) from public.subjects)          as subjects_kept,
  (select count(*) from public.localities)        as localities_kept;
