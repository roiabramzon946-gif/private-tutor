import type { SubscriptionTier } from '@/types/db'

export function TierBadge({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'premium')
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        ★ פרימיום
      </span>
    )
  if (tier === 'pro')
    return (
      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
        מומלץ
      </span>
    )
  return null
}
