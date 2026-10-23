'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { FormState } from '@/types/db'
import { reviewBlockedMessage } from '@/lib/reviews'

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'צריך להתחבר כדי לכתוב ביקורת' }
  if (user.role !== 'student') return { error: 'רק תלמידים יכולים לכתוב ביקורות' }

  const teacherId = String(formData.get('teacher_id') ?? '')
  const rating = Number(formData.get('rating'))
  const comment = String(formData.get('comment') ?? '').trim()

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'נא לבחור דירוג בין 1 ל-5' }
  if (comment.length > 2000) return { error: 'הביקורת ארוכה מדי (עד 2000 תווים)' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (!existing) {
    const { data: reason } = await supabase.rpc('review_eligibility', { p_teacher: teacherId })
    if (reason) return { error: reviewBlockedMessage(reason as string) }
  }

  const { error } = existing
    ? await supabase
        .from('reviews')
        .update({ rating, comment: comment || null })
        .eq('id', existing.id)
    : await supabase
        .from('reviews')
        .insert({ teacher_id: teacherId, student_id: user.id, rating, comment: comment || null })

  if (error) {
    console.error('submitReview', error.message)
    return { error: 'שמירת הביקורת נכשלה. נסו שוב.' }
  }

  revalidatePath(`/teachers/${teacherId}`)
  return { ok: true, message: existing ? 'הביקורת עודכנה. תודה!' : 'הביקורת נשמרה. תודה!' }
}
