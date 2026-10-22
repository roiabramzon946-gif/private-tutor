'use client'

import { useState } from 'react'
import { submitReview } from './actions'
import { useActionForm } from '@/lib/use-action-form'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'
import { inputClass } from '@/components/fields'

type Props = {
  teacherId: string
  existing: { rating: number; comment: string | null } | null
}

export function ReviewForm({ teacherId, existing }: Props) {
  const { state, pending, onSubmit } = useActionForm(submitReview)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [hover, setHover] = useState(0)

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="teacher_id" value={teacherId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} כוכבים`}
            className={`text-3xl leading-none transition ${
              n <= (hover || rating) ? 'text-amber-500' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={3}
        maxLength={2000}
        defaultValue={existing?.comment ?? ''}
        placeholder="איך היו השיעורים? (לא חובה)"
        className={inputClass}
      />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>{existing ? 'עדכון הביקורת' : 'פרסום ביקורת'}</SubmitButton>
    </form>
  )
}
