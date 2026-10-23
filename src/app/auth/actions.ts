'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNext, siteOrigin } from '@/lib/auth'
import { translateAuthError } from '@/lib/errors'
import { normalizePhone } from '@/lib/phone'
import type { FormState } from '@/types/db'
import { LEGAL_VERSION } from '@/lib/legal'

function str(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = str(formData, 'full_name')
  const email = str(formData, 'email').toLowerCase()
  const password = formData.get('password')
  const role = formData.get('role') === 'teacher' ? 'teacher' : 'student'
  const phone = normalizePhone(str(formData, 'phone'))
  const showPhone = role === 'teacher' && formData.get('show_phone') === 'on'

  if (fullName.length < 2 || fullName.length > 100) return { error: 'נא להזין שם מלא' }
  if (!email.includes('@')) return { error: 'כתובת המייל לא תקינה' }
  if (!phone) return { error: 'מספר הטלפון לא תקין. לדוגמה: 050-1234567' }
  if (typeof password !== 'string' || password.length < 8)
    return { error: 'הסיסמה צריכה להכיל לפחות 8 תווים' }
  if (formData.get('accept_terms') !== 'on')
    return { error: 'כדי להירשם צריך לאשר את תנאי השימוש ומדיניות הפרטיות' }

  const supabase = await createClient()
  const origin = await siteOrigin()
  const next = role === 'teacher' ? '/dashboard' : '/search'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        phone,
        show_phone: showPhone,
        terms_version: LEGAL_VERSION,
        terms_accepted_at: new Date().toISOString(),
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) return { error: translateAuthError(error.message) }

  // כתובת שכבר רשומה: Supabase מחזיר "הצלחה" בלי לשלוח מייל (משתמש בלי identities)
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      error: 'כבר קיים חשבון עם כתובת המייל הזו. אפשר להתחבר, או לאפס סיסמה דרך "שכחתי סיסמה" בדף ההתחברות.',
    }
  }

  // אם אימות מייל מופעל ב-Supabase — אין session עדיין
  if (!data.session) {
    return {
      ok: true,
      message: `שלחנו מייל אימות ל-${email}. לחצו על הקישור במייל כדי להשלים את ההרשמה.`,
    }
  }

  redirect(next)
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, 'email').toLowerCase()
  const password = formData.get('password')
  const next = safeNext(formData.get('next'))

  if (!email || typeof password !== 'string' || !password)
    return { error: 'נא להזין אימייל וסיסמה' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: translateAuthError(error.message) }

  if (next) redirect(next)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  redirect(profile?.role === 'teacher' ? '/dashboard' : '/search')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
