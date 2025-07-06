/**
 * API configuration
 */

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  websocketURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
}

export const API_ENDPOINTS = {
  // Conversation endpoints
  conversation: {
    list: '/api/v1/conversations',
    get: (id: string) => `/api/v1/conversations/${id}`,
    create: '/api/v1/conversations',
    delete: (id: string) => `/api/v1/conversations/${id}`,
  },
  
  // Vocabulary endpoints
  vocabulary: {
    list: '/api/v1/vocabulary',
    get: (id: string) => `/api/v1/vocabulary/${id}`,
    create: '/api/v1/vocabulary',
    update: (id: string) => `/api/v1/vocabulary/${id}`,
    delete: (id: string) => `/api/v1/vocabulary/${id}`,
    search: '/api/v1/vocabulary/search',
    extract: '/api/v1/youtube/extract-vocabulary',
  },
  
  // YouTube endpoints
  youtube: {
    analyze: '/api/v1/youtube/extract-vocabulary', // Map analyze to extract-vocabulary endpoint
    transcript: (videoId: string) => `/api/v1/youtube/transcript/${videoId}`,
    metadata: (videoId: string) => `/api/v1/youtube/metadata/${videoId}`,
    search: '/api/v1/youtube/search',
    batchExtract: '/api/v1/youtube/batch-extract',
    batchStatus: (batchId: string) => `/api/v1/youtube/batch-status/${batchId}`,
    batchHistory: '/api/v1/youtube/batch-history',
  },
  
  // WebSocket endpoints
  websocket: {
    audio: '/ws/audio',
    obs: '/ws/obs',
  },
}