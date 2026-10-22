import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SignupForm } from './SignupForm'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default function SignupPage({ searchParams }: Props) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold">הרשמה</h1>
        <Suspense fallback={<div className="h-96" />}>
          <SignupContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}

async function SignupContent({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()])
  if (user) redirect(user.role === 'teacher' ? '/dashboard' : '/search')
  return <SignupForm defaultRole={sp.role === 'teacher' ? 'teacher' : 'student'} />
}
