'use client'

import { useActionState, startTransition, type FormEvent } from 'react'
import type { FormState } from '@/types/db'

// עוטף server action עם useActionState, בלי שהטופס יתאפס אחרי שליחה
// (ככה המשתמש לא מאבד את מה שהקליד אם יש שגיאה)
export function useActionForm(
  action: (prev: FormState, formData: FormData) => Promise<FormState>
) {
  const [state, formAction, pending] = useActionState(action, {})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => formAction(formData))
  }

  return { state, pending, onSubmit }
}
