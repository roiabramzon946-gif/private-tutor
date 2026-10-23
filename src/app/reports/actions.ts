'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { FormState } from '@/types/db'

const REASONS = ['harassment', 'spam', 'fake_profile', 'inappropriate', 'other'] as const
const UUID = /^[0-9a-f-]{36}$/i

export async function reportUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'צריך להתחבר כדי לדווח' }

  const reportedUserId = String(formData.get('reported_user_id') ?? '')
  const conversationId = String(formData.get('conversation_id') ?? '')
  const reason = String(formData.get('reason') ?? '')
  const details = String(formData.get('details') ?? '').trim()

  if (!UUID.test(reportedUserId) || reportedUserId === user.id) return { error: 'דיווח לא תקין' }
  if (!(REASONS as readonly string[]).includes(reason)) return { error: 'נא לבחור סיבה' }
  if (details.length > 1000) return { error: 'הפירוט ארוך מדי (עד 1000 תווים)' }

  const supabase = await createClient()
  const { error } = await supabase.from('reports').insert({
    reported_user_id: reportedUserId,
    conversation_id: UUID.test(conversationId) ? conversationId : null,
    reason,
    details: details || null,
  })
  if (error) {
    if (error.message.includes('יותר מדי')) return { error: 'יותר מדי דיווחים היום. נסו שוב מחר.' }
    return { error: 'שליחת הדיווח נכשלה. נסו שוב.' }
  }

  return { ok: true, message: 'תודה, הדיווח התקבל ונבדוק אותו בהקדם.' }
}
