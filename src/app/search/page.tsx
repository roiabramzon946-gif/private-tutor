import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getLocalities, getSubjects, resolveLocality } from '@/lib/data'
import { REGIONS } from '@/types/db'
import { SearchFilters, type SearchValues } from '@/components/SearchFilters'
import { TeacherCard } from '@/components/TeacherCard'
import type { TeacherSearchResult } from '@/types/search'
import { isLevel, isSlot } from '@/lib/levels'

export const metadata: Metadata = { title: 'חיפוש מורים פרטיים', description: 'חיפוש מורה פרטי לפי מקצוע, עיר, מחיר ושיעורים אונליין: מתמטיקה, אנגלית, פסיכומטרי, מקצועות אקדמיים ועוד.' }

const PAGE_SIZE = 10

type SP = Record<string, string | string[] | undefined>
type Props = { searchParams: Promise<SP> }

export default function SearchPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-5 text-3xl font-bold">חיפוש מורים</h1>
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

function parse(sp: SP) {
  const get = (k: string) => {
    const v = sp[k]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const num = (k: string) => {
    const n = Number(get(k))
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  // אם אין פרמטר online בכלל (כניסה ראשונה) — ברירת מחדל: לכלול אונליין
  const online = sp.online === undefined ? !get('subject') && !get('city') && !get('region') : get('online') === '1'
  const region = get('region')
  return {
    subject: get('subject'),
    city: get('city'),
    region: region && (REGIONS as readonly string[]).includes(region) ? region : undefined,
    online,
    min: num('min'),
    max: num('max'),
    level: isLevel(get('level')) ? get('level') : undefined,
    day: (() => {
      const d = Number(get('day'))
      return get('day') !== undefined && Number.isInteger(d) && d >= 0 && d <= 6 ? d : undefined
    })(),
    slot: isSlot(get('slot')) ? get('slot') : undefined,
    page: Math.max(1, Math.floor(num('page') ?? 1)),
  }
}

async function SearchContent({ searchParams }: Props) {
  const sp = await searchParams
  const parsed = parse(sp)

  const supabase = await createClient()
  const [subjects, localities] = await Promise.all([getSubjects(), getLocalities()])

  // "תל אביב" → "תל אביב - יפו"; עיר לא מוכרת נשארת כמו שהוקלדה (ולא תחזיר תוצאות)
  const q = { ...parsed, city: resolveLocality(parsed.city, localities)?.name ?? parsed.city }

  const [{ data, error }] = await Promise.all([
    supabase.rpc('search_teachers', {
      p_subject_slug: q.subject ?? null,
      p_city: q.city ?? null,
      p_region: q.city ? null : (q.region ?? null),
      p_include_online: q.online,
      p_min_price: q.min ?? null,
      p_max_price: q.max ?? null,
      p_level: q.level ?? null,
      p_day: q.day ?? null,
      p_slot: q.slot ?? null,
      p_limit: PAGE_SIZE,
      p_offset: (q.page - 1) * PAGE_SIZE,
    }),
  ])

  const teachers = (data ?? []) as TeacherSearchResult[]
  const total = Number(teachers[0]?.total_count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const subjectName = subjects.find((s) => s.slug === q.subject)?.name

  const values: SearchValues = { ...q }

  const pageHref = (page: number) => {
    const params = new URLSearchParams()
    if (q.subject) params.set('subject', q.subject)
    if (q.city) params.set('city', q.city)
    if (q.region) params.set('region', q.region)
    if (q.online) params.set('online', '1')
    if (q.min) params.set('min', String(q.min))
    if (q.max) params.set('max', String(q.max))
    if (q.level) params.set('level', q.level)
    if (q.day !== undefined) params.set('day', String(q.day))
    if (q.slot) params.set('slot', q.slot)
    if (page > 1) params.set('page', String(page))
    return `/search?${params}`
  }

  return (
    <>
      <SearchFilters subjects={subjects} localities={localities} values={values} />

      <div className="mt-6 mb-4 text-gray-600">
        {error ? (
          <span className="text-red-600">החיפוש נכשל. נסו לרענן את הדף.</span>
        ) : (
          <>
            נמצאו <strong className="text-gray-900">{total}</strong> מורים
            {subjectName && <> ל{subjectName}</>}
            {q.level && <> ברמת {q.level}</>}
            {q.city && <> ב{q.city}</>}
            {!q.city && q.region && <> באזור {q.region}</>}
            {(q.city || q.region) && q.online && <> (כולל אונליין)</>}
            {teachers.some((t) => t.tier === 'premium') && (
              <span className="mt-1 block text-xs text-gray-500">מורים עם מנוי פרימיום מוצגים ראשונים ובהדגשה.</span>
            )}
          </>
        )}
      </div>

      {teachers.length === 0 && !error ? (
        <div className="rounded-2xl bg-white p-10 text-center text-gray-600 ring-1 ring-gray-100">
          לא נמצאו מורים שמתאימים לחיפוש. נסו להרחיב את הסינון או לכלול מורים אונליין, או{' '}
          <Link href="/requests/new" className="font-medium text-indigo-700 hover:underline">
            פרסמו בקשת לימוד
          </Link>{' '}
          ומורים יפנו אליכם.
        </div>
      ) : (
        <ul className="space-y-4">
          {teachers.map((t) => (
            <li key={t.teacher_id}>
              <TeacherCard t={t} />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="עימוד">
          {q.page > 1 && (
            <Link href={pageHref(q.page - 1)} className="rounded-lg bg-white px-4 py-2 ring-1 ring-gray-200 hover:bg-gray-50">
              הקודם
            </Link>
          )}
          <span className="px-3 text-sm text-gray-600">
            עמוד {q.page} מתוך {totalPages}
          </span>
          {q.page < totalPages && (
            <Link href={pageHref(q.page + 1)} className="rounded-lg bg-white px-4 py-2 ring-1 ring-gray-200 hover:bg-gray-50">
              הבא
            </Link>
          )}
        </nav>
      )}

      {teachers.length > 0 && (
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">לא מצאתם מורה מתאים?</h2>
            <p className="mt-1 text-gray-600">פרסמו בקשת לימוד, ומורים שמלמדים את המקצוע יפנו אליכם בצ&apos;אט.</p>
          </div>
          <Link
            href="/requests/new"
            className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            פרסום בקשה
          </Link>
        </div>
      )}
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-36 animate-pulse rounded-2xl bg-white" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
      ))}
    </div>
  )
}
