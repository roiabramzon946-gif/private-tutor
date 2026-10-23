'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import type { FormState } from '@/types/db'

// ביטול (או חידוש) בסוף התקופה: המנוי נשאר פעיל עד סוף החודש ששולם ואז לא מתחדש
export async function setSubscriptionCancel(cancel: boolean): Promise<FormState> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'teacher') return { error: 'אין הרשאה' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('set_my_subscription_cancel', { p_cancel: cancel })
  if (error) return { error: 'לא נמצא מנוי פעיל' }

  revalidatePath('/dashboard')
  return {
    ok: true,
    message: cancel ? 'המנוי בוטל. הוא יישאר פעיל עד סוף התקופה ששולמה.' : 'המנוי חודש וימשיך להתחדש כרגיל.',
  }
}
