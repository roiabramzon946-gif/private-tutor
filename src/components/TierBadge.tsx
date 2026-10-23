import type { SubscriptionTier } from '@/types/db'

// רק מנוי פרימיום מסומן. הסימון הוא "פרימיום" (ולא "מומלץ"), כדי שיהיה ברור שזה קידום בתשלום.
export function TierBadge({ tier }: { tier: SubscriptionTier }) {
  if (tier !== 'premium') return null
  return (
    <span
      title="מורה עם מנוי קידום בתשלום"
      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
    >
      ★ פרימיום
    </span>
  )
}
