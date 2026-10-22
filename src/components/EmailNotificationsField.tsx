export function EmailNotificationsField({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        name="email_notifications"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-indigo-600"
      />
      <span>
        התראה במייל על הודעות חדשות
        <span className="block text-xs text-gray-500">
          נשלחת רק אם הודעה לא נקראה תוך 5 דקות, לכל היותר פעם בשעה לכל שיחה
        </span>
      </span>
    </label>
  )
}
