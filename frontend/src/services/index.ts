/**
 * Services Index
 * Export all services from a single entry point
 */

// API services and types
export { apiClient, API_CONFIG, API_ENDPOINTS } from './api'
export type { ApiResponse, ApiError, PaginatedResponse } from './api'

// Conversation service
export { conversationService } from './conversation'
export type {
  ConversationMessage,
  Conversation,
  ConversationFilters,
} from './conversation'

// Vocabulary service
export { vocabularyService } from './vocabulary'
export type {
  VocabularyItem,
  VocabularyFilters,
  VocabularyExtractRequest,
} from './vocabulary'

// YouTube service
export { youtubeService } from './youtube'
export type {
  YouTubeVideo,
  YouTubeTranscript,
  YouTubeAnalysisResult,
  VideoInfo,
  Expression,
  VocabularyExtractionResult,
} from './youtube'

// OBS service
export { obsService } from './obs'
export type {
  OBSScene,
  OBSSource,
  OBSRecordingStatus,
  OBSCommand,
} from './obs'

// Other services
export { default as webSpeechSynthesis } from './WebSpeechSynthesis'
export type { TTSCommand } from './WebSpeechSynthesis'

// Utility function to initialize all services
export const initializeServices = async () => {
  // Add any initialization logic here
  console.log('Services initialized')
}