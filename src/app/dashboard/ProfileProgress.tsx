// מד השלמת פרופיל למורה: אחוז + רשימת מה חסר
export type ProgressItem = { label: string; done: boolean; hint: string }

export function ProfileProgress({ items }: { items: ProgressItem[] }) {
  const done = items.filter((i) => i.done).length
  const pct = Math.round((done / items.length) * 100)
  const complete = done === items.length

  return (
    <section
      className={`rounded-2xl p-6 shadow-sm ring-1 ${complete ? 'bg-emerald-50 ring-emerald-100' : 'bg-white ring-gray-100'}`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{complete ? 'הפרופיל שלך מלא 🎉' : 'השלמת הפרופיל'}</h2>
        <span className={`text-2xl font-bold ${complete ? 'text-emerald-700' : 'text-indigo-700'}`}>{pct}%</span>
      </div>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="השלמת הפרופיל"
      >
        <div
          className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 text-sm text-emerald-800">
          פרופיל מלא מקבל הרבה יותר פניות. עכשיו נשאר לשתף אותו 👇
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-gray-600">פרופיל מלא מקבל הרבה יותר פניות מתלמידים. מה נשאר:</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.label} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i.done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {i.done ? '✓' : ''}
                </span>
                <span className={i.done ? 'text-gray-400 line-through' : 'text-gray-800'}>
                  {i.label}
                  {!i.done && <span className="block text-xs text-gray-500">{i.hint}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
