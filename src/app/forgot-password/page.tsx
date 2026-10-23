import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = { title: 'שכחתי סיסמה' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default function ForgotPasswordPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-4 text-2xl font-bold">שכחתי סיסמה</h1>
        <Suspense fallback={null}>
          <LinkError searchParams={searchParams} />
        </Suspense>
        <ForgotPasswordForm />
      </div>
    </main>
  )
}

async function LinkError({ searchParams }: Props) {
  const sp = await searchParams
  if (sp.error !== 'link') return null
  return (
    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
      הקישור לאיפוס הסיסמה פג תוקף או שכבר נעשה בו שימוש. בקשו קישור חדש.
    </p>
  )
}
