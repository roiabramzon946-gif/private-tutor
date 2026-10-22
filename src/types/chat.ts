import type { UserRole } from './db'

export type ChatMessage = {
  id: number
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
  pending?: boolean // נשלחה ועוד לא אושרה מהשרת
  failed?: boolean
}

export type ConversationSummary = {
  conversation_id: string
  other_id: string
  other_name: string
  other_avatar: string | null
  other_role: UserRole
  last_message: string | null
  last_sender_id: string | null
  last_message_at: string
  unread_count: number
}
