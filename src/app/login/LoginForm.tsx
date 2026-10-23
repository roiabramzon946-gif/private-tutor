'use client'

import Link from 'next/link'
import { startTransition, useActionState } from 'react'
import { login, resendConfirmation } from '@/app/auth/actions'
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
      {state.unconfirmedEmail && <ResendConfirmation email={state.unconfirmedEmail} />}
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

// מוצג כשמנסים להתחבר עם מייל שעוד לא אומת
function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, {})
  return (
    <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm">
      <p className="text-gray-700">לא קיבלתם את מייל האימות, או שהקישור פג?</p>
      {state.ok ? (
        <p className="mt-1 font-medium text-emerald-700">{state.message}</p>
      ) : (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const fd = new FormData()
              fd.set('email', email)
              startTransition(() => action(fd))
            }}
            className="mt-1 font-medium text-indigo-700 hover:underline disabled:opacity-50"
          >
            {pending ? 'שולחים…' : 'שלחו לי שוב את מייל האימות'}
          </button>
          {state.error && <p className="mt-1 text-red-600">{state.error}</p>}
        </>
      )}
    </div>
  )
}
