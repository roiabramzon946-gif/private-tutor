'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Item = { href: string; label: string }

// תפריט ☰ לטלפונים: נפתח ונסגר בלחיצה, נסגר בבחירת קישור או בלחיצה מחוץ לתפריט
export function MobileMenu({ items, logout }: { items: Item[]; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'סגירת התפריט' : 'פתיחת התפריט'}
        className="flex size-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-gray-100"
      >
        {open ? '✕' : '☰'}
      </button>
      {open && (
        <div className="absolute end-0 top-11 z-50 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-gray-800 hover:bg-gray-50"
            >
              {it.label}
            </Link>
          ))}
          <form action={logout} className="border-t border-gray-100">
            <button className="block w-full px-4 py-2.5 text-start text-gray-500 hover:bg-gray-50">התנתקות</button>
          </form>
        </div>
      )}
    </div>
  )
}
