'use client'

import { useState } from 'react'
import { inputClass } from '@/components/fields'

const MAX = 10

// ערים נוספות שבהן המורה מלמד/ת פרונטלית. משתמש ברשימת היישובים (datalist) של שדה העיר.
export function ExtraCitiesField({ initial, listId }: { initial: string[]; listId: string }) {
  const [cities, setCities] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')

  function add() {
    const c = draft.trim()
    if (!c || cities.includes(c) || cities.length >= MAX) return
    setCities([...cities, c])
    setDraft('')
  }

  return (
    <div>
      <label htmlFor="extra-city-input" className="mb-1 block text-sm font-medium text-gray-700">
        ערים נוספות שבהן את/ה מלמד/ת (רשות)
      </label>
      <div className="flex gap-2">
        <input
          id="extra-city-input"
          list={listId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="התחילו להקליד ובחרו מהרשימה"
          autoComplete="off"
          disabled={cities.length >= MAX}
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || cities.length >= MAX}
          className="shrink-0 rounded-lg bg-white px-4 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
        >
          הוספה
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        תלמידים שיחפשו באחת הערים האלה ימצאו אותך. עד {MAX} ערים.
      </p>
      {cities.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {cities.map((c) => (
            <li key={c} className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 ps-3 pe-1 text-sm text-indigo-900">
              {c}
              <button
                type="button"
                onClick={() => setCities(cities.filter((x) => x !== c))}
                aria-label={`הסרת ${c}`}
                className="flex size-5 items-center justify-center rounded-full hover:bg-indigo-100"
              >
                ×
              </button>
              <input type="hidden" name="extra_cities" value={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
