/**
 * YouTube Service
 */

import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/config'
import { VocabularyItem } from '../vocabulary/types'

export interface VideoInfo {
  video_id: string
  title: string
  channel: string
  channel_title?: string  // Also support channel_title from API
  channel_id: string
  description: string
  thumbnail: string
  thumbnail_url?: string  // Also support thumbnail_url from API
  duration: number
  view_count: number
  like_count: number
  published_at: string
}

export interface TranscriptEntry {
  text: string
  start: number
  duration: number
  end: number
}

export interface TranscriptData {
  timestamp: number
  window: number
  text: string
  start: number
  end: number
  entries?: TranscriptEntry[]
  error?: string
}

export interface Expression {
  japanese: string
  type: string
  description: string
  context: string
  timestamp: number
  video_time: string
}

export interface VideoAnalysisResult {
  video_info: VideoInfo
  timestamp?: number
  transcript?: TranscriptData
  expressions?: Expression[]
}

export interface VocabularyExtractionResult {
  video_info: VideoInfo
  vocabulary_extracted: number
  vocabulary_items: VocabularyItem[]
  language_stats: {
    japanese_ratio: number
    english_ratio: number
    mixed_language: boolean
  }
  error?: string
}

export interface VideoSearchResult {
  video_id: string
  title: string
  channel: string
  thumbnail: string
  published_at: string
}

export interface VideoSearchResponse {
  query: string
  results: VideoSearchResult[]
  count: number
}

export interface BatchExtractRequest {
  urls: string[]
}

export interface BatchExtractResponse {
  batch_id: string
  status: string
  total_videos: number
  message: string
}

export interface BatchProgress {
  total: number
  completed: number
  failed: number
  current_url?: string
  progress_percentage: number
}

export interface BatchStatusResponse {
  batch_id: string
  status: 'processing' | 'completed'
  progress: BatchProgress
  results?: {
    batch_id: string
    total_videos: number
    successful: number
    failed: number
    total_vocabulary: number
    results: Array<{
      url: string
      vocabulary_extracted: number
      video_title: string
    }>
    errors: Array<{
      url: string
      error: string
    }>
  }
}

class YouTubeService {
  /**
   * Analyze YouTube video
   */
  async analyzeVideo(
    url: string,
    timestamp?: number
  ): Promise<VideoAnalysisResult> {
    return apiClient.get<VideoAnalysisResult>(
      API_ENDPOINTS.youtube.analyze,
      { url, timestamp }
    )
  }

  /**
   * Extract vocabulary from video
   */
  async extractVocabulary(url: string): Promise<VocabularyExtractionResult> {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.vocabulary.extract,
      { url }
    )
    
    // Transform API response to expected format
    if (response.data) {
      const stats = response.data.language_stats;
      const videoInfo = response.data.video_info;
      
      // Map API fields to expected format
      const normalizedVideoInfo: VideoInfo = {
        video_id: videoInfo.video_id,
        title: videoInfo.title,
        channel: videoInfo.channel_title || videoInfo.channel, // Use channel_title from API
        channel_id: videoInfo.channel_id,
        description: videoInfo.description,
        thumbnail: videoInfo.thumbnail_url || videoInfo.thumbnail, // Use thumbnail_url from API
        duration: videoInfo.duration,
        view_count: videoInfo.view_count,
        like_count: videoInfo.like_count,
        published_at: videoInfo.published_at
      };
      
      // Map vocabulary items to expected format
      const mappedVocabularyItems = (response.data.vocabulary_items || []).map((item: any) => ({
        id: item.id || String(Math.random()),
        japanese: item.japanese_text || item.japanese,
        reading: item.reading,
        english: item.english_text || item.english,
        context: item.context,
        difficulty: item.difficulty_level || item.difficulty || 1,
        tags: item.tags || [],
        source: 'video' as const,
        video_id: item.source_video_id || item.video_id,
        timestamp: item.video_timestamp || item.timestamp,
        notes: item.notes,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at
      }));
      
      return {
        video_info: normalizedVideoInfo,
        vocabulary_extracted: response.data.vocabulary_count || response.vocabulary_count,
        vocabulary_items: mappedVocabularyItems,
        language_stats: {
          japanese_ratio: stats?.total_segments > 0 ? (stats.japanese_segments / stats.total_segments * 100) : 0,
          english_ratio: stats?.total_segments > 0 ? (stats.english_segments / stats.total_segments * 100) : 0,
          mixed_language: (stats?.mixed_segments || 0) > 0
        }
      }
    }
    
    // Fallback for direct response format
    const stats = response.language_stats;
    const videoInfo = response.video_info;
    
    // Map vocabulary items for fallback case
    const mappedVocabularyItems = (response.vocabulary_items || []).map((item: any) => ({
      id: item.id || String(Math.random()),
      japanese: item.japanese_text || item.japanese,
      reading: item.reading,
      english: item.english_text || item.english,
      context: item.context,
      difficulty: item.difficulty_level || item.difficulty || 1,
      tags: item.tags || [],
      source: 'video' as const,
      video_id: item.source_video_id || item.video_id,
      timestamp: item.video_timestamp || item.timestamp,
      notes: item.notes,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at
    }));
    
