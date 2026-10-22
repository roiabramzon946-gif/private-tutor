import Link from 'next/link'
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { Avatar } from '@/components/Avatar'
import type { ChatMessage } from '@/types/chat'
import { ChatThread } from './ChatThread'

type Props = { params: Promise<{ id: string }> }

export default function ConversationPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-white" />}>
        <Conversation params={params} />
      </Suspense>
    </main>
  )
}

async function Conversation({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/messages/${id}`)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  // RLS מחזירה את השיחה רק למשתתפים בה
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, student_id, teacher_id')
    .eq('id', id)
    .maybeSingle()
  if (!conversation) notFound()

  const otherId = conversation.student_id === user.id ? conversation.teacher_id : conversation.student_id
  const otherIsTeacher = otherId === conversation.teacher_id

  const [{ data: other }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).single(),
    supabase
      .from('messages')
      .select('id, sender_id, body, created_at, read_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(300),
  ])

  const messages = ((rows ?? []) as ChatMessage[]).reverse()
  const otherName = other?.full_name ?? ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="חזרה להודעות">
          →
        </Link>
        <Avatar url={other?.avatar_url ?? null} name={otherName} size={44} />
        <div className="flex-1">
          <h1 className="text-lg font-bold">{otherName}</h1>
          {otherIsTeacher && (
            <Link href={`/teachers/${otherId}`} className="text-sm text-indigo-700 hover:underline">
              לפרופיל המורה
            </Link>
          )}
        </div>
      </div>

      <ChatThread conversationId={id} userId={user.id} otherName={otherName} initialMessages={messages} />
    </div>
  )
}
