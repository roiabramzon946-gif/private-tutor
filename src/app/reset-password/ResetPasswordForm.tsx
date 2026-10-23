'use client'

import Link from 'next/link'
import { updatePassword } from '@/app/auth/password-actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'

export function ResetPasswordForm({ home }: { home: string }) {
  const { state, pending, onSubmit } = useActionForm(updatePassword)

  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link
          href={home}
          className="block rounded-lg bg-indigo-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-indigo-700"
        >
          המשך לאתר
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="סיסמה חדשה"
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        minLength={8}
        hint="לפחות 8 תווים"
        required
      />
      <Field label="אימות סיסמה" name="confirm" type="password" autoComplete="new-password" dir="ltr" required />
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">
        שמירת הסיסמה
      </SubmitButton>
    </form>
  )
}
