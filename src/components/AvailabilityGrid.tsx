import { DAYS_SHORT, SLOTS } from '@/lib/levels'

type Props = {
  /** ערכים כמו "0-morning" */
  value: string[]
  /** מצב עריכה: תיבות סימון בשם availability (לטופס). אחרת — תצוגה בלבד */
  editable?: boolean
}

// טבלת זמינות שבועית: שורות = חלקי היום, עמודות = ימים
export function AvailabilityGrid({ value, editable = false }: Props) {
  const set = new Set(value)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[300px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="w-16" />
            {DAYS_SHORT.map((d) => (
              <th key={d} className="font-semibold text-gray-600">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((s) => (
            <tr key={s.value}>
              <th className="text-start font-normal text-gray-600">
                {s.label}
                <span className="block text-[10px] text-gray-400">{s.hours}</span>
              </th>
              {DAYS_SHORT.map((d, i) => {
                const key = `${i}-${s.value}`
                const on = set.has(key)
                return (
                  <td key={key}>
                    {editable ? (
                      <label className="flex h-8 cursor-pointer items-center justify-center rounded-md bg-gray-50 ring-1 ring-gray-200 has-[:checked]:bg-indigo-600 has-[:checked]:ring-indigo-600">
                        <input
                          type="checkbox"
                          name="availability"
                          value={key}
                          defaultChecked={on}
                          aria-label={`${d} ${s.label}`}
                          className="peer sr-only"
                        />
                        <span className="text-white opacity-0 peer-checked:opacity-100">✓</span>
                      </label>
                    ) : (
                      <span
                        aria-label={on ? `${d} ${s.label}: זמין/ה` : undefined}
                        className={`block h-6 rounded-md ${on ? 'bg-indigo-500' : 'bg-gray-100'}`}
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
