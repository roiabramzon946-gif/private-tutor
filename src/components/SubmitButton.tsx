type Props = { pending: boolean; children: React.ReactNode; className?: string }

export function SubmitButton({ pending, children, className = '' }: Props) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {pending ? 'רגע…' : children}
    </button>
  )
}
