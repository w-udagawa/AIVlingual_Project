/**
 * Vocabulary types
 */

export interface VocabularyItem {
  id: string
  japanese: string
  reading?: string
  english: string
  context?: string
  difficulty: number
  tags: string[]
  source: 'conversation' | 'video' | 'manual'
  video_id?: string
  timestamp?: number
  notes?: string
  created_at: string
  updated_at?: string
}

export interface VocabularyFilters {
  difficulty?: number
  tags?: string[]
  source?: string
  dateFrom?: string
  dateTo?: string
}

export interface VocabularyExtractRequest {
  source_type: 'conversation' | 'video'
  transcript?: string
  video_id?: string
  context?: Record<string, any>
  sync_to_notion?: boolean
}