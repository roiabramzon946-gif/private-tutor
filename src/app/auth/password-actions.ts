'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/lib/errors'
import type { FormState } from '@/types/db'

// שליחת מייל לאיפוס סיסמה.
// הודעת ההצלחה זהה לכל כתובת — כדי שאי אפשר יהיה לבדוק אילו כתובות רשומות באתר.
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email.includes('@')) return { error: 'כתובת המייל לא תקינה' }

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Supabase לא מחזיר שגיאה על כתובת שלא רשומה, אז הצגת שגיאה לא חושפת אילו כתובות קיימות.
  // שגיאה כאן היא תקלה אמיתית (למשל בשליחת המייל) — מציגים אותה במקום הודעת הצלחה שקרית.
  if (error) {
    console.error('resetPasswordForEmail failed:', error.message)
    return { error: /rate limit|too many/i.test(error.message)
      ? translateAuthError(error.message)
      : `שליחת המייל נכשלה (${error.message}). נסו שוב בעוד כמה דקות.` }
  }

  return {
    ok: true,
    message: `אם קיים חשבון עם הכתובת ${email}, נשלח אליה קישור לאיפוס הסיסמה. הקישור תקף לשעה. לא הגיע? בדקו גם בספאם.`,
  }
}

// קביעת סיסמה חדשה (אחרי שנכנסו דרך הקישור במייל)
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get('password')
  const confirm = formData.get('confirm')

  if (typeof password !== 'string' || password.length < 8)
    return { error: 'הסיסמה צריכה להכיל לפחות 8 תווים' }
  if (password !== confirm) return { error: 'הסיסמאות לא תואמות' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) {
    return { error: 'הקישור פג תוקף או שכבר נעשה בו שימוש. בקשו קישור חדש.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: translateAuthError(error.message) }

  return { ok: true, message: 'הסיסמה עודכנה. את/ה מחובר/ת עם הסיסמה החדשה.' }
}
