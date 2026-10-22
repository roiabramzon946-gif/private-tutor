'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const UNREAD_CHANGED_EVENT = 'unread-changed'

// קישור "הודעות" עם מונה הודעות שלא נקראו, שמתעדכן לבד:
// Realtime על טבלת messages + מעבר בין דפים + חזרה לטאב + בדיקה כל 15 שניות
export function UnreadBadge({ initial }: { initial: number }) {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const [count, setCount] = useState(initial)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('unread_messages_count')
    if (!error) setCount(Number(data ?? 0))
  }, [supabase])

  // רענון בכל מעבר דף
  useEffect(() => {
    let active = true
    supabase.rpc('unread_messages_count').then(({ data, error }) => {
      if (active && !error) setCount(Number(data ?? 0))
    })
    return () => {
      active = false
    }
  }, [pathname, supabase])

  useEffect(() => {
    const onChange = () => refresh()
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    const timer = setInterval(() => {
      if (!document.hidden) refresh()
    }, 15000)

    window.addEventListener(UNREAD_CHANGED_EVENT, onChange)
    document.addEventListener('visibilitychange', onVisible)

    // RLS דואגת שנקבל אירועים רק על הודעות בשיחות שלנו
    let cancelled = false
    const channel = supabase.channel('unread-badge')
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, onChange)
        .subscribe()
    })()

    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener(UNREAD_CHANGED_EVENT, onChange)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [supabase, refresh])

  return (
    <Link href="/messages" className="flex items-center gap-1 text-gray-700 hover:text-indigo-700">
      הודעות
      {count > 0 && (
        <span
          aria-label={`${count} הודעות שלא נקראו`}
          className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
