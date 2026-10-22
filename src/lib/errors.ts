// תרגום הודעות שגיאה נפוצות של Supabase Auth לעברית
export function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'אימייל או סיסמה שגויים'
  if (m.includes('email not confirmed')) return 'צריך לאשר את כתובת המייל לפני ההתחברות'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'כבר קיים משתמש עם כתובת המייל הזו'
  if (m.includes('password should be at least')) return 'הסיסמה קצרה מדי'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'
  if (m.includes('invalid') && m.includes('email')) return 'כתובת המייל לא תקינה'
  return `אירעה שגיאה: ${message}`
}
