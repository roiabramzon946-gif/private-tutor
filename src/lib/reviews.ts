// הסברים לסיבות שבגללן אי אפשר עדיין לכתוב ביקורת (review_eligibility במסד)
const REASONS: Record<string, string> = {
  not_logged_in: 'צריך להתחבר כדי לכתוב ביקורת.',
  not_student: 'רק תלמידים יכולים לכתוב ביקורות.',
  self: 'אי אפשר לכתוב ביקורת על עצמך.',
  email_unconfirmed: 'כדי לכתוב ביקורת צריך קודם לאשר את כתובת המייל שלך.',
  account_too_new: 'אפשר לכתוב ביקורות שבוע אחרי ההרשמה לאתר.',
  no_conversation:
    'אפשר לכתוב ביקורת על מורה שהתכתבת איתו באתר (ושענה לך). שלחו הודעה דרך הכפתור למעלה כדי לתאם שיעור.',
  conversation_too_new: 'אפשר לכתוב ביקורת יומיים אחרי תחילת ההתכתבות עם המורה.',
  teacher_daily_limit: 'המורה קיבל/ה הרבה ביקורות היום. אפשר לנסות שוב מחר.',
}

export function reviewBlockedMessage(reason: string): string {
  return REASONS[reason] ?? 'אי אפשר לכתוב ביקורת כרגע.'
}
