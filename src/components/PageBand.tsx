import { HeroDoodles } from './HeroDoodles'

// רקע איורי הקו בראש כל הדפים (כולל דף הבית).
// בלי hooks — כך שהוא לא חוסם prerender של אף דף.
export function PageBand() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden bg-gradient-to-b from-indigo-50 to-gray-50 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
    >
      <HeroDoodles />
    </div>
  )
}
