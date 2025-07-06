/**
 * Vocabulary Service
 */

import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/config'
import { VocabularyItem } from './types'

export interface VocabularyListResponse {
  items: VocabularyItem[]
  count: number
}

export interface VocabularyCreateResponse {
  id: string
  notion_id?: string
  message: string
}

class VocabularyService {
  /**
   * Get vocabulary items
   */
  async getVocabularyItems(params?: {
    limit?: number
    difficulty?: number
    search?: string
  }): Promise<VocabularyListResponse> {
    return apiClient.get<VocabularyListResponse>(
      API_ENDPOINTS.vocabulary.list,
      params
    )
  }

  /**
   * Create vocabulary item
   */
  async createVocabularyItem(
    item: VocabularyItem
  ): Promise<VocabularyCreateResponse> {
    return apiClient.post<VocabularyCreateResponse>(
      API_ENDPOINTS.vocabulary.create,
      item
    )
  }

  /**
   * Search vocabulary
   */
  async searchVocabulary(query: string): Promise<VocabularyListResponse> {
    return this.getVocabularyItems({ search: query })
  }

  /**
   * Get vocabulary by difficulty
   */
  async getVocabularyByDifficulty(
    difficulty: number,
    limit: number = 50
  ): Promise<VocabularyListResponse> {
    return this.getVocabularyItems({ difficulty, limit })
  }

  /**
   * Create multiple vocabulary items
   */
  async createBatchVocabularyItems(
    items: VocabularyItem[]
  ): Promise<VocabularyCreateResponse[]> {
    const results = await Promise.allSettled(
      items.map(item => this.createVocabularyItem(item))
    )

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<VocabularyCreateResponse>).value)
  }

  /**
   * Format vocabulary item for display
   */
  formatVocabularyItem(item: VocabularyItem): string {
    const parts = [item.japanese]
    
    if (item.reading) {
      parts.push(`【${item.reading}】`)
    }
    
    parts.push(`- ${item.english}`)
    
    if (item.difficulty) {
      parts.push(`(Lv.${item.difficulty})`)
    }
    
    return parts.join(' ')
  }

  /**
   * Group vocabulary by tags
   */
  groupVocabularyByTags(items: VocabularyItem[]): Record<string, VocabularyItem[]> {
    const grouped: Record<string, VocabularyItem[]> = {}
    
    items.forEach(item => {
      if (item.tags) {
        item.tags.forEach(tag => {
          if (!grouped[tag]) {
            grouped[tag] = []
          }
          grouped[tag].push(item)
        })
      } else {
        if (!grouped['untagged']) {
          grouped['untagged'] = []
        }
        grouped['untagged'].push(item)
      }
    })
    
    return grouped
  }

  /**
   * Filter vocabulary by source
   */
  filterVocabularyBySource(
    items: VocabularyItem[],
    source: string
  ): VocabularyItem[] {
    return items.filter(item => item.source === source)
  }

  /**
   * Sort vocabulary by creation date
   */
  sortVocabularyByDate(
    items: VocabularyItem[],
    order: 'asc' | 'desc' = 'desc'
  ): VocabularyItem[] {
    return [...items].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      
      return order === 'desc' ? dateB - dateA : dateA - dateB
    })
  }

  /**
   * Get user's learning progress for a vocabulary item
   */
  async getVocabularyProgress(vocabularyId: string): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.vocabulary.list}/${vocabularyId}/progress`)
  }

  /**
   * Update user's learning progress for a vocabulary item
   */
  async updateVocabularyProgress(vocabularyId: string, progress: any): Promise<any> {
    return apiClient.post(`${API_ENDPOINTS.vocabulary.list}/${vocabularyId}/progress`, progress)
  }

  /**
   * Get user's overall learning statistics
   */
  async getLearningStats(): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.vocabulary.list}/progress/stats`)
  }

  /**
   * Get vocabulary items due for review
   */
  async getDueReviews(limit: number = 50): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.vocabulary.list}/progress/due`, { limit })
  }

  /**
   * Record a review session
   */
  async recordReview(vocabularyId: string, correct: boolean, timeSpentSeconds?: number): Promise<any> {
    return apiClient.post(`${API_ENDPOINTS.vocabulary.list}/${vocabularyId}/review`, {
      correct,
      time_spent_seconds: timeSpentSeconds
    })
  }

  /**
   * Export vocabulary to CSV
   */
  async exportToCSV(params?: { difficulty_level?: number; limit?: number }): Promise<any> {
    const response = await fetch(`${API_ENDPOINTS.vocabulary.list}/export/csv?${new URLSearchParams(params as any)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    return response.text()
  }

  /**
   * Export vocabulary to JSON
   */
  async exportToJSON(params?: { difficulty_level?: number; limit?: number }): Promise<any> {
    const response = await fetch(`${API_ENDPOINTS.vocabulary.list}/export/json?${new URLSearchParams(params as any)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    return response.text()
  }

  /**
   * Export vocabulary to Anki deck
   */
  async exportToAnki(params?: { difficulty_level?: number; limit?: number; deck_name?: string }): Promise<any> {
    const response = await fetch(`${API_ENDPOINTS.vocabulary.list}/export/anki?${new URLSearchParams(params as any)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    return response.blob()
  }
}

// Singleton instance
const vocabularyService = new VocabularyService()

export default vocabularyService