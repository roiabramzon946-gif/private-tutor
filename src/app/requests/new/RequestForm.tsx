'use client'

import { useState } from 'react'
import { createRequest } from '../actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field, inputClass } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'
import { groupSubjects } from '@/lib/subjects'
import type { Locality, Subject } from '@/types/db'
import { LocalityPicker } from '@/components/LocalityPicker'
import { MAX_REQUEST_CITIES } from '@/types/requests'

export function RequestForm({ subjects, localities }: { subjects: Subject[]; localities: Locality[] }) {
  const { state, pending, onSubmit } = useActionForm(createRequest)
  const [inPerson, setInPerson] = useState(true)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="subject_id" className="mb-1 block text-sm font-medium text-gray-700">מקצוע</label>
        <select id="subject_id" name="subject_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>בחרו מקצוע</option>
          {groupSubjects(subjects).map((g) => (
            <optgroup key={g.category} label={g.category}>
              {g.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <Field label="רמה (לא חובה)" name="level" maxLength={100} placeholder='למשל: בגרות 5 יח"ל, כיתה ח׳, שנה א׳' />

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-gray-700">סוג שיעור</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="in_person_ok"
            checked={inPerson}
            onChange={(e) => setInPerson(e.target.checked)}
            className="size-4 accent-indigo-600"
          />
          פרונטלי
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="online_ok" defaultChecked className="size-4 accent-indigo-600" />
          אונליין
        </label>
      </fieldset>

      {inPerson && (
        <LocalityPicker
          localities={localities}
          name="cities"
          label="באילו ערים נוח לכם ללמוד?"
          multiple
          max={MAX_REQUEST_CITIES}
          required
          hint={`אפשר לבחור עד ${MAX_REQUEST_CITIES} ערים. מורים מהערים האלה ומהאזור שלהן יראו את הבקשה.`}
        />
      )}

      <Field label="תקציב מקסימלי לשעה (₪, לא חובה)" name="budget_max" type="number" min={1} max={9999} />

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">מה אתם מחפשים?</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          minLength={10}
          maxLength={1000}
          required
          placeholder="למשל: מתכונן לבגרות בעוד חודשיים, מתקשה בטריגונומטריה, מעדיף ימי שלישי אחה״צ"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          אל תכתבו כאן טלפון או כתובת. מורים יפנו אליכם בצ&apos;אט באתר.
        </p>
      </div>

      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">פרסום הבקשה</SubmitButton>
    </form>
  )
}
