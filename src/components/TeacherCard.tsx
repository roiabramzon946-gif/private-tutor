import Link from 'next/link'
import type { TeacherSearchResult } from '@/types/search'
import { Avatar } from './Avatar'

export function TeacherCard({ t }: { t: TeacherSearchResult }) {
  const modes = [t.teaches_in_person && 'פרונטלי', t.teaches_online && 'אונליין']
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      href={`/teachers/${t.teacher_id}`}
      className={`block rounded-2xl p-5 shadow-sm ring-1 transition hover:shadow-md ${
        // פרימיום: הדגשה בצבע (בלי תגית)
        t.tier === 'premium' ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-white ring-gray-100 hover:ring-indigo-200'
      }`}
    >
      <div className="flex gap-4">
        <Avatar url={t.avatar_url} name={t.full_name} size={64} />

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t.full_name}</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {[t.city, modes].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.subjects.map((s) => (
              <span key={s} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {s}
              </span>
            ))}
          </div>
          {t.bio_preview && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">{t.bio_preview}</p>
          )}
        </div>

        <div className="shrink-0 text-end">
          <div className="text-xl font-bold text-indigo-700">₪{Number(t.hourly_rate)}</div>
          <div className="text-xs text-gray-500">לשעה</div>
          <div className="mt-2 text-sm">
            {t.reviews_count ? (
              <>
                <div>
                  <span className="text-amber-500">★</span>{' '}
                  <span className="font-semibold">{Number(t.rating_avg).toFixed(1)}</span>
                </div>
                <div className="text-xs whitespace-nowrap text-gray-500">{t.reviews_count} ביקורות</div>
              </>
            ) : (
              <div className="text-xs whitespace-nowrap text-gray-500">עוד אין ביקורות</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
