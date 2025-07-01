/**
 * YouTube service types
 */

// Re-export types from service for compatibility
export type { VideoInfo, Expression, VocabularyExtractionResult } from './youtube.service'

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  channel: string
  duration: number
  publishedAt: string
  thumbnailUrl: string
}

export interface YouTubeTranscript {
  text: string
  start: number
  duration: number
  language?: string
}

export interface YouTubeAnalysisResult {
  video: YouTubeVideo
  transcript: YouTubeTranscript[]
  vocabulary: Array<{
    japanese: string
    english: string
    timestamp: number
    difficulty: number
  }>
  summary: string
}