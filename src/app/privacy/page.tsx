import type { Metadata } from 'next'
import { LegalDoc } from '@/components/LegalDoc'
import { PRIVACY_MD } from '@/content/legal/privacy'

export const metadata: Metadata = { title: 'מדיניות פרטיות' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <LegalDoc source={PRIVACY_MD} />
    </main>
  )
}
