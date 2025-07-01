/**
 * Conversation types
 */

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  language: string
  timestamp: string
  metadata?: {
    confidence?: number
    emotion?: string
    vocabulary?: string[]
  }
}

export interface Conversation {
  id: string
  title: string
  messages: ConversationMessage[]
  language: string
  created_at: string
  updated_at: string
  metadata?: {
    vocabulary_count: number
    duration: number
  }
}

export interface ConversationFilters {
  language?: string
  dateFrom?: string
  dateTo?: string
  hasVocabulary?: boolean
}