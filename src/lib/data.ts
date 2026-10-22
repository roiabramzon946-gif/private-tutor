import { createClient } from '@/lib/supabase/server'
import type { Locality, Subject } from '@/types/db'

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subjects')
    .select('id, name, slug, category')
    .order('name')
  return (data ?? []) as Subject[]
}

// כל היישובים בישראל (טבלת localities, מקור: הלמ"ס)
export async function getLocalities(): Promise<Locality[]> {
  // Supabase מחזיר עד 1000 שורות לבקשה, לכן מושכים בשני עמודים
  const supabase = await createClient()
  const page = (from: number) =>
    supabase.from('localities').select('name, region').order('name').range(from, from + 999)
  const [a, b] = await Promise.all([page(0), page(1000)])
  return [...(a.data ?? []), ...(b.data ?? [])] as Locality[]
}

// ממיר את מה שהמשתמש הקליד לשם הרשמי: "תל אביב" → "תל אביב - יפו"
export function resolveLocality(input: string | undefined, localities: Locality[]): Locality | undefined {
  const q = input?.trim()
  if (!q) return undefined
  const norm = (s: string) => s.replace(/[-–־]/g, ' ').replace(/\s+/g, ' ').trim()
  const nq = norm(q)
  return (
    localities.find((l) => l.name === q) ??
    localities.find((l) => norm(l.name) === nq) ??
    localities.find((l) => norm(l.name).startsWith(nq + ' '))
  )
}
