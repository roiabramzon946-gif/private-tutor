'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

// פותח (או ממשיך) שיחה עם מורה ומעביר אליה.
// תלמיד → מורה, או מורה → מורה אחר.
export async function startConversation(formData: FormData) {
  const teacherId = String(formData.get('teacher_id') ?? '')
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/teachers/${teacherId}`)
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || teacherId === user.id) redirect(`/teachers/${teacherId}`)

  const supabase = await createClient()

  // שיחה קיימת, בכל כיוון (במורה-מורה ייתכן שהצד השני פתח אותה)
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(
      `and(student_id.eq.${user.id},teacher_id.eq.${teacherId}),and(student_id.eq.${teacherId},teacher_id.eq.${user.id})`
    )
    .limit(1)
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
