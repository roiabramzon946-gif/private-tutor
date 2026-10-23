import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getSubjects } from '@/lib/data'
import { groupSubjects } from '@/lib/subjects'
import { daysAgo } from '@/lib/dates'
import { inputClass } from '@/components/fields'
import { REGIONS } from '@/types/db'
import { MAX_OFFERS_PER_REQUEST, type OpenRequest } from '@/types/requests'
import { OfferForm } from './OfferForm'

export const metadata: Metadata = { title: 'בקשות לימוד' }

type SP = Record<string, string | string[] | undefined>
type Props = { searchParams: Promise<SP> }

export default function RequestsBoardPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">בקשות לימוד</h1>
      <p className="mt-1 mb-5 text-gray-600">
        תלמידים שמחפשים מורה. שלחו הצעה, והיא תפתח שיחה בצ&apos;אט.
      </p>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Board({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()])
  if (!user) redirect('/login?next=/requests')
  if (user.role !== 'teacher') redirect('/requests/mine')

  const get = (k: string) => (typeof sp[k] === 'string' && (sp[k] as string).trim()) || undefined
  const subject = get('subject')
  const regionRaw = get('region')
  const region = regionRaw && (REGIONS as readonly string[]).includes(regionRaw) ? regionRaw : undefined
  // ברירת מחדל: רק המקצועות שלי (אם הטופס נשלח בלי הסימון — כל המקצועות)
  const onlyMine = sp.all !== '1'

  const supabase = await createClient()
  const [subjects, { data, error }, { data: me }] = await Promise.all([
    getSubjects(),
    supabase.rpc('list_open_requests', {
      p_subject_slug: subject ?? null,
      p_only_my_subjects: onlyMine,
      p_region: region ?? null,
      p_limit: 30,
    }),
    supabase.from('teachers').select('hourly_rate, is_active').eq('id', user.id).maybeSingle(),
  ])

  const requests = (data ?? []) as OpenRequest[]
  const total = Number(requests[0]?.total_count ?? 0)
  const profileReady = !!me?.is_active && me?.hourly_rate != null
  const now = new Date()

  return (
    <>
      {!profileReady && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          כדי לשלוח הצעות צריך פרופיל פעיל עם מחיר לשעה.{' '}
          <Link href="/dashboard" className="font-medium underline">
            להשלמת הפרופיל
          </Link>
        </div>
      )}

      <form action="/requests" className="mb-5 grid items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">מקצוע</label>
          <select id="subject" name="subject" defaultValue={subject ?? ''} className={inputClass}>
            <option value="">כל המקצועות</option>
            {groupSubjects(subjects).map((g) => (
              <optgroup key={g.category} label={g.category}>
                {g.subjects.map((s) => (
                  <option key={s.id} value={s.slug}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="region" className="mb-1 block text-sm font-medium text-gray-700">אזור</label>
          <select id="region" name="region" defaultValue={region ?? ''} className={inputClass}>
            <option value="">כל האזורים</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">סינון</button>
        <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-3">
          <input type="checkbox" name="all" value="1" defaultChecked={!onlyMine} className="size-4 accent-indigo-600" />
          להציג גם בקשות במקצועות שאני לא מלמד/ת
        </label>
      </form>

      {error ? (
        <p className="text-red-600">שגיאה בטעינת הבקשות: {error.message}</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-gray-600 ring-1 ring-gray-100">
          {onlyMine
            ? 'אין כרגע בקשות פתוחות במקצועות שלך. אפשר לסמן "להציג גם בקשות במקצועות שאני לא מלמד/ת".'
            : 'אין כרגע בקשות פתוחות.'}
        </div>
      ) : (
        <>
          <p className="mb-3 text-gray-600">{total === 1 ? 'בקשה פתוחה אחת' : `${total} בקשות פתוחות`}</p>
          <ul className="space-y-4">
            {requests.map((r) => {
              const cityList = [r.city, ...(r.extra_cities ?? [])].filter(Boolean).join(', ')
              const modes = [r.in_person_ok && `פרונטלי ב${cityList}`, r.online_ok && 'אונליין'].filter(Boolean).join(' או ')
              return (
                <li key={r.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      {r.subject_name}
                      {r.level && <span className="font-normal text-gray-600"> · {r.level}</span>}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {r.student_first} · {daysAgo(r.created_at, now)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {modes}
                    {r.budget_max != null && <> · עד ₪{Number(r.budget_max)} לשעה</>}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-gray-800">{r.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">
                      {r.offers_count} מתוך {MAX_OFFERS_PER_REQUEST} הצעות
                    </span>
                    {r.already_offered ? (
                      <Link href="/messages" className="text-sm font-medium text-green-700 hover:underline">
                        ✓ שלחת הצעה · להודעות
                      </Link>
                    ) : profileReady ? (
                      <OfferForm
                        requestId={r.id}
                        studentFirst={r.student_first}
                        subject={r.subject_name}
                        teacherName={user.fullName}
                      />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}
