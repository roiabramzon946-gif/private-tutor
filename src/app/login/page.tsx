import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser, safeNext } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'התחברות' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default function LoginPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold">התחברות</h1>
        <Suspense fallback={<div className="h-64" />}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function LoginContent({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()])
  const next = safeNext(sp.next)
  if (user) redirect(next ?? (user.role === 'teacher' ? '/dashboard' : '/search'))

  return (
    <>
      {sp.error === 'confirm' && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          אם לחצתם על הקישור במייל האימות, החשבון כנראה כבר אומת. התחברו עם המייל והסיסמה.
        </p>
      )}
      <LoginForm next={next} />
    </>
  )
}
