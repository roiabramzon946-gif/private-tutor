'use client'

import { usePathname } from 'next/navigation'
import { HeroDoodles } from './HeroDoodles'

// פס עליון עם איורי קו בכל הדפים (בדף הבית יש רקע משלו)
export function PageBand() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden bg-gradient-to-b from-indigo-50 to-gray-50 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
    >
      <HeroDoodles className="opacity-30 sm:opacity-70" />
    </div>
  )
}
