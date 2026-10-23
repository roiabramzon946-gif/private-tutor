import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getLocalities, getSubjects } from '@/lib/data'
import { MAX_OFFERS_PER_REQUEST, REQUEST_DAYS_OPEN } from '@/types/requests'
import { RequestForm } from './RequestForm'

export default function NewRequestPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-3xl font-bold">בקשת מורה</h1>
      <p className="mt-1 mb-5 text-gray-600">
        ספרו מה אתם מחפשים, ומורים שמלמדים את המקצוע ישלחו לכם הצעות בצ&apos;אט. הבקשה מוצגת למורים בלי שם מלא ובלי פרטי
        קשר, ונשארת פתוחה {REQUEST_DAYS_OPEN} יום או עד {MAX_OFFERS_PER_REQUEST} הצעות.
      </p>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <Suspense fallback={<div className="h-96 animate-pulse" />}>
          <Content />
        </Suspense>
      </div>
    </main>
  )
}

async function Content() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/requests/new')
  if (user.role !== 'student') {
    return (
      <p className="text-gray-600">
        בקשות לימוד מפרסמים תלמידים. כמורה, אפשר לראות את הבקשות הפתוחות ב
        <Link href="/requests" className="font-medium text-indigo-700 hover:underline">לוח הבקשות</Link>.
      </p>
    )
  }
  const [subjects, localities] = await Promise.all([getSubjects(), getLocalities()])
  return <RequestForm subjects={subjects} localities={localities} />
}
