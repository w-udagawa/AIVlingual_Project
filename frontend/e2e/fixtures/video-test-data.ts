/**
 * Test data for video analysis E2E tests
 */

export interface TestVideo {
  url: string
  expectedTitle?: RegExp | string
  minVocabularyCount: number
  description?: string
  expectedDuration?: number // in seconds
}

export interface TestBatch {
  name: string
  urls: string[]
  expectedSuccessCount: number
  expectedFailCount: number
}

export const TEST_VIDEOS = {
  // Valid test videos
  valid: [
    {
      url: 'https://youtu.be/knbMyna6DGs',
      expectedTitle: /.*/,  // Will match any title
      minVocabularyCount: 5,
      description: 'Test video 1 - Expected to have Japanese vocabulary'
    },
    {
      url: 'https://youtu.be/klgWQcUmWJc',
      expectedTitle: /.*/,
      minVocabularyCount: 5,
      description: 'Test video 2 - Expected to have Japanese vocabulary'
    }
  ] as TestVideo[],

  // Invalid URLs for error testing
  invalid: [
    {
      url: 'https://youtu.be/invalid_id_123',
      expectedError: 'Video not found',
      description: 'Invalid video ID'
    },
    {
      url: 'not-a-url',
      expectedError: 'Invalid URL format',
      description: 'Malformed URL'
    },
    {
      url: 'https://youtube.com/watch?v=',
      expectedError: 'Missing video ID',
      description: 'Empty video ID'
    }
  ],

  // Videos for specific test scenarios
  scenarios: {
    // Short video for quick tests
    shortVideo: {
      url: 'https://youtu.be/knbMyna6DGs',
      maxDuration: 300, // 5 minutes
      description: 'Short video for quick testing'
    },
    
    // Video with known vocabulary patterns
    vtuberSlang: {
      url: 'https://youtu.be/klgWQcUmWJc',
      expectedPatterns: ['草', 'てぇてぇ', 'ぽんこつ'],
      description: 'Video expected to contain Vtuber slang'
    }
  }
}

export const TEST_BATCHES: TestBatch[] = [
  {
    name: 'Mixed batch - valid and invalid',
    urls: [
      'https://youtu.be/knbMyna6DGs',
      'https://youtu.be/invalid_id_123',
      'https://youtu.be/klgWQcUmWJc'
    ],
    expectedSuccessCount: 2,
    expectedFailCount: 1
  },
  {
    name: 'All valid batch',
    urls: [
      'https://youtu.be/knbMyna6DGs',
      'https://youtu.be/klgWQcUmWJc'
    ],
    expectedSuccessCount: 2,
    expectedFailCount: 0
  },
  {
    name: 'Large batch (max 10)',
    urls: Array(10).fill('https://youtu.be/knbMyna6DGs'),
    expectedSuccessCount: 10,
    expectedFailCount: 0
  }
]

// Expected vocabulary item structure for validation
export interface ExpectedVocabularyItem {
  japanese: string
  english?: string
  difficulty?: number
  type?: string
}

// Mock vocabulary data for testing when API is unavailable
export const MOCK_VOCABULARY_ITEMS: ExpectedVocabularyItem[] = [
  {
    japanese: 'こんにちは',
    english: 'Hello',
    difficulty: 1,
    type: 'greeting'
  },
  {
    japanese: 'ありがとう',
    english: 'Thank you',
    difficulty: 1,
    type: 'common'
  },
  {
    japanese: '草',
    english: 'lol (internet slang)',
    difficulty: 2,
    type: 'internet_slang'
  },
  {
    japanese: 'てぇてぇ',
    english: 'precious/wholesome (Vtuber slang)',
    difficulty: 3,
    type: 'vtuber_slang'
  },
  {
    japanese: 'スパチャ',
    english: 'Super Chat (YouTube donation)',
    difficulty: 3,
    type: 'vtuber_slang'
  }
]

// Timeouts for different operations
export const TEST_TIMEOUTS = {
  shortWait: 1000,      // 1 second
  mediumWait: 5000,     // 5 seconds
  longWait: 15000,      // 15 seconds
  videoAnalysis: 30000, // 30 seconds
  batchProcess: 60000,  // 60 seconds
  networkRequest: 10000 // 10 seconds
}

// Test user credentials
export const TEST_USER = {
  username: 'test',
  password: 'test0702',
  email: 'test@example.com'
}

// API response expectations
export const EXPECTED_API_RESPONSES = {
  videoAnalysis: {
    requiredFields: ['video_info', 'vocabulary_extracted'],
    videoInfoFields: ['title', 'channel', 'thumbnail', 'duration', 'view_count']
  },
  batchProcess: {
    requiredFields: ['batch_id', 'status', 'total_videos'],
    statusValues: ['processing', 'completed', 'failed']
  },
  vocabularyItem: {
    requiredFields: ['japanese', 'english', 'difficulty'],
    optionalFields: ['reading', 'context', 'tags', 'video_timestamp']
  }
}

// Error messages to check for
export const ERROR_MESSAGES = {
  invalidUrl: 'Please enter a valid YouTube URL',
  networkError: 'Network error occurred',
  videoNotFound: 'Video not found',
  noTranscript: 'No transcript available',
  processingFailed: 'Failed to process video',
  batchLimitExceeded: 'Maximum 10 URLs allowed per batch'
}

// CSS selectors for common elements
export const SELECTORS = {
  videoAnalyzer: {
    urlInput: 'input.url-input',
    timestampInput: 'input.timestamp-input',
    analyzeButton: 'button.analyze-button',
    extractButton: 'button.extract-button',
    videoInfo: '.video-info-card',
    expressions: '.expressions-section',
    extractionResults: '.extraction-results',
    saveButton: 'button.save-button'
  },
  batchProcessor: {
    urlTextarea: 'textarea.url-textarea',
    processButton: 'button.process-button',
    progressSection: '.progress-section',
    progressBar: '.progress-bar',
    resultsSection: '.results-section',
    urlStatusList: '.url-status-list',
    retryButton: 'button.retry-button',
    downloadButton: 'button.download-button'
  },
  common: {
    loadingSpinner: '.loading-spinner',
    errorMessage: '[role="alert"]',
    successMessage: '[role="status"]',
    toast: '.Toastify__toast'
  }
}