    // Map video info for fallback case
    const normalizedVideoInfo: VideoInfo = videoInfo ? {
      video_id: videoInfo.video_id,
      title: videoInfo.title,
      channel: videoInfo.channel_title || videoInfo.channel,
      channel_id: videoInfo.channel_id,
      description: videoInfo.description,
      thumbnail: videoInfo.thumbnail_url || videoInfo.thumbnail,
      duration: videoInfo.duration,
      view_count: videoInfo.view_count,
      like_count: videoInfo.like_count,
      published_at: videoInfo.published_at
    } : {} as VideoInfo;
    
    return {
      video_info: normalizedVideoInfo,
      vocabulary_extracted: response.vocabulary_count || response.vocabulary_extracted || 0,
      vocabulary_items: mappedVocabularyItems,
      language_stats: {
        japanese_ratio: stats?.total_segments > 0 ? (stats.japanese_segments / stats.total_segments * 100) : 0,
        english_ratio: stats?.english_segments > 0 ? (stats.english_segments / stats.total_segments * 100) : 0,
        mixed_language: (stats?.mixed_segments || 0) > 0
      }
    }
  }

  /**
   * Search for Vtuber clips
   */
  async searchClips(
    query: string,
    maxResults: number = 10
  ): Promise<VideoSearchResponse> {
    return apiClient.get<VideoSearchResponse>(
      '/api/v1/youtube/search',
      { query, max_results: maxResults }
    )
  }

  /**
   * Extract video ID from URL
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Format video duration
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Format timestamp for video link
   */
  formatTimestampLink(videoId: string, timestamp: number): string {
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`
  }

  /**
   * Calculate estimated vocabulary count
   */
  estimateVocabularyCount(duration: number): number {
    // Rough estimate: 1 expression per 30 seconds
    return Math.floor(duration / 30)
  }

  /**
   * Group expressions by type
   */
  groupExpressionsByType(expressions: Expression[]): Record<string, Expression[]> {
    const grouped: Record<string, Expression[]> = {}

    expressions.forEach(expr => {
      if (!grouped[expr.type]) {
        grouped[expr.type] = []
      }
      grouped[expr.type].push(expr)
    })

    return grouped
  }

  /**
   * Filter expressions by difficulty estimate
   */
  filterExpressionsByDifficulty(
    expressions: Expression[],
    minDifficulty: number = 1,
    maxDifficulty: number = 5
  ): Expression[] {
    // Simple heuristic based on expression type
    const difficultyMap: Record<string, number> = {
      'internet_slang': 2,
      'slang': 3,
      'otaku_term': 3,
      'casual_ending': 2,
      'grammar': 4,
    }

    return expressions.filter(expr => {
      const difficulty = difficultyMap[expr.type] || 3
      return difficulty >= minDifficulty && difficulty <= maxDifficulty
    })
  }

  /**
   * Create shareable vocabulary list
   */
  createShareableVocabularyList(
    videoInfo: VideoInfo,
    expressions: Expression[]
  ): string {
    const lines = [
      `📺 ${videoInfo.title}`,
      `👤 ${videoInfo.channel}`,
      `🔗 https://youtu.be/${videoInfo.video_id}`,
      '',
      '📚 Vocabulary List:',
      '',
    ]

    expressions.forEach((expr, index) => {
      lines.push(
        `${index + 1}. ${expr.japanese} - ${expr.description} (${expr.video_time})`
      )
    })

    return lines.join('\n')
  }

  /**
   * Start batch extraction
   */
  async startBatchExtraction(urls: string[]): Promise<BatchExtractResponse> {
    return apiClient.post<BatchExtractResponse>(
      '/api/v1/youtube/batch-extract',
      { urls }
    )
  }

  /**
   * Get batch extraction status
   */
  async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    return apiClient.get<BatchStatusResponse>(
      `/api/v1/youtube/batch-status/${batchId}`
    )
  }

  /**
   * Poll batch status until completion
   */
  async pollBatchStatus(
    batchId: string,
    onProgress?: (progress: BatchProgress) => void,
    pollInterval: number = 2000,
    onConnectionLost?: () => void
  ): Promise<BatchStatusResponse> {
    return new Promise((resolve, reject) => {
      let errorCount = 0;
      const maxErrors = 3;

      const poll = async () => {
        try {
          const status = await this.getBatchStatus(batchId)
          
          // Reset error count on successful request
          errorCount = 0;
          
          if (onProgress) {
            onProgress(status.progress)
          }

          if (status.status === 'completed') {
            resolve(status)
          } else {
            setTimeout(poll, pollInterval)
          }
        } catch (error) {
          errorCount++;
          
          if (errorCount >= maxErrors) {
            if (onConnectionLost) {
              onConnectionLost();
            }
            reject(error);
          } else {
            // Retry with exponential backoff
            setTimeout(poll, pollInterval * Math.pow(2, errorCount));
          }
        }
      }

      poll()
    })
  }

  /**
   * Get batch processing history
   */
  async getBatchHistory(limit: number = 10): Promise<any> {
    return apiClient.get('/api/v1/youtube/batch-history', { limit })
  }

  /**
   * Get batch details
   */
  async getBatchDetails(batchId: string): Promise<any> {
    return apiClient.get(`/api/v1/youtube/batch-history/${batchId}`)
  }
}

// Singleton instance
const youtubeService = new YouTubeService()

export default youtubeService