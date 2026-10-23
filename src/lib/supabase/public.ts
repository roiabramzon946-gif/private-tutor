import { createClient } from '@supabase/supabase-js'

// לקוח בלי עוגיות, לנתונים ציבוריים בלבד (למשל כותרות לגוגל). אפשר לשמור את התוצאה במטמון.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
