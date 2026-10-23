'use client'

import { useId, useMemo, useRef, useState } from 'react'
import type { Locality } from '@/types/db'
import { inputClass } from './fields'

// ערים נפוצות שמוצגות כשהשדה ריק
const POPULAR = [
  'תל אביב - יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע',
  'חולון', 'בני ברק', 'רמת גן', 'רחובות', 'בת ים', 'אשקלון', 'הרצליה', 'כפר סבא', 'רעננה',
  'מודיעין-מכבים-רעות', 'הוד השרון', 'רמת השרון',
]
const MAX_SUGGESTIONS = 50

type Props = {
  localities: Locality[]
  name: string
  label?: string
  /** כמה ערים (תגיות). אחרת — עיר אחת */
  multiple?: boolean
  max?: number
  initial?: string | string[]
  required?: boolean
  placeholder?: string
  hint?: string
}

// בחירת יישוב מהרשימה עם הצעות שנפתחות מתחת לשדה — עובד גם באייפון (בניגוד ל-datalist)
export function LocalityPicker({
  localities,
  name,
  label,
  multiple = false,
  max = 10,
  initial,
  required,
  placeholder = 'התחילו להקליד שם של עיר',
  hint,
}: Props) {
  const id = useId()
  const initialList = Array.isArray(initial) ? initial : initial ? [initial] : []
  const [selected, setSelected] = useState<string[]>(multiple ? initialList : [])
  const [query, setQuery] = useState(multiple ? '' : initialList[0] ?? '')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const byName = useMemo(() => new Map(localities.map((l) => [l.name, l])), [localities])

  const suggestions = useMemo(() => {
    const q = query.trim()
    let list: Locality[]
    if (!q || (!multiple && byName.has(q))) {
      list = POPULAR.map((n) => byName.get(n)).filter((l): l is Locality => !!l)
    } else {
      const starts: Locality[] = []
      const contains: Locality[] = []
      for (const l of localities) {
        if (l.name.startsWith(q)) starts.push(l)
        else if (l.name.includes(q)) contains.push(l)
      }
      list = [...starts, ...contains]
    }
    return list.filter((l) => !selected.includes(l.name)).slice(0, MAX_SUGGESTIONS)
  }, [query, localities, byName, selected, multiple])

  function pick(cityName: string) {
    if (multiple) {
      if (!selected.includes(cityName) && selected.length < max) setSelected([...selected, cityName])
      setQuery('')
      inputRef.current?.focus()
    } else {
      setQuery(cityName)
      setOpen(false)
    }
  }

  const full = multiple && selected.length >= max
  const listId = `${id}-list`

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {multiple && selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {selected.map((c) => (
            <li key={c} className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 ps-3 pe-1 text-sm text-indigo-900">
              {c}
              <button
                type="button"
                onClick={() => setSelected(selected.filter((x) => x !== c))}
                aria-label={`הסרת ${c}`}
                className="flex size-5 items-center justify-center rounded-full hover:bg-indigo-100"
              >
                ×
              </button>
              <input type="hidden" name={name} value={c} />
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={multiple ? undefined : name}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && open && suggestions.length > 0 && query.trim()) {
              e.preventDefault()
              pick(suggestions[0].name)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder={full ? `אפשר לבחור עד ${max} ערים` : placeholder}
          disabled={full}
          required={required && (!multiple || selected.length === 0)}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={inputClass}
        />
        {open && !full && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200"
          >
            {!query.trim() && (
              <li className="px-3 pt-1 pb-1.5 text-xs text-gray-400">ערים נפוצות — או התחילו להקליד</li>
            )}
            {suggestions.map((l) => (
              <li
                key={l.name}
                role="option"
                aria-selected={false}
                // mousedown ולא click — כדי שהבחירה תקרה לפני שהשדה מאבד פוקוס
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(l.name)
                }}
                className="flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 hover:bg-indigo-50"
              >
                <span>{l.name}</span>
                {l.region && <span className="text-xs text-gray-400">{l.region}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
