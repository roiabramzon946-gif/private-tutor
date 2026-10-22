import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/db'

export type CurrentUser = {
  id: string
  email: string | null
  role: UserRole
  fullName: string
  avatarUrl: string | null
}

// המשתמש המחובר (מאומת דרך getClaims) + הפרופיל שלו
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', claims.sub)
    .maybeSingle()

  if (!profile) return null

  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    role: profile.role,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
  }
}

// מונע הפניה לאתרים חיצוניים דרך ?next=
export function safeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  return value
}
