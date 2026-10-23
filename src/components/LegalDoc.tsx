import Link from 'next/link'
import type { ReactNode } from 'react'
import { LEGAL_UPDATED_LABEL } from '@/lib/legal'

// מציג מסמך משפטי שנכתב ב-Markdown פשוט:
// כותרות (#, ##), פסקאות, רשימות (-), טבלאות (|), **מודגש** ו-[קישור](/נתיב)
export function LegalDoc({ source }: { source: string }) {
  const blocks = source.trim().split(/\n\s*\n/)
  return (
    <article className="rounded-2xl bg-white p-6 leading-relaxed text-gray-800 shadow-sm ring-1 ring-gray-100 sm:p-10">
      {blocks.map((block, i) => renderBlock(block.trim(), i))}
    </article>
  )
}

function renderBlock(block: string, key: number): ReactNode {
  if (block.startsWith('# ')) {
    return (
      <header key={key} className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{inline(block.slice(2))}</h1>
        <p className="mt-1 text-sm text-gray-500">עדכון אחרון: {LEGAL_UPDATED_LABEL}</p>
      </header>
    )
  }
  if (block.startsWith('## ')) {
    return (
      <h2 key={key} className="mt-8 mb-3 text-xl font-bold text-gray-900">
        {inline(block.slice(3))}
      </h2>
    )
  }
  const lines = block.split('\n')
  if (lines.every((l) => l.startsWith('- '))) {
    return (
      <ul key={key} className="my-3 list-disc space-y-1.5 ps-6">
        {lines.map((l, j) => (
          <li key={j}>{inline(l.slice(2))}</li>
        ))}
      </ul>
    )
  }
  if (lines.every((l) => l.startsWith('|'))) {
    const rows = lines
      .filter((l) => !/^\|\s*-/.test(l))
      .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    const [head, ...body] = rows
    return (
      <div key={key} className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {head.map((c, j) => (
                <th key={j} className="border border-gray-200 bg-gray-50 p-2 text-start font-semibold">
                  {inline(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, j) => (
              <tr key={j}>
                {r.map((c, k) => (
                  <td key={k} className="border border-gray-200 p-2 align-top">
                    {inline(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return (
    <p key={key} className="my-3">
      {inline(lines.join(' '))}
    </p>
  )
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((\/[^)\s]*)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out.push(<strong key={m.index}>{m[1]}</strong>)
    } else {
      out.push(
        <Link key={m.index} href={m[3]} className="font-medium text-indigo-700 underline">
          {m[2]}
        </Link>,
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
