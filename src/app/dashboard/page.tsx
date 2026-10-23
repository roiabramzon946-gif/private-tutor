import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { getLocalities, getSubjects } from '@/lib/data'
import { AvatarUploader } from './AvatarUploader'
import { ProfileForm, type ProfileValues } from './ProfileForm'
import { AccountForm } from './AccountForm'
import { SubscriptionCard } from './SubscriptionCard'

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
        <Dashboard />
      </Suspense>
    </main>
  )
}


async function Dashboard() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/dashboard')

  const supabase = await createClient()

  if (user.role !== 'teacher') {
    const { data: contact } = await supabase
      .from('user_contacts')
      .select('phone, email_notifications')
      .eq('user_id', user.id)
      .maybeSingle()
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">האזור שלי</h1>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-lg font-bold">פרטים אישיים</h2>
          <AccountForm
            fullName={user.fullName}
            phone={contact?.phone ?? ''}
            emailNotifications={contact?.email_notifications ?? true}
          />
        </section>
        <div className="flex flex-wrap gap-3">
          <Link href="/messages" className="rounded-lg bg-white px-5 py-2.5 font-medium ring-1 ring-gray-200 hover:bg-gray-50">
            ההודעות שלי
          </Link>
          <Link href="/requests/mine" className="rounded-lg bg-white px-5 py-2.5 font-medium ring-1 ring-gray-200 hover:bg-gray-50">
            בקשות הלימוד שלי
          </Link>
          <Link href="/search" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
            לחיפוש מורים
          </Link>
        </div>
      </div>
    )
  }

  const [{ data: teacher }, subjects, { data: mySubjects }, { data: subs }, { data: contact }, localities] = await Promise.all([
    supabase
      .from('teachers')
      .select('bio, hourly_rate, city, region, teaches_online, teaches_in_person, years_experience, is_active, rating_avg, reviews_count')
      .eq('id', user.id)
      .single(),
    getSubjects(),
    supabase.from('teacher_subjects').select('subject_id, levels').eq('teacher_id', user.id),
    supabase
      .from('subscriptions')
      .select('tier, status, current_period_end, cancel_at_period_end')
      .eq('teacher_id', user.id)
      .order('current_period_end', { ascending: false }),
    supabase
      .from('user_contacts')
      .select('phone, show_phone, email_notifications')
      .eq('user_id', user.id)
      .maybeSingle(),
    getLocalities(),
  ])

  const now = new Date()
  const activeSub = (subs ?? []).find(
    (s) => ['active', 'trialing'].includes(s.status) && new Date(s.current_period_end) > now
  )
  const premium =
    activeSub?.tier === 'premium'
      ? { periodEnd: activeSub.current_period_end as string, cancelAtPeriodEnd: !!activeSub.cancel_at_period_end }
      : null

  const values: ProfileValues = {
    fullName: user.fullName,
    bio: teacher?.bio ?? '',
    city: teacher?.city ?? '',
    region: teacher?.region ?? '',
    hourlyRate: teacher?.hourly_rate ?? null,
    yearsExperience: teacher?.years_experience ?? null,
    teachesOnline: teacher?.teaches_online ?? false,
    teachesInPerson: teacher?.teaches_in_person ?? true,
    isActive: teacher?.is_active ?? true,
    phone: contact?.phone ?? '',
    showPhone: contact?.show_phone ?? false,
    emailNotifications: contact?.email_notifications ?? true,
    subjects: Object.fromEntries((mySubjects ?? []).map((r) => [r.subject_id, r.levels])),
  }

  const missing = [
    !values.hourlyRate && 'מחיר לשעה',
    !(mySubjects ?? []).length && 'מקצועות',
    !user.avatarUrl && 'תמונה',
    !values.bio && 'תיאור',
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">האזור שלי</h1>
        <Link href={`/teachers/${user.id}`} className="text-sm font-medium text-indigo-700 hover:underline">
          צפייה בפרופיל הציבורי ←
        </Link>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          כדי שתלמידים ימצאו אותך, כדאי להשלים: {missing.join(', ')}.
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-lg font-bold">תמונת פרופיל</h2>
          <AvatarUploader userId={user.id} name={user.fullName} url={user.avatarUrl} />
        </section>

        <SubscriptionCard
          premium={premium}
          rating={{ avg: Number(teacher?.rating_avg ?? 0), count: teacher?.reviews_count ?? 0 }}
        />
      </div>

      <ProfileForm subjects={subjects} localities={localities} values={values} />
    </div>
  )
}
