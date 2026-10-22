import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { Avatar } from '@/components/Avatar'
import { Rating, Stars } from '@/components/Rating'
import { TierBadge } from '@/components/TierBadge'
import type { SubscriptionTier } from '@/types/db'
import { ReviewForm } from './ReviewForm'
import { startConversation } from '@/app/messages/actions'
import { formatPhone, whatsappUrl } from '@/lib/phone'

type Props = { params: Promise<{ id: string }> }

type TeacherRow = {
  id: string
  bio: string | null
  hourly_rate: number | null
  city: string | null
  region: string | null
  teaches_online: boolean
  teaches_in_person: boolean
  years_experience: number | null
  subscription_tier: SubscriptionTier
  rating_avg: number
  reviews_count: number
  profiles: { full_name: string; avatar_url: string | null }
  teacher_subjects: { levels: string[]; subjects: { name: string; slug: string } }[]
}

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  student_id: string
  profiles: { full_name: string } | null
}

export default function TeacherPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
        <TeacherProfile params={params} />
      </Suspense>
    </main>
  )
}

const dateFmt = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' })

async function TeacherProfile({ params }: Props) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  const [{ data: teacherData }, { data: reviewsData }, user] = await Promise.all([
    supabase
      .from('teachers')
      .select(
        `id, bio, hourly_rate, city, region, teaches_online, teaches_in_person,
         years_experience, subscription_tier, rating_avg, reviews_count,
         profiles ( full_name, avatar_url ),
         teacher_subjects ( levels, subjects ( name, slug ) )`
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, student_id, profiles ( full_name )')
      .eq('teacher_id', id)
      .order('created_at', { ascending: false }),
    getCurrentUser(),
  ])

  const teacher = teacherData as unknown as TeacherRow | null
  if (!teacher) notFound()

  // הטלפון חוזר רק אם המורה בחר/ה להציג אותו ורק למשתמש מחובר (RLS)
  const { data: contact } = user
    ? await supabase.from('user_contacts').select('phone').eq('user_id', teacher.id).maybeSingle()
    : { data: null }
  const phone = (contact?.phone as string | null) ?? null

  const reviews = (reviewsData ?? []) as unknown as ReviewRow[]
  const myReview = user ? reviews.find((r) => r.student_id === user.id) ?? null : null
  const name = teacher.profiles.full_name
  const isOwner = user?.id === teacher.id

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <span>כך תלמידים רואים את הפרופיל שלך.</span>
          <Link href="/dashboard" className="font-medium hover:underline">
            עריכת הפרופיל
          </Link>
        </div>
      )}

      {/* כרטיס עליון */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Avatar url={teacher.profiles.avatar_url} name={name} size={112} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{name}</h1>
              <TierBadge tier={teacher.subscription_tier} />
            </div>
            <p className="mt-1 text-gray-600">
              {[teacher.city, teacher.region].filter(Boolean).join(', ')}
              {teacher.years_experience != null && <> · {teacher.years_experience} שנות ניסיון</>}
            </p>
            <Rating avg={teacher.rating_avg} count={teacher.reviews_count} className="mt-2" />
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {teacher.teaches_in_person && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-green-800">שיעורים פרונטליים</span>
              )}
              {teacher.teaches_online && (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">שיעורים אונליין</span>
              )}
            </div>
          </div>
          {teacher.hourly_rate != null && (
            <div className="text-start sm:text-end">
              <div className="text-3xl font-bold text-indigo-700">₪{Number(teacher.hourly_rate)}</div>
              <div className="text-sm text-gray-500">לשעה</div>
            </div>
          )}
        </div>
      </section>

      {/* יצירת קשר */}
      {!isOwner && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-xl font-bold">יצירת קשר</h2>
          {!user ? (
            <p className="text-gray-600">
              <Link
                href={`/login?next=/teachers/${teacher.id}`}
                className="font-medium text-indigo-700 hover:underline"
              >
                התחברו
              </Link>{' '}
              כדי לשלוח הודעה ל{name} או לראות את פרטי הקשר.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {user.role === 'student' && (
                <form action={startConversation}>
                  <input type="hidden" name="teacher_id" value={teacher.id} />
                  <button className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
                    שליחת הודעה באתר
                  </button>
                </form>
              )}
              {phone ? (
                <>
                  <a
                    href={`tel:${phone}`}
                    dir="ltr"
                    className="rounded-lg bg-white px-5 py-2.5 font-medium ring-1 ring-gray-300 hover:bg-gray-50"
                  >
                    📞 {formatPhone(phone)}
                  </a>
                  <a
                    href={whatsappUrl(phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-green-600 px-5 py-2.5 font-medium text-white hover:bg-green-700"
                  >
                    וואטסאפ
                  </a>
                </>
              ) : (
                <p className="text-sm text-gray-500">{name} מעדיף/ה שיחה דרך הצ&apos;אט באתר.</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* מקצועות */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-3 text-xl font-bold">מקצועות</h2>
        {teacher.teacher_subjects.length === 0 ? (
          <p className="text-gray-500">לא הוגדרו מקצועות.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {teacher.teacher_subjects.map((ts) => (
              <li key={ts.subjects.slug} className="flex flex-wrap items-center gap-2 py-2.5">
                <Link
                  href={`/search?subject=${ts.subjects.slug}`}
                  className="font-semibold text-gray-900 hover:text-indigo-700"
                >
                  {ts.subjects.name}
                </Link>
                {ts.levels.map((l) => (
                  <span key={l} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {l}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* על המורה */}
      {teacher.bio && (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-3 text-xl font-bold">קצת עליי</h2>
          <p className="whitespace-pre-line leading-relaxed text-gray-700">{teacher.bio}</p>
        </section>
      )}

      {/* ביקורות */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="mb-4 text-xl font-bold">ביקורות ({reviews.length})</h2>

        <div className="mb-6 rounded-xl bg-gray-50 p-4">
          {!user ? (
            <p className="text-sm text-gray-600">
              למדתם אצל {name}?{' '}
              <Link
                href={`/login?next=/teachers/${teacher.id}`}
                className="font-medium text-indigo-700 hover:underline"
              >
                התחברו כדי לכתוב ביקורת
              </Link>
            </p>
          ) : user.role === 'student' ? (
            <>
              <h3 className="mb-2 font-semibold">{myReview ? 'הביקורת שלך' : 'כתבו ביקורת'}</h3>
              <ReviewForm
                teacherId={teacher.id}
                existing={myReview ? { rating: myReview.rating, comment: myReview.comment } : null}
              />
            </>
          ) : (
            <p className="text-sm text-gray-500">רק תלמידים יכולים לכתוב ביקורות.</p>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-gray-500">עדיין אין ביקורות.</p>
        ) : (
          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.profiles?.full_name ?? 'תלמיד/ה'}</span>
                  <Stars value={r.rating} />
                  <span className="text-xs text-gray-500">{dateFmt.format(new Date(r.created_at))}</span>
                </div>
                {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
