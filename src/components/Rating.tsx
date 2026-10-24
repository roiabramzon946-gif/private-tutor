type Props = { avg: number; count: number; className?: string }

export function Rating({ avg, count, className = '' }: Props) {
  if (!count) return <span className={`text-sm text-gray-500 ${className}`}>עוד אין ביקורות</span>
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <span className="text-amber-500">★</span>
      <span className="font-semibold">{Number(avg).toFixed(1)}</span>
      <span className="text-gray-500">({count} ביקורות)</span>
    </span>
  )
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} מתוך 5`}>
      {'★'.repeat(value)}
      <span className="text-gray-300">{'★'.repeat(5 - value)}</span>
    </span>
  )
}
