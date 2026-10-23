// רמות לימוד קבועות (תואם ל-constraint במסד, migration 018)
export const LEVELS = ['יסודי', 'חטיבת ביניים', 'בגרות 3 יח"ל', 'בגרות 4 יח"ל', 'בגרות 5 יח"ל', 'אקדמיה'] as const
export type Level = (typeof LEVELS)[number]

// קטגוריות מקצועות עם טיפול מיוחד ברמות
export const ACADEMIC_CATEGORY = 'אקדמיה' // רמה "אקדמיה" אוטומטית
export const NO_LEVEL_CATEGORY = 'פסיכומטרי ומבחנים' // אין רמות

// זמינות שבועית: "<יום>-<חלק ביום>"
export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const
export const DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const
export const SLOTS = [
  { value: 'morning', label: 'בוקר', hours: '8–12' },
  { value: 'noon', label: 'צהריים', hours: '12–16' },
  { value: 'afternoon', label: 'אחה״צ', hours: '16–20' },
  { value: 'evening', label: 'ערב', hours: '20–23' },
] as const
export type SlotValue = (typeof SLOTS)[number]['value']

export const AVAILABILITY_VALUES: string[] = DAYS.flatMap((_, d) => SLOTS.map((s) => `${d}-${s.value}`))

export function isLevel(v: unknown): v is Level {
  return typeof v === 'string' && (LEVELS as readonly string[]).includes(v)
}
export function isSlot(v: unknown): v is SlotValue {
  return typeof v === 'string' && SLOTS.some((s) => s.value === v)
}
