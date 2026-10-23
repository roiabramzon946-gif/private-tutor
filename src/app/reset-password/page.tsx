import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = { title: 'בחירת סיסמה חדשה' }

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold">בחירת סיסמה חדשה</h1>
        <Suspense fallback={<div className="h-48" />}>
          <ResetContent />
        </Suspense>
      </div>
    </main>
  )
}

// מגיעים לכאן מהקישור במייל, שכבר מחבר את המשתמש לחשבון
async function ResetContent() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="space-y-4 text-sm text-gray-700">
        <p>הקישור לאיפוס הסיסמה פג תוקף או שכבר נעשה בו שימוש.</p>
        <Link href="/forgot-password" className="font-medium text-indigo-700 hover:underline">
          לבקשת קישור חדש
        </Link>
      </div>
    )
  }
  return <ResetPasswordForm home={user.role === 'teacher' ? '/dashboard' : '/search'} />
}
