// בקשה פתוחה כפי שמורה רואה אותה (list_open_requests)
export type OpenRequest = {
  id: string
  subject_name: string
  subject_slug: string
  level: string | null
  city: string | null
  extra_cities: string[]
  region: string | null
  in_person_ok: boolean
  online_ok: boolean
  budget_max: number | null
  description: string
  created_at: string
  offers_count: number
  student_first: string
  already_offered: boolean
  total_count: number
}

export const MAX_OFFERS_PER_REQUEST = 10
export const MAX_OPEN_REQUESTS = 3
export const REQUEST_DAYS_OPEN = 30
export const MAX_REQUEST_CITIES = 5
