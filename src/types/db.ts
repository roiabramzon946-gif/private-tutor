export type UserRole = 'student' | 'teacher'
export type SubscriptionTier = 'free' | 'pro' | 'premium'

export type Subject = {
  id: number
  name: string
  slug: string
  category: string | null
}

export type FormState = {
  error?: string
  message?: string
  ok?: boolean
  // התחברות עם מייל שעוד לא אומת: הכתובת, כדי להציע שליחה חוזרת של מייל האימות
  unconfirmedEmail?: string
}

export type Locality = {
  name: string
  region: string | null
}

export const REGIONS = [
  'מרכז',
  'שרון',
  'שפלה',
  'ירושלים',
  'חיפה והקריות',
  'צפון',
  'דרום',
  'יהודה ושומרון',
] as const
