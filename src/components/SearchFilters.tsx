import { REGIONS, type Locality, type Subject } from '@/types/db'
import { inputClass } from './fields'
import { groupSubjects } from '@/lib/subjects'

export type SearchValues = {
  subject?: string
  city?: string
  region?: string
  online?: boolean
  min?: number
  max?: number
}

type Props = {
  subjects: Subject[]
  localities: Locality[]
  values?: SearchValues
  compact?: boolean // גרסה מקוצרת לדף הבית
}

// טופס GET רגיל: הפילטרים נשמרים בכתובת הדף, אפשר לשתף קישור לחיפוש
export function SearchFilters({ subjects, localities, values = {}, compact = false }: Props) {
  return (
    <form
      action="/search"
      className={`grid items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${
        compact ? 'sm:grid-cols-[1fr_1fr_auto]' : 'sm:grid-cols-2 lg:grid-cols-6'
      }`}
    >
      <div className={compact ? '' : 'lg:col-span-2'}>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">
          מקצוע
        </label>
        <select id="subject" name="subject" defaultValue={values.subject ?? ''} className={inputClass}>
          <option value="">כל המקצועות</option>
          {groupSubjects(subjects).map((g) => (
            <optgroup key={g.category} label={g.category}>
              {g.subjects.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className={compact ? '' : 'lg:col-span-2'}>
        <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-700">
          עיר
        </label>
        <input
          id="city"
          name="city"
          list="city-options"
          placeholder="כל הארץ"
          defaultValue={values.city ?? ''}
          className={inputClass}
        />
        <datalist id="city-options">
          {localities.map((l) => (
            <option key={l.name} value={l.name} />
          ))}
        </datalist>
      </div>

      {!compact && (
        <>
          <div className="lg:col-span-2">
            <label htmlFor="region" className="mb-1 block text-sm font-medium text-gray-700">
              אזור
            </label>
            <select id="region" name="region" defaultValue={values.region ?? ''} className={inputClass}>
              <option value="">כל האזורים</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="min" className="mb-1 block text-sm font-medium text-gray-700">
              ממחיר (₪)
            </label>
            <input id="min" name="min" type="number" min={0} defaultValue={values.min} className={inputClass} />
          </div>
          <div>
            <label htmlFor="max" className="mb-1 block text-sm font-medium text-gray-700">
              עד מחיר (₪)
            </label>
            <input id="max" name="max" type="number" min={0} defaultValue={values.max} className={inputClass} />
          </div>
        </>
      )}

      <label
        className={`flex items-center gap-2 text-sm text-gray-700 ${compact ? 'sm:col-span-3' : 'lg:col-span-2'}`}
      >
        <input
          type="checkbox"
          name="online"
          value="1"
          defaultChecked={values.online ?? true}
          className="size-4 accent-indigo-600"
        />
        לכלול מורים שמלמדים אונליין מכל הארץ
      </label>

      <button
        type="submit"
        className={`rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700 ${
          compact ? 'sm:col-start-3 sm:row-start-1' : 'lg:col-span-2'
        }`}
      >
        חיפוש
      </button>
    </form>
  )
}
