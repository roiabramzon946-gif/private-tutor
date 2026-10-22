import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">הדף לא נמצא</h1>
      <p className="mt-2 text-gray-600">ייתכן שהקישור שגוי או שהמורה כבר לא פעיל/ה.</p>
      <Link href="/search" className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-white">
        לחיפוש מורים
      </Link>
    </main>
  )
}
