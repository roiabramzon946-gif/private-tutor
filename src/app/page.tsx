import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getLocalities, getSubjects } from '@/lib/data'
import { SearchFilters } from '@/components/SearchFilters'
import { TeacherCard } from '@/components/TeacherCard'
import type { TeacherSearchResult } from '@/types/search'

const POPULAR = [
  { slug: 'math', name: 'מתמטיקה' },
  { slug: 'english', name: 'אנגלית' },
  { slug: 'psychometric', name: 'פסיכומטרי' },
  { slug: 'calculus', name: 'חדו"א' },
  { slug: 'statistics', name: 'סטטיסטיקה' },
  { slug: 'programming', name: 'תכנות' },
]

export default function Home() {
  return (
    <main>
      <section>
        <div className="mx-auto max-w-5xl px-4 pt-14 pb-10">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            המורה הפרטי המתאים לך,
            <br />
            <span className="text-indigo-700">במרחק חיפוש אחד</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">
            מורים פרטיים לבית הספר, לפסיכומטרי ולתואר, בכל הארץ ואונליין. משווים מחירים, קוראים ביקורות של
            תלמידים, ובוחרים.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-28 animate-pulse rounded-2xl bg-white" />}>
              <HomeSearch />
            </Suspense>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500">חיפושים פופולריים:</span>
            {POPULAR.map((p) => (
              <Link
                key={p.slug}
                href={`/search?subject=${p.slug}`}
                className="rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-200 hover:text-indigo-700 hover:ring-indigo-200"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">מורים מובילים</h2>
          <Link href="/search" className="text-sm font-medium text-indigo-700 hover:underline">
            לכל המורים ←
          </Link>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-white" />}>
          <FeaturedTeachers />
        </Suspense>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-white p-6 ring-1 ring-gray-100 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">לא מצאתם מורה מתאים?</h2>
            <p className="mt-1 text-gray-600">פרסמו בקשת לימוד, ומורים שמלמדים את המקצוע יפנו אליכם בצ&apos;אט.</p>
          </div>
          <Link
            href="/requests/new"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            פרסום בקשה
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-indigo-700 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">מלמדים? הצטרפו אלינו</h2>
            <p className="mt-1 text-indigo-100">בנו פרופיל בכמה דקות והתחילו לקבל פניות מתלמידים.</p>
          </div>
          <Link
            href="/signup?role=teacher"
            className="rounded-lg bg-white px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            הרשמה כמורה
          </Link>
        </div>
      </section>
    </main>
  )
}

async function HomeSearch() {
  const [subjects, localities] = await Promise.all([getSubjects(), getLocalities()])
  return <SearchFilters subjects={subjects} localities={localities} compact />
}

async function FeaturedTeachers() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('search_teachers', { p_limit: 3 })
  const teachers = (data ?? []) as TeacherSearchResult[]
  if (teachers.length === 0) return <p className="text-gray-500">עדיין אין מורים באתר.</p>
  return (
    <ul className="space-y-4">
      {teachers.map((t) => (
        <li key={t.teacher_id}>
          <TeacherCard t={t} />
        </li>
      ))}
    </ul>
  )
}
