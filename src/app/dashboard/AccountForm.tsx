'use client'

import { saveAccount } from './actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'
import { EmailNotificationsField } from '@/components/EmailNotificationsField'

type Props = { fullName: string; phone: string; emailNotifications: boolean }

export function AccountForm({ fullName, phone, emailNotifications }: Props) {
  const { state, pending, onSubmit } = useActionForm(saveAccount)
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם מלא" name="full_name" defaultValue={fullName} required maxLength={100} />
        <Field
          label="טלפון נייד"
          name="phone"
          type="tel"
          dir="ltr"
          placeholder="050-1234567"
          defaultValue={phone}
          hint="לא מוצג למורים"
        />
      </div>
      <EmailNotificationsField defaultChecked={emailNotifications} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>שמירה</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}
