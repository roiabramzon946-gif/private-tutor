'use client'

import { useState, useTransition } from 'react'
import { setSubscriptionCancel } from './subscription-actions'
import { FormMessage } from '@/components/FormMessage'
import { PREMIUM_PRICE_ILS } from '@/lib/plans'
import type { FormState } from '@/types/db'

type Props = {
  premium: { periodEnd: string; cancelAtPeriodEnd: boolean } | null
  rating: { avg: number; count: number }
}

const dateFmt = new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' })

export function SubscriptionCard({ premium, rating }: Props) {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<FormState>({})
  const [confirming, setConfirming] = useState(false)

  function run(cancel: boolean) {
    setConfirming(false)
    startTransition(async () => setState(await setSubscriptionCancel(cancel)))
  }

  const end = premium ? dateFmt.format(new Date(premium.periodEnd)) : ''

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:w-80">
      <h2 className="mb-2 text-lg font-bold">המנוי שלי</h2>

      {!premium && (
        <>
          <p className="text-2xl font-bold text-gray-800">חינמי</p>
          <p className="mt-1 text-sm text-gray-600">
            פרימיום מקפיץ את הפרופיל לראש תוצאות החיפוש, עם כרטיס מודגש בצבע.
          </p>
        </>
      )}

      {premium && !premium.cancelAtPeriodEnd && (
        <>
          <p className="text-2xl font-bold text-amber-700">★ פרימיום</p>
          <p className="mt-1 text-sm text-gray-600">
            ₪{PREMIUM_PRICE_ILS} לחודש · מתחדש ב-{end}
          </p>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              ביטול המנוי
            </button>
          ) : (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                המנוי יישאר פעיל עד {end}, לא יתחדש, ואז תעבור/י למנוי חינמי. לבטל?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => run(true)}
                  disabled={pending}
                  className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {pending ? 'רגע…' : 'כן, לבטל'}
                </button>
                <button onClick={() => setConfirming(false)} className="rounded-md px-3 py-1.5 hover:bg-amber-100">
                  חזרה
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {premium && premium.cancelAtPeriodEnd && (
        <>
          <p className="text-2xl font-bold text-amber-700">★ פרימיום</p>
          <p className="mt-1 text-sm text-gray-600">
            המנוי בוטל ויסתיים ב-{end}. לאחר מכן הפרופיל יעבור למנוי חינמי, ולא יבוצעו חיובים נוספים.
          </p>
          <button
            onClick={() => run(false)}
            disabled={pending}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'רגע…' : 'חידוש המנוי'}
          </button>
        </>
      )}

      <div className="mt-3">
        <FormMessage state={state} />
      </div>

      <p className="mt-3 text-sm text-gray-600">
        ★ {Number(rating.avg).toFixed(1)} · {rating.count} ביקורות
      </p>
    </section>
  )
}
