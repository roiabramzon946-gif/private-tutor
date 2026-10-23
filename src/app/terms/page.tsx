import type { Metadata } from 'next'
import { LegalDoc } from '@/components/LegalDoc'
import { TERMS_MD } from '@/content/legal/terms'

export const metadata: Metadata = { title: 'תנאי שימוש' }

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <LegalDoc source={TERMS_MD} />
    </main>
  )
}
