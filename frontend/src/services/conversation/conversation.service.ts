/**
 * Conversation Service
 */

import apiClient from '../api/client'
import { API_ENDPOINTS } from '../api/config'

export interface ConversationTurn {
  id: string
  session_id: string
  user_input: string
  ai_response: string
  user_language: string
  response_language: string
  timestamp: string
  metadata?: any
}

export interface ConversationHistoryResponse {
  session_id: string
  history: ConversationTurn[]
  count: number
}

export interface Statistics {
  total_conversations: number
  total_vocabulary_items: number
  active_sessions: number
  languages_used: Record<string, number>
  vocabulary_by_difficulty: Record<string, number>
  recent_activity: {
    date: string
    conversations: number
    vocabulary_added: number
  }[]
}

class ConversationService {
  /**
   * Get conversation history
   */
  async getConversationHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ConversationHistoryResponse> {
    return apiClient.get<ConversationHistoryResponse>(
      API_ENDPOINTS.conversation.get(sessionId),
      { limit }
    )
  }

  /**
   * Get system statistics
   */
  async getStatistics(): Promise<Statistics> {
    return apiClient.get<Statistics>('/api/v1/statistics')
  }

  /**
   * Format conversation for display
   */
  formatConversation(turn: ConversationTurn): {
    user: string
    assistant: string
    timestamp: Date
  } {
    return {
      user: turn.user_input,
      assistant: turn.ai_response,
      timestamp: new Date(turn.timestamp),
    }
  }

  /**
   * Extract vocabulary from conversation history
   */
  extractVocabularyFromHistory(
    history: ConversationTurn[]
  ): { japanese: string[]; english: string[] } {
    const japanese: string[] = []
    const english: string[] = []

    history.forEach(turn => {
      // Extract from user input
      if (turn.user_language === 'ja') {
        japanese.push(turn.user_input)
      } else if (turn.user_language === 'en') {
        english.push(turn.user_input)
      }

      // Extract from AI response
      if (turn.response_language === 'ja') {
        japanese.push(turn.ai_response)
      } else if (turn.response_language === 'en') {
        english.push(turn.ai_response)
      }
    })

    return { japanese, english }
  }

  /**
   * Calculate conversation statistics
   */
  calculateConversationStats(history: ConversationTurn[]): {
    totalTurns: number
    averageResponseLength: number
    languageDistribution: Record<string, number>
    timeSpan: { start: Date; end: Date } | null
  } {
    if (history.length === 0) {
      return {
        totalTurns: 0,
        averageResponseLength: 0,
        languageDistribution: {},
        timeSpan: null,
      }
    }

    const languageCount: Record<string, number> = {}
    let totalResponseLength = 0

    history.forEach(turn => {
      // Count languages
      languageCount[turn.user_language] = (languageCount[turn.user_language] || 0) + 1
      languageCount[turn.response_language] = (languageCount[turn.response_language] || 0) + 1
      
      // Sum response lengths
      totalResponseLength += turn.ai_response.length
    })

    const timestamps = history.map(turn => new Date(turn.timestamp))
    const timeSpan = {
      start: new Date(Math.min(...timestamps.map(d => d.getTime()))),
      end: new Date(Math.max(...timestamps.map(d => d.getTime()))),
    }

    return {
      totalTurns: history.length,
      averageResponseLength: Math.round(totalResponseLength / history.length),
      languageDistribution: languageCount,
      timeSpan,
    }
  }

  /**
   * Export conversation as text
   */
  exportConversationAsText(history: ConversationTurn[]): string {
    const lines = ['AIVlingual Conversation Export', '='.repeat(30), '']

    history.forEach((turn) => {
      const timestamp = new Date(turn.timestamp).toLocaleString()
      lines.push(
        `[${timestamp}]`,
        `User (${turn.user_language}): ${turn.user_input}`,
        `AI (${turn.response_language}): ${turn.ai_response}`,
        ''
      )
    })

    return lines.join('\n')
  }

  /**
   * Export conversation as CSV
   */
  exportConversationAsCSV(history: ConversationTurn[]): string {
    const headers = [
      'Timestamp',
      'User Input',
      'User Language',
      'AI Response',
      'Response Language',
    ]

    const rows = history.map(turn => [
      new Date(turn.timestamp).toISOString(),
      `"${turn.user_input.replace(/"/g, '""')}"`,
      turn.user_language,
      `"${turn.ai_response.replace(/"/g, '""')}"`,
      turn.response_language,
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }
}

// Singleton instance
const conversationService = new ConversationService()

export default conversationService