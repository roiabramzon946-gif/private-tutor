'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

// פותח (או ממשיך) שיחה בין התלמיד המחובר למורה, ומעביר אליה
export async function startConversation(formData: FormData) {
  const teacherId = String(formData.get('teacher_id') ?? '')
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/teachers/${teacherId}`)
  if (user.role !== 'student' || !/^[0-9a-f-]{36}$/i.test(teacherId)) redirect(`/teachers/${teacherId}`)

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('student_id', user.id)
    .eq('teacher_id', teacherId)
    .maybeSingle()

  let id = existing?.id as string | undefined
  if (!id) {
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ student_id: user.id, teacher_id: teacherId })
      .select('id')
      .single()
    if (error || !created) redirect(`/teachers/${teacherId}?chat_error=1`)
    id = created.id as string
  }

  redirect(`/messages/${id}`)
}
