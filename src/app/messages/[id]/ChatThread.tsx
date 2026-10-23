'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/types/chat'
import { UNREAD_CHANGED_EVENT } from '@/components/UnreadBadge'

type Props = {
  conversationId: string
  userId: string
  otherName: string
  initialMessages: ChatMessage[]
}

const timeFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long' })

export function ChatThread({ conversationId, userId, otherName, initialMessages }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const tempId = useRef(-1)

  const markRead = useCallback(async () => {
    await supabase.rpc('mark_conversation_read', { p_conversation: conversationId })
    window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT)) // עדכון המונה בכותרת
  }, [supabase, conversationId])

  // הוספה/עדכון הודעה בלי כפילויות
  const upsert = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id)
      if (i === -1) return [...prev, m]
      const next = prev.slice()
      next[i] = { ...prev[i], ...m }
      return next
    })
  }, [])

  // Realtime: הודעות חדשות + אישורי קריאה
  useEffect(() => {
    let cancelled = false
    const channel = supabase.channel(`conversation:${conversationId}`)

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return

      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            const m = payload.new as ChatMessage
            upsert(m)
            if (m.sender_id !== userId) markRead()
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => upsert(payload.new as ChatMessage)
        )
        .subscribe((status, err) => {
          // אם Realtime לא זמין, הבדיקה התקופתית (polling) למטה ממשיכה להביא הודעות
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
            console.warn('[chat] realtime:', status, err?.message ?? '')
        })
    })()

    // סימון כנקרא בכניסה לשיחה (המונה בכותרת מתעדכן דרך האירוע)
    markRead()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, conversationId, userId, upsert, markRead])

  // גיבוי ל-Realtime: בדיקת הודעות חדשות ואישורי קריאה כל 5 שניות כשהטאב פתוח
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at, read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!data) return
      let incomingUnread = false
      for (const m of data as ChatMessage[]) {
        upsert(m)
        if (m.sender_id !== userId && !m.read_at) incomingUnread = true
      }
      if (incomingUnread) markRead()
    }, 5000)
    return () => clearInterval(timer)
  }, [supabase, conversationId, userId, upsert, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function send() {
    const body = text.trim()
    if (!body) return
    if (body.length > 2000) return setError('ההודעה ארוכה מדי (עד 2000 תווים)')
    setError(null)
    setText('')

    const temp: ChatMessage = {
      id: tempId.current--,
      sender_id: userId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    }
    setMessages((prev) => [...prev, temp])

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body })
      .select('id, sender_id, body, created_at, read_at')
      .single()

    if (error || !data) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)))
      setError(
        error?.message.includes('rate limit')
          ? 'שלחתם הרבה הודעות בזמן קצר. חכו דקה ונסו שוב.'
          : 'ההודעה לא נשלחה. בדקו את החיבור ונסו שוב.'
      )
      setText(body)
      return
    }

    // ייתכן שההודעה כבר הגיעה דרך Realtime — מחליפים את הזמנית בלי לשכפל
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== temp.id)
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data as ChatMessage]
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id
  )

  return (
    <div className="flex h-[calc(100vh-15rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-4">
        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">
            זו תחילת השיחה עם {otherName}. כתבו מה אתם מחפשים: מקצוע, רמה, ימים ושעות שנוחים לכם.
          </p>
        )}
        {sorted.map((m, i) => {
          const mine = m.sender_id === userId
          const day = dayFmt.format(new Date(m.created_at))
          const prevDay = i > 0 ? dayFmt.format(new Date(sorted[i - 1].created_at)) : null
          return (
            <div key={m.id}>
              {day !== prevDay && (
                <div className="my-3 text-center text-xs text-gray-500">
                  <span className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-100">{day}</span>
                </div>
              )}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    mine ? 'rounded-se-sm bg-indigo-600 text-white' : 'rounded-ss-sm bg-white text-gray-900 ring-1 ring-gray-100'
                  } ${m.failed ? 'opacity-60' : ''}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <div className={`mt-0.5 flex items-center gap-1 text-[11px] ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                    <span>{timeFmt.format(new Date(m.created_at))}</span>
                    {mine && (
                      <span aria-label={m.read_at ? 'נקראה' : 'נשלחה'}>
                        {m.failed ? '⚠ לא נשלחה' : m.pending ? '…' : m.read_at ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={2000}
            placeholder="כתבו הודעה…"
            aria-label="הודעה"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim()}
            className="h-11 rounded-xl bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            שליחה
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">Enter לשליחה · Shift+Enter לשורה חדשה</p>
      </div>
    </div>
  )
}
