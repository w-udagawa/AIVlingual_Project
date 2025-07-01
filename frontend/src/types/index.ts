/**
 * Common type definitions
 */

export interface Message {
  id: string
  speaker: 'user' | 'ai'
  text: string
  timestamp: Date
  language?: 'ja' | 'en' | 'mixed'
}

export interface VocabularyItem {
  id: string
  japanese_text: string
  english_text: string
  reading?: string
  difficulty_level: number
  context?: string
  example_sentence?: string
  tags?: string[]
  source?: string
  created_at?: string
}

export interface ConversationSession {
  id: string
  started_at: string
  ended_at?: string
  message_count: number
  vocabulary_count?: number
}

export interface BatchProcessingResult {
  batch_id: string
  total: number
  completed: number
  failed: number
  progress_percentage: number
  results?: Array<{
    url: string
    success: boolean
    error?: string
    vocabulary_count?: number
  }>
}