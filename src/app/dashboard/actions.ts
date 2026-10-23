'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { FormState } from '@/types/db'
import { normalizePhone } from '@/lib/phone'

function text(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'teacher') return { error: 'אין הרשאה' }

  const fullName = text(formData, 'full_name')
  const bio = text(formData, 'bio')
  const cityInput = text(formData, 'city')
  const rateRaw = text(formData, 'hourly_rate')
  const yearsRaw = text(formData, 'years_experience')
  const teachesOnline = formData.get('teaches_online') === 'on'
  const teachesInPerson = formData.get('teaches_in_person') === 'on'
  const isActive = formData.get('is_active') === 'on'
  const phoneRaw = text(formData, 'phone')
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  const showPhone = formData.get('show_phone') === 'on'
  const emailNotifications = formData.get('email_notifications') === 'on'

  const hourlyRate = rateRaw ? Number(rateRaw) : null
  const years = yearsRaw ? Number(yearsRaw) : null

  if (fullName.length < 2) return { error: 'נא להזין שם מלא' }
  if (bio.length > 3000) return { error: 'התיאור ארוך מדי (עד 3000 תווים)' }
  if (hourlyRate !== null && !(hourlyRate > 0 && hourlyRate < 10000))
    return { error: 'מחיר לשעה צריך להיות בין 1 ל-9999' }
  if (years !== null && !(Number.isInteger(years) && years >= 0 && years <= 70))
    return { error: 'שנות ניסיון צריכות להיות מספר שלם בין 0 ל-70' }
  if (!teachesOnline && !teachesInPerson)
    return { error: 'צריך לבחור לפחות סוג שיעור אחד: פרונטלי או אונליין' }
  const supabase = await createClient()

  // העיר חייבת להיות מרשימת היישובים; האזור נקבע לפיה
  let city: string | null = null
  let region: string | null = null
  if (cityInput) {
    const { data: loc } = await supabase
      .from('localities')
      .select('name, region')
      .eq('name', cityInput)
      .maybeSingle()
    if (!loc) return { error: 'בחרו עיר מהרשימה (התחילו להקליד ובחרו מההצעות)' }
    city = loc.name
    region = loc.region
  }

  if (teachesInPerson && !city) return { error: 'לשיעורים פרונטליים צריך לבחור עיר' }

  // ערים נוספות: רק מרשימת היישובים, בלי כפילויות ובלי העיר הראשית
  const extraInput = [...new Set(formData.getAll('extra_cities').map((v) => String(v).trim()).filter(Boolean))]
    .filter((c) => c !== city)
  if (extraInput.length > 10) return { error: 'אפשר להוסיף עד 10 ערים נוספות' }
  let extraCities: string[] = []
  if (extraInput.length) {
    const { data: locs } = await supabase.from('localities').select('name').in('name', extraInput)
    const valid = new Set((locs ?? []).map((l) => l.name as string))
    const invalid = extraInput.filter((c) => !valid.has(c))
    if (invalid.length) return { error: `העיר "${invalid[0]}" לא נמצאה ברשימת היישובים` }
    extraCities = extraInput
  }
  if (phoneRaw && !phone) return { error: 'מספר הטלפון לא תקין. לדוגמה: 050-1234567' }
  if (showPhone && !phone) return { error: 'כדי להציג טלפון בפרופיל צריך למלא מספר' }

  const subjectIds = formData
    .getAll('subjects')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)
  if (profileError) return { error: `שמירה נכשלה: ${profileError.message}` }

  const { error: teacherError } = await supabase
    .from('teachers')
    .update({
      bio: bio || null,
      city,
      region,
      hourly_rate: hourlyRate,
      years_experience: years,
      teaches_online: teachesOnline,
      teaches_in_person: teachesInPerson,
      is_active: isActive,
    })
    .eq('id', user.id)
  if (teacherError) return { error: `שמירה נכשלה: ${teacherError.message}` }

  const { error: contactError } = await supabase
    .from('user_contacts')
    .update({ phone, show_phone: showPhone, email_notifications: emailNotifications })
    .eq('user_id', user.id)
  if (contactError) return { error: `שמירת הטלפון נכשלה: ${contactError.message}` }

  // סנכרון ערים נוספות
  const { error: citiesDelError } = await supabase.from('teacher_cities').delete().eq('teacher_id', user.id)
  if (citiesDelError) return { error: `שמירת הערים נכשלה: ${citiesDelError.message}` }
  if (extraCities.length) {
    const { error: citiesError } = await supabase
      .from('teacher_cities')
      .insert(extraCities.map((c) => ({ teacher_id: user.id, city: c })))
    if (citiesError) return { error: `שמירת הערים נכשלה: ${citiesError.message}` }
  }

  // סנכרון מקצועות: מוחקים את מה שהוסר, מוסיפים/מעדכנים את מה שנבחר
  const del = supabase.from('teacher_subjects').delete().eq('teacher_id', user.id)
  const { error: delError } = subjectIds.length
    ? await del.not('subject_id', 'in', `(${subjectIds.join(',')})`)
    : await del
  if (delError) return { error: `שמירת המקצועות נכשלה: ${delError.message}` }

  if (subjectIds.length) {
    const rows = subjectIds.map((id) => ({
      teacher_id: user.id,
      subject_id: id,
      levels: text(formData, `levels_${id}`)
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 10),
    }))
    const { error: upsertError } = await supabase
      .from('teacher_subjects')
      .upsert(rows, { onConflict: 'teacher_id,subject_id' })
    if (upsertError) return { error: `שמירת המקצועות נכשלה: ${upsertError.message}` }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/teachers/${user.id}`)
  return { ok: true, message: 'הפרופיל נשמר' }
}

// פרטים אישיים לתלמידים: שם וטלפון
export async function saveAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'צריך להתחבר' }

  const fullName = text(formData, 'full_name')
  const phoneRaw = text(formData, 'phone')
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null
  const emailNotifications = formData.get('email_notifications') === 'on'

  if (fullName.length < 2) return { error: 'נא להזין שם מלא' }
  if (phoneRaw && !phone) return { error: 'מספר הטלפון לא תקין. לדוגמה: 050-1234567' }

  const supabase = await createClient()
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id),
    supabase
      .from('user_contacts')
      .update({ phone, email_notifications: emailNotifications })
      .eq('user_id', user.id),
  ])
  if (e1 || e2) return { error: `שמירה נכשלה: ${(e1 ?? e2)!.message}` }

  revalidatePath('/dashboard')
  return { ok: true, message: 'הפרטים נשמרו' }
}
