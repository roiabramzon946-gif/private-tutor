'use client'

import { useState } from 'react'
import { sendOffer } from './actions'
import { useActionForm } from '@/lib/use-action-form'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'
import { inputClass } from '@/components/fields'

type Props = { requestId: string; studentFirst: string; subject: string; teacherName: string }

export function OfferForm({ requestId, studentFirst, subject, teacherName }: Props) {
  const [open, setOpen] = useState(false)
  const { state, pending, onSubmit } = useActionForm(sendOffer)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        שליחת הצעה
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 w-full space-y-2">
      <input type="hidden" name="request_id" value={requestId} />
      <textarea
        name="body"
        rows={4}
        maxLength={2000}
        required
        defaultValue={`היי ${studentFirst}, אני ${teacherName} ואני מלמד/ת ${subject}. ראיתי את הבקשה שלך ואשמח לעזור. `}
        className={inputClass}
        aria-label="ההודעה לתלמיד"
      />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>שליחה</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100">
          ביטול
        </button>
      </div>
      <p className="text-xs text-gray-500">ההודעה תפתח שיחה בצ&apos;אט. התלמיד יחליט אם להשיב.</p>
    </form>
  )
}
