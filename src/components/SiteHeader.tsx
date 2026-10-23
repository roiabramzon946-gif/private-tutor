import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'
import { Avatar } from './Avatar'
import { UnreadBadge } from './UnreadBadge'
import { MobileMenu } from './MobileMenu'

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" dir="ltr" aria-label="TutorIL — דף הבית" className="text-xl font-extrabold tracking-tight text-gray-900">
          Tutor<span className="text-indigo-600">IL</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Suspense fallback={<div className="h-9 w-32" />}>
            <UserMenu />
          </Suspense>
        </nav>
      </div>
    </header>
  )
}

async function UserMenu() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/search" className="hidden px-1 text-gray-700 hover:text-indigo-700 sm:inline">
          חיפוש מורים
        </Link>
        <Link href="/login" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100">
          התחברות
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
        >
          הרשמה
        </Link>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: unread } = await supabase.rpc('unread_messages_count')
  const unreadCount = Number(unread ?? 0)
  const requestsHref = user.role === 'teacher' ? '/requests' : '/requests/mine'
  const requestsLabel = user.role === 'teacher' ? 'בקשות לימוד' : 'הבקשות שלי'

  return (
    <div className="flex items-center gap-3">
      <Link href="/search" className="hidden text-gray-700 hover:text-indigo-700 sm:inline">
        חיפוש מורים
      </Link>
      <Link href={requestsHref} className="hidden text-gray-700 hover:text-indigo-700 sm:inline">
        {requestsLabel}
      </Link>
      <UnreadBadge initial={unreadCount} />
      <Link href="/dashboard" className="hidden text-gray-700 hover:text-indigo-700 sm:inline">
        האזור שלי
      </Link>
      <span className="hidden items-center gap-2 md:flex">
        <Avatar url={user.avatarUrl} name={user.fullName} size={28} />
        <span className="text-gray-900">{user.fullName}</span>
      </span>
      <form action={logout} className="hidden sm:block">
        <button className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100">התנתקות</button>
      </form>
      <MobileMenu
        items={[
          { href: '/search', label: 'חיפוש מורים' },
          { href: requestsHref, label: requestsLabel },
          { href: '/dashboard', label: 'האזור שלי' },
        ]}
        logout={logout}
      />
    </div>
  )
}
