'use client'

import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPhone, whatsappUrl } from '@/lib/phone'

// טלפון + וואטסאפ בפרופיל מורה. לחיצה של תלמיד נרשמת, כדי שיוכל לכתוב ביקורת אחר כך
// (גם אם לא התכתבו בצ'אט באתר). הרישום לא מעכב את פתיחת הקישור.
export function ContactLinks({ teacherId, phone }: { teacherId: string; phone: string }) {
  const supabase = useMemo(() => createClient(), [])
  const log = (kind: 'whatsapp' | 'phone') => {
    void supabase.rpc('log_contact_click', { p_teacher: teacherId, p_kind: kind })
  }

  return (
    <>
      <a
        href={`tel:${phone}`}
        dir="ltr"
        onClick={() => log('phone')}
        className="rounded-lg bg-white px-5 py-2.5 font-medium ring-1 ring-gray-300 hover:bg-gray-50"
      >
        📞 {formatPhone(phone)}
      </a>
      <a
        href={whatsappUrl(phone)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => log('whatsapp')}
        className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
      >
        וואטסאפ
      </a>
    </>
  )
}
