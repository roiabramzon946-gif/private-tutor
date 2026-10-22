'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'

const MAX_BYTES = 2 * 1024 * 1024
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// מעלה ישירות מהדפדפן ל-Supabase Storage (bucket "avatars", תיקייה לפי מזהה המשתמש)
export function AvatarUploader({ userId, name, url }: { userId: string; name: string; url: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    const ext = TYPES[file.type]
    if (!ext) return setError('אפשר להעלות רק JPG, PNG או WEBP')
    if (file.size > MAX_BYTES) return setError('התמונה גדולה מ-2MB')

    setBusy(true)
    const supabase = createClient()
    const path = `${userId}/avatar-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) {
      setBusy(false)
      return setError(`ההעלאה נכשלה: ${uploadError.message}`)
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId)

    setBusy(false)
    if (updateError) return setError(`שמירת התמונה נכשלה: ${updateError.message}`)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} size={88} />
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? 'מעלה…' : url ? 'החלפת תמונה' : 'העלאת תמונה'}
        </button>
        <p className="mt-1 text-xs text-gray-500">JPG, PNG או WEBP, עד 2MB</p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
