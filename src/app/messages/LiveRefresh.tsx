'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// מרענן את רשימת השיחות כשמגיעה הודעה חדשה (Realtime), עם גיבוי:
// בדיקה כל 10 שניות ומיד בחזרה לטאב. RLS דואגת שנקבל אירועים רק על השיחות שלנו.
export function LiveRefresh() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    // כמה אירועים ברצף (הודעה + סימון כנקרא) → רענון אחד
    const refresh = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => router.refresh(), 300)
    }
    const onVisible = () => {
      if (!document.hidden) refresh()
    }

    let cancelled = false
    const channel = supabase.channel(`conversations-list:${crypto.randomUUID()}`)
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      if (cancelled) return
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, refresh)
        .subscribe()
    })()

    const timer = setInterval(() => {
      if (!document.hidden) router.refresh()
    }, 10000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return null
}
