// "היום", "אתמול", "לפני 5 ימים"
export function daysAgo(iso: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'היום'
  if (days === 1) return 'אתמול'
  return `לפני ${days} ימים`
}

// "הצעה אחת", "3 הצעות"
export function offersLabel(n: number): string {
  return n === 1 ? 'הצעה אחת' : `${n} הצעות`
}
