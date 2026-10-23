'use client'

import Link from 'next/link'
import { requestPasswordReset } from '@/app/auth/password-actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'

export function ForgotPasswordForm() {
  const { state, pending, onSubmit } = useActionForm(requestPasswordReset)

  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/login" className="block text-center text-sm font-medium text-indigo-700 hover:underline">
          חזרה להתחברות
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">הזינו את כתובת המייל שאיתה נרשמתם, ונשלח אליה קישור לבחירת סיסמה חדשה.</p>
      <Field label="אימייל" name="email" type="email" autoComplete="email" dir="ltr" required />
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">
        שליחת קישור לאיפוס
      </SubmitButton>
      <p className="text-center text-sm text-gray-600">
        נזכרתם?{' '}
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          להתחברות
        </Link>
      </p>
    </form>
  )
}
