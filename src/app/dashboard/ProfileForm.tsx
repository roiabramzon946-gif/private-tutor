'use client'

import { useState } from 'react'
import { saveProfile } from './actions'
import { useActionForm } from '@/lib/use-action-form'
import { Field, inputClass } from '@/components/fields'
import { FormMessage } from '@/components/FormMessage'
import { SubmitButton } from '@/components/SubmitButton'
import type { Locality, Subject } from '@/types/db'
import { EmailNotificationsField } from '@/components/EmailNotificationsField'
import { groupSubjects } from '@/lib/subjects'

export type ProfileValues = {
  fullName: string
  bio: string
  city: string
  region: string
  hourlyRate: number | null
  yearsExperience: number | null
  teachesOnline: boolean
  teachesInPerson: boolean
  isActive: boolean
  phone: string
  showPhone: boolean
  emailNotifications: boolean
  subjects: Record<number, string[]> // subject_id -> levels
}


type Props = { subjects: Subject[]; localities: Locality[]; values: ProfileValues }

export function ProfileForm({ subjects, localities, values }: Props) {
  const { state, pending, onSubmit } = useActionForm(saveProfile)
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(Object.keys(values.subjects).map(Number))
  )

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-lg font-bold">פרטים כלליים</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" name="full_name" defaultValue={values.fullName} required maxLength={100} />
          <Field
            label="מחיר לשעה (₪)"
            name="hourly_rate"
            type="number"
            min={1}
            max={9999}
            defaultValue={values.hourlyRate ?? ''}
            hint="בלי מחיר הפרופיל לא יופיע בחיפוש"
          />
          <div>
            <Field
              label="עיר"
              name="city"
              list="locality-options"
              defaultValue={values.city}
              placeholder="התחילו להקליד ובחרו מהרשימה"
              autoComplete="off"
              hint={values.region ? `אזור: ${values.region}` : 'האזור נקבע אוטומטית לפי העיר'}
            />
            <datalist id="locality-options">
              {localities.map((l) => (
                <option key={l.name} value={l.name} />
              ))}
            </datalist>
          </div>
          <Field
            label="שנות ניסיון"
            name="years_experience"
            type="number"
            min={0}
            max={70}
            defaultValue={values.yearsExperience ?? ''}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="טלפון נייד"
            name="phone"
            type="tel"
            dir="ltr"
            placeholder="050-1234567"
            defaultValue={values.phone}
          />
          <label className="flex items-start gap-2 self-center text-sm text-gray-700 sm:pt-6">
            <input type="checkbox" name="show_phone" defaultChecked={values.showPhone} className="mt-0.5 size-4 accent-indigo-600" />
            <span>
              להציג את הטלפון בפרופיל
              <span className="block text-xs text-gray-500">אם לא — תלמידים יפנו אליך רק בצ&apos;אט באתר</span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="teaches_in_person" defaultChecked={values.teachesInPerson} className="size-4 accent-indigo-600" />
            שיעורים פרונטליים
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="teaches_online" defaultChecked={values.teachesOnline} className="size-4 accent-indigo-600" />
            שיעורים אונליין
          </label>
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
            קצת עליי
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            maxLength={3000}
            defaultValue={values.bio}
            placeholder="ניסיון, שיטת לימוד, למי השיעורים מתאימים…"
            className={inputClass}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-lg font-bold">מקצועות</h2>
        <p className="mb-4 text-sm text-gray-500">
          סמנו את המקצועות שאתם מלמדים. ברמות אפשר לכתוב כמה ערכים מופרדים בפסיק, למשל: תיכון, בגרות 5 יח&quot;ל או: שנה א&apos;, הנדסה
        </p>
        <div className="space-y-5">
          {groupSubjects(subjects).map((g) => (
            <fieldset key={g.category}>
              <legend className="mb-1.5 text-sm font-semibold text-gray-500">{g.category}</legend>
              <ul className="space-y-1">
                {g.subjects.map((s) => {
                  const on = selected.has(s.id)
                  return (
                    <li
                      key={s.id}
                      className={`flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 ${on ? 'bg-indigo-50' : ''}`}
                    >
                      <label className="flex min-w-44 items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          name="subjects"
                          value={s.id}
                          checked={on}
                          onChange={() => toggle(s.id)}
                          className="size-4 accent-indigo-600"
                        />
                        {s.name}
                      </label>
                      {on && (
                        <input
                          name={`levels_${s.id}`}
                          defaultValue={(values.subjects[s.id] ?? []).join(', ')}
                          placeholder="רמות (לא חובה)"
                          className={`${inputClass} flex-1 py-1.5 text-sm`}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="space-y-3">
          <EmailNotificationsField defaultChecked={values.emailNotifications} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={values.isActive} className="size-4 accent-indigo-600" />
            הפרופיל פעיל ומופיע בחיפוש
          </label>
        </div>
        <div className="flex items-center gap-3">
          <FormMessage state={state} />
          <SubmitButton pending={pending}>שמירת שינויים</SubmitButton>
        </div>
      </section>
    </form>
  )
}
