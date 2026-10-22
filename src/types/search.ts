import type { SubscriptionTier } from './db'

// התוצאה שמחזירה הפונקציה search_teachers ב-Supabase
export type TeacherSearchResult = {
  teacher_id: string
  full_name: string
  avatar_url: string | null
  city: string | null
  region: string | null
  bio_preview: string | null
  hourly_rate: number
  teaches_online: boolean
  teaches_in_person: boolean
  rating_avg: number
  reviews_count: number
  subjects: string[]
  tier: SubscriptionTier
  is_promoted: boolean
  total_count: number
}
