import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { daysAgo, offersLabel } from '@/lib/dates'
import { MAX_OFFERS_PER_REQUEST, REQUEST_DAYS_OPEN } from '@/types/requests'
import { closeRequest } from '../actions'

type SP = Record<string, string | string[] | undefined>
type Props = { searchParams: Promise<SP> }

type MyRequest = {
  id: string
  level: string | null
  city: string | null
  in_person_ok: boolean
  online_ok: boolean
  budget_max: number | null
  description: string
  status: 'open' | 'closed'
  offers_count: number
  created_at: string
  subjects: { name: string } | null
}

export default function MyRequestsPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">הבקשות שלי</h1>
        <Link href="/requests/new" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
          בקשה חדשה
        </Link>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function List({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) redirect('/login?next=/requests/mine')
  if (user.role === 'teacher') redirect('/requests')

  const supabase = await createClient()
  const { data } = await supabase
    .from('lesson_requests')
    .select('id, level, city, in_person_ok, online_ok, budget_max, description, status, offers_count, created_at, subjects ( name )')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  const requests = (data ?? []) as unknown as MyRequest[]
  const now = new Date()
  const expired = (r: MyRequest) => now.getTime() - new Date(r.created_at).getTime() > REQUEST_DAYS_OPEN * 86_400_000

  return (
    <>
      {sp.created === '1' && (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          הבקשה פורסמה. כשמורים ישלחו הצעות, הן יופיעו ב
          <Link href="/messages" className="font-medium underline">הודעות</Link>.
        </p>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-gray-600 ring-1 ring-gray-100">
          עוד לא פרסמת בקשות. פרסמו בקשה, ומורים יפנו אליכם.
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => {
            const open = r.status === 'open' && !expired(r)
            return (
              <li key={r.id} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 ${open ? '' : 'opacity-70'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {r.subjects?.name}
                    {r.level && <span className="font-normal text-gray-600"> · {r.level}</span>}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {open ? 'פתוחה' : r.status === 'closed' ? 'סגורה' : 'פג תוקף'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {[r.in_person_ok && `פרונטלי ב${r.city}`, r.online_ok && 'אונליין'].filter(Boolean).join(' או ')}
                  {r.budget_max != null && <> · עד ₪{Number(r.budget_max)} לשעה</>}
                  {' · '}פורסמה {daysAgo(r.created_at, now)}
                </p>
                <p className="mt-2 whitespace-pre-line text-gray-800">{r.description}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-gray-700">
                    {r.offers_count > 0 ? (
                      <Link href="/messages" className="font-medium text-indigo-700 hover:underline">
                        {offersLabel(r.offers_count)} · לקריאה בהודעות
                      </Link>
                    ) : (
                      'עדיין אין הצעות'
                    )}
                    <span className="text-xs text-gray-500"> (עד {MAX_OFFERS_PER_REQUEST})</span>
                  </span>
                  {r.status === 'open' && (
                    <form action={closeRequest}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <button className="rounded-lg px-3 py-1.5 text-sm text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50">
                        סגירת הבקשה
                      </button>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
