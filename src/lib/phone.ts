// מספרי טלפון ישראליים: נרמול לפורמט 05XXXXXXXX, תצוגה וקישור לוואטסאפ
// (אותו כלל כמו normalize_il_phone במסד הנתונים)
export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, '')
  if (/^972\d{8,9}$/.test(d)) return '0' + d.slice(3)
  if (/^0\d{8,9}$/.test(d)) return d
  return null
}

export function formatPhone(phone: string): string {
  return phone.length === 10
    ? `${phone.slice(0, 3)}-${phone.slice(3)}`
    : `${phone.slice(0, 2)}-${phone.slice(2)}`
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/972${phone.slice(1)}`
}
