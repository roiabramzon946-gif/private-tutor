'use client'

import { useState } from 'react'
import { reportUser } from '@/app/reports/actions'
import { useActionForm } from '@/lib/use-action-form'
import { FormMessage } from './FormMessage'
import { SubmitButton } from './SubmitButton'
import { inputClass } from './fields'

const REASONS = [
  { value: 'harassment', label: 'הטרדה או איומים' },
  { value: 'spam', label: 'ספאם או פרסומת' },
  { value: 'fake_profile', label: 'פרופיל מזויף' },
  { value: 'inappropriate', label: 'תוכן פוגעני' },
  { value: 'other', label: 'אחר' },
]

type Props = { reportedUserId: string; conversationId?: string; label?: string }

// כפתור "דיווח" קטן שנפתח לטופס קצר. הדיווח נשמר במסד ונשלח במייל למנהל האתר.
export function ReportButton({ reportedUserId, conversationId, label = 'דיווח' }: Props) {
  const [open, setOpen] = useState(false)
  const { state, pending, onSubmit } = useActionForm(reportUser)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 hover:text-red-600 hover:underline"
      >
        ⚑ {label}
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl bg-red-50/60 p-4 text-sm ring-1 ring-red-100">
      {state.ok ? (
        <FormMessage state={state} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <input type="hidden" name="reported_user_id" value={reportedUserId} />
          {conversationId && <input type="hidden" name="conversation_id" value={conversationId} />}
          <p className="font-semibold text-gray-800">דיווח למנהלי האתר</p>
          <select name="reason" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              מה הבעיה?
            </option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            name="details"
            rows={3}
            maxLength={1000}
            placeholder="פרטים נוספים (רשות)"
            className={inputClass}
          />
          <p className="text-xs text-gray-500">
            הדיווח חסוי. לצורך הבדיקה ייתכן שנעיין בהתכתבות הרלוונטית, כמפורט במדיניות הפרטיות.
          </p>
          <FormMessage state={state} />
          <div className="flex gap-2">
            <SubmitButton pending={pending}>שליחת הדיווח</SubmitButton>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              ביטול
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
