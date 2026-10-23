import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { Avatar } from '@/components/Avatar'
import type { ConversationSummary } from '@/types/chat'

export const metadata: Metadata = { title: 'הודעות' }

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">הודעות</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}>
        <ConversationList />
      </Suspense>
    </main>
  )
}

const timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' })

function formatWhen(iso: string, now: Date) {
  const d = new Date(iso)
  return d.toDateString() === now.toDateString() ? timeFmt.format(d) : dayFmt.format(d)
}

async function ConversationList() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/messages')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('my_conversations')
  if (error) return <p className="text-red-600">שגיאה בטעינת ההודעות: {error.message}</p>

  const conversations = (data ?? []) as ConversationSummary[]
  const now = new Date()

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-gray-100">
        <p className="text-gray-600">
          {user.role === 'student'
            ? 'עדיין לא פנית לאף מורה. בפרופיל של כל מורה יש כפתור "שליחת הודעה".'
            : 'עדיין אין הודעות מתלמידים. כשתלמיד ישלח לך הודעה, היא תופיע כאן.'}
        </p>
        {user.role === 'student' && (
          <Link href="/search" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-white">
            לחיפוש מורים
          </Link>
        )}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      {conversations.map((c) => {
        const unread = Number(c.unread_count)
        return (
          <li key={c.conversation_id}>
            <Link
              href={`/messages/${c.conversation_id}`}
              className={`flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50 ${unread ? 'bg-indigo-50/50' : ''}`}
            >
              <Avatar url={c.other_avatar} name={c.other_name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{c.other_name}</span>
                  <span className="shrink-0 text-xs text-gray-500">{formatWhen(c.last_message_at, now)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${unread ? 'text-gray-900' : 'text-gray-500'}`}>
                    {c.last_message
                      ? `${c.last_sender_id === user.id ? 'את/ה: ' : ''}${c.last_message}`
                      : 'אין הודעות עדיין'}
                  </p>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
