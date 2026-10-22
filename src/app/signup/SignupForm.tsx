'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signup } from '@/app/auth/actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'

const roles = [
  { value: 'student', title: 'אני מחפש/ת מורה', desc: 'תלמיד/ה או הורה' },
  { value: 'teacher', title: 'אני מורה', desc: 'רוצה לקבל תלמידים' },
] as const

export function SignupForm({ defaultRole }: { defaultRole: 'student' | 'teacher' }) {
  const { state, pending, onSubmit } = useActionForm(signup)
  const [role, setRole] = useState<'student' | 'teacher'>(defaultRole)

  if (state.ok) return <FormMessage state={state} />

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">איך תשתמשו באתר?</legend>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <label
              key={r.value}
              className={`cursor-pointer rounded-xl border-2 p-3 text-center transition ${
                role === r.value
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="sr-only"
              />
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-xs text-gray-500">{r.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="שם מלא" name="full_name" autoComplete="name" required maxLength={100} />
      <Field label="אימייל" name="email" type="email" autoComplete="email" dir="ltr" required />
      <Field
        label="טלפון נייד"
        name="phone"
        type="tel"
        autoComplete="tel"
        dir="ltr"
        placeholder="050-1234567"
        required
        hint={
          role === 'teacher'
            ? 'את/ה מחליט/ה אם להציג אותו בפרופיל. תלמידים תמיד יוכלו לפנות אליך גם בצ\'אט באתר.'
            : 'המספר לא מוצג למורים. אפשר לדבר איתם בצ\'אט באתר.'
        }
      />
      {role === 'teacher' && (
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="show_phone" className="mt-0.5 size-4 accent-indigo-600" />
          להציג את מספר הטלפון שלי בפרופיל (רק למשתמשים מחוברים)
        </label>
      )}
      <Field
        label="סיסמה"
        name="password"
        type="password"
        autoComplete="new-password"
        dir="ltr"
        minLength={8}
        hint="לפחות 8 תווים"
        required
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">
        {role === 'teacher' ? 'הרשמה כמורה' : 'הרשמה'}
      </SubmitButton>
      <p className="text-center text-sm text-gray-600">
        כבר רשומים?{' '}
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          להתחברות
        </Link>
      </p>
    </form>
  )
}
