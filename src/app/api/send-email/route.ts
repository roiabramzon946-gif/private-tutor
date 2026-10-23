// שליחת מייל דרך Gmail (SMTP). נקרא רק מ-Supabase (pg_cron + pg_net), מוגן בסוד משותף.
import { timingSafeEqual } from 'node:crypto'
import nodemailer from 'nodemailer'
import { NextResponse, type NextRequest } from 'next/server'

function authorized(header: string | null): boolean {
  const secret = process.env.NOTIFY_SECRET
  if (!secret || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null

export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get('x-notify-secret'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!transporter) {
    return NextResponse.json({ error: 'gmail is not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const to = typeof body?.to === 'string' ? body.to : ''
  const subject = typeof body?.subject === 'string' ? body.subject.slice(0, 200) : ''
  const html = typeof body?.html === 'string' ? body.html.slice(0, 20000) : ''
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !subject || !html) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  try {
    const info = await transporter.sendMail({
      from: { name: 'TutorIL', address: process.env.GMAIL_USER! },
      to,
      subject,
      html,
    })
    return NextResponse.json({ ok: true, id: info.messageId })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
