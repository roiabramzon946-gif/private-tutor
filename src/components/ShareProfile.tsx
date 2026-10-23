'use client'

import { useState, useSyncExternalStore } from 'react'

// שיתוף פרופיל המורה: וואטסאפ, העתקת קישור, ושיתוף מהטלפון (תפריט השיתוף של המכשיר)
const noop = () => () => {}

export function ShareProfile({ teacherId, subjects }: { teacherId: string; subjects: string[] }) {
  const [copied, setCopied] = useState(false)
  // בשרת אין navigator: שם false, ובדפדפן בודקים אם יש תפריט שיתוף (בעיקר בטלפון)
  const canShare = useSyncExternalStore(
    noop,
    () => typeof navigator.share === 'function',
    () => false
  )

  const url = () => `${window.location.origin}/teachers/${teacherId}`
  const message = () => {
    const what = subjects.length ? `שיעורים פרטיים ב${subjects.slice(0, 3).join(', ')}` : 'שיעורים פרטיים'
    return `${what} — הפרופיל שלי ב-TutorIL: ${url()}`
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('העתיקו את הקישור:', url())
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'הפרופיל שלי ב-TutorIL', text: message(), url: url() })
    } catch {
      // המשתמש סגר את תפריט השיתוף
    }
  }

  const btn = 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium'

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h2 className="text-lg font-bold">שתפו את הפרופיל שלכם</h2>
      <p className="mt-1 text-sm text-gray-600">
        שלחו את הקישור לחברים, לקבוצות וואטסאפ או לסטורי. כל מי שנכנס דרכו מגיע ישר לפרופיל שלכם.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message())}`, '_blank', 'noopener')}
          className={`${btn} bg-green-600 text-white hover:bg-green-700`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          שיתוף בוואטסאפ
        </button>
        <button type="button" onClick={copy} className={`${btn} bg-white ring-1 ring-gray-300 hover:bg-gray-50`}>
          {copied ? '✓ הקישור הועתק' : 'העתקת קישור'}
        </button>
        {canShare && (
          <button type="button" onClick={nativeShare} className={`${btn} bg-white ring-1 ring-gray-300 hover:bg-gray-50`}>
            שיתוף…
          </button>
        )}
      </div>
    </section>
  )
}
