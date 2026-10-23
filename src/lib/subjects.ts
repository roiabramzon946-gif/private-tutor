import type { Subject } from '@/types/db'

// סדר הקטגוריות בכל הרשימות באתר
export const CATEGORY_ORDER = [
  'מדעים מדויקים',
  'מדעי הטבע',
  'שפות',
  'מדעי הרוח',
  'הוראה מתקנת',
  'פסיכומטרי ומבחנים',
  'אקדמיה',
]

export type SubjectGroup = { category: string; subjects: Subject[] }

export function groupSubjects(subjects: Subject[]): SubjectGroup[] {
  const map = new Map<string, Subject[]>()
  for (const s of subjects) {
    const key = s.category ?? 'אחר'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c)
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'he'))
    .map(([category, list]) => ({
      category,
      subjects: list.sort((a, b) => a.name.localeCompare(b.name, 'he')),
    }))
}
