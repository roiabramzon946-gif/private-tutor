'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { FormState } from '@/types/db'
import { MAX_REQUEST_CITIES } from '@/types/requests'

function text(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

// תלמיד מפרסם בקשת לימוד
export async function createRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'צריך להתחבר' }
  if (user.role !== 'student') return { error: 'רק תלמידים יכולים לפרסם בקשות לימוד' }

  const subjectId = Number(text(formData, 'subject_id'))
  const level = text(formData, 'level')
  const citiesInput = [...new Set(formData.getAll('cities').map((v) => String(v).trim()).filter(Boolean))]
  const inPerson = formData.get('in_person_ok') === 'on'
  const online = formData.get('online_ok') === 'on'
  const budgetRaw = text(formData, 'budget_max')
  const budget = budgetRaw ? Number(budgetRaw) : null
  const description = text(formData, 'description')

  if (!Number.isInteger(subjectId) || subjectId <= 0) return { error: 'נא לבחור מקצוע' }
  if (!inPerson && !online) return { error: 'נא לבחור לפחות סוג שיעור אחד: פרונטלי או אונליין' }
  if (budget !== null && !(budget > 0 && budget < 10000)) return { error: 'תקציב לשעה צריך להיות בין 1 ל-9999' }
  if (description.length < 10) return { error: 'נא לתאר את הבקשה בכמה מילים (לפחות 10 תווים)' }
  if (description.length > 1000) return { error: 'התיאור ארוך מדי (עד 1000 תווים)' }
  if (level.length > 100) return { error: 'הרמה ארוכה מדי' }

  const supabase = await createClient()

  // ערים: רק מרשימת היישובים. הראשונה נשמרת כעיר הראשית, השאר כערים נוספות
  let cities: string[] = []
  if (inPerson && citiesInput.length) {
    if (citiesInput.length > MAX_REQUEST_CITIES) return { error: `אפשר לבחור עד ${MAX_REQUEST_CITIES} ערים` }
    const { data: locs } = await supabase.from('localities').select('name').in('name', citiesInput)
    const valid = new Set((locs ?? []).map((l) => l.name as string))
    const invalid = citiesInput.find((c) => !valid.has(c))
    if (invalid) return { error: `העיר "${invalid}" לא נמצאה. בחרו ערים מהרשימה.` }
    cities = citiesInput
  }
  if (inPerson && cities.length === 0) return { error: 'לשיעורים פרונטליים צריך לבחור לפחות עיר אחת' }

  const { error } = await supabase.from('lesson_requests').insert({
    student_id: user.id,
    subject_id: subjectId,
    level: level || null,
    city: cities[0] ?? null,
    extra_cities: cities.slice(1),
    in_person_ok: inPerson,
    online_ok: online,
    budget_max: budget,
    description,
  })

  if (error) {
    if (error.message.includes('too many open requests'))
      return { error: 'אפשר להחזיק עד 3 בקשות פתוחות. סגרו בקשה קיימת כדי לפרסם חדשה.' }
    console.error('createRequest', error.message)
    return { error: 'פרסום הבקשה נכשל. נסו שוב.' }
  }

  revalidatePath('/requests/mine')
  redirect('/requests/mine?created=1')
}

// תלמיד סוגר בקשה (אין יותר הצעות חדשות)
export async function closeRequest(formData: FormData) {
  const id = String(formData.get('request_id') ?? '')
  const supabase = await createClient()
  await supabase.from('lesson_requests').update({ status: 'closed' }).eq('id', id)
  revalidatePath('/requests/mine')
}

// מורה שולח הצעה על בקשה → נפתחת שיחה
export async function sendOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'teacher') return { error: 'רק מורים יכולים לשלוח הצעות' }

  const requestId = String(formData.get('request_id') ?? '')
  const body = text(formData, 'body')
  if (!body) return { error: 'נא לכתוב הודעה' }
  if (body.length > 2000) return { error: 'ההודעה ארוכה מדי (עד 2000 תווים)' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('send_request_offer', { p_request: requestId, p_body: body })

  if (error) {
    const m = error.message
    if (m.includes('teacher profile incomplete'))
      return { error: 'כדי לשלוח הצעות צריך פרופיל פעיל עם מחיר לשעה. השלימו אותו ב"האזור שלי".' }
    if (m.includes('already offered')) return { error: 'כבר שלחת הצעה על הבקשה הזו' }
    if (m.includes('request full')) return { error: 'הבקשה כבר קיבלה את מספר ההצעות המרבי' }
    if (m.includes('request closed')) return { error: 'הבקשה נסגרה' }
    if (m.includes('rate limit')) return { error: 'הגעת למגבלת השיחות החדשות להיום. נסו שוב מחר.' }
    console.error('sendOffer', m)
    return { error: 'שליחת ההצעה נכשלה. נסו שוב.' }
  }

  redirect(`/messages/${data as string}`)
}
