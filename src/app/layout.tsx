import type { Metadata } from 'next'
import Link from 'next/link'
import { Heebo } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { PageBand } from '@/components/PageBand'
import './globals.css'

const heebo = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-heebo' })

export const metadata: Metadata = {
  title: { default: 'TutorIL — מורים פרטיים בכל הארץ', template: '%s | TutorIL' },
  description: 'TutorIL — מצאו מורה פרטי לכל מקצוע: בית ספר, פסיכומטרי ואקדמיה, פרונטלי ואונליין',
  applicationName: 'TutorIL',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutoril.co'),
  openGraph: { siteName: 'TutorIL', locale: 'he_IL', type: 'website' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900 antialiased">
        <SiteHeader />
        <div className="relative flex-1">
          <PageBand />
          <div className="relative">{children}</div>
        </div>
        <footer className="border-t border-gray-200 bg-white py-6 text-sm text-gray-500">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4">
            <span>© TutorIL</span>
            <Link href="/terms" className="hover:text-indigo-700">
              תנאי שימוש
            </Link>
            <Link href="/privacy" className="hover:text-indigo-700">
              מדיניות פרטיות
            </Link>
          </div>
        </footer>
      </body>
    </html>
  )
}
