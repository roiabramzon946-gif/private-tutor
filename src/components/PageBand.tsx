'use client'

import { usePathname } from 'next/navigation'
import { HeroDoodles } from './HeroDoodles'

// אותו רקע איורים כמו בדף הבית, בראש כל שאר הדפים
export function PageBand() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden bg-gradient-to-b from-indigo-50 to-gray-50 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
    >
      <HeroDoodles />
    </div>
  )
}
