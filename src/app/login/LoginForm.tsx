'use client'

import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'

export function LoginForm({ next }: { next: string | null }) {
  const { state, pending, onSubmit } = useActionForm(login)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="אימייל" name="email" type="email" autoComplete="email" dir="ltr" required />
      <div>
        <Field label="סיסמה" name="password" type="password" autoComplete="current-password" dir="ltr" required />
        <Link href="/forgot-password" className="mt-1 inline-block text-xs font-medium text-indigo-700 hover:underline">
          שכחתי סיסמה
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">התחברות</SubmitButton>
      <p className="text-center text-sm text-gray-600">
        עוד אין לך חשבון?{' '}
        <Link href="/signup" className="font-medium text-indigo-700 hover:underline">
          להרשמה
        </Link>
      </p>
    </form>
  )
}
