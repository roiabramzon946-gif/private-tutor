// רכיבי טופס בסיסיים עם עיצוב אחיד
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }

export function Field({ label, hint, id, name, className = '', ...rest }: InputProps) {
  const fieldId = id ?? name
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        {...rest}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
