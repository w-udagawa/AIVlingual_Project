import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { youtubeService, vocabularyService } from '../services'
import type { VideoInfo, Expression, VocabularyExtractionResult, VocabularyItem } from '../services'

// Loading spinner component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="loading-spinner" />
    <p className="loading-message">{message}</p>
  </div>
)

// Error display component
const ErrorDisplay: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="error-container" role="alert">
    <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="error-message">{error}</p>
    {onRetry && (
      <button onClick={onRetry} className="retry-button">
        Retry
      </button>
    )}
  </div>
)

const VideoAnalyzer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('')
  const [timestamp, setTimestamp] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [expressions, setExpressions] = useState<Expression[]>([])
  const [extractionResult, setExtractionResult] = useState<VocabularyExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeVideo = async () => {
    if (!videoUrl) {
      toast.error('Please enter a YouTube URL')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setExtractionResult(null) // Clear previous extraction results
      
      const timestampValue = timestamp ? parseFloat(timestamp) : undefined
      const result = await youtubeService.analyzeVideo(videoUrl, timestampValue)
      
      setVideoInfo(result.video_info)
      if (result.expressions) {
        setExpressions(result.expressions)
      }
      
      toast.success('Video analyzed successfully')
    } catch (error: any) {
      console.error('Error analyzing video:', error)
      const errorMessage = error.message || 'Failed to analyze video'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const extractVocabulary = async () => {
    if (!videoUrl) {
      toast.error('Please enter a YouTube URL')
      return
    }

    try {
      setExtracting(true)
      setError(null)
      setExpressions([]) // Clear previous analysis results
      
      const result = await youtubeService.extractVocabulary(videoUrl)
      
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      
      setExtractionResult(result)
      setVideoInfo(result.video_info)
      
      toast.success(`Extracted ${result.vocabulary_extracted} vocabulary items!`)
    } catch (error: any) {
      console.error('Error extracting vocabulary:', error)
      const errorMessage = error.message || 'Failed to extract vocabulary'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setExtracting(false)
    }
  }


  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`
    }
    return `${count} views`
  }

  const saveVocabularyItems = async () => {
    if (!extractionResult?.vocabulary_items || extractionResult.vocabulary_items.length === 0) {
      toast.error('No vocabulary items to save')
      return
    }

    try {
      setLoading(true)
      // Ensure all items have required fields
      const validItems = extractionResult.vocabulary_items.map((item, index) => ({
        ...item,
        id: item.id || `temp-${Date.now()}-${index}`,
        video_id: item.video_id || videoInfo?.video_id,
        source: 'video' as const,
        tags: item.tags || ['vtuber', 'extracted'],
        created_at: item.created_at || new Date().toISOString()
      }))
      
      const results = await vocabularyService.createBatchVocabularyItems(validItems)
      toast.success(`Saved ${results.length} vocabulary items to database`)
    } catch (error: any) {
      console.error('Error saving vocabulary:', error)
      const errorMessage = error.message || 'Failed to save vocabulary items'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="video-analyzer">
      <div className="analyzer-header">
        <h2 className="analyzer-title">YouTube Video Analyzer</h2>
        <p className="analyzer-description">
          Analyze Vtuber clips for language learning content
        </p>
      </div>

      <div className="input-section">
        <div className="input-group">
          <input
            type="text"
            placeholder="YouTube video URL..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="url-input"
            disabled={loading || extracting}
          />
          <input
            type="number"
            placeholder="Timestamp (optional)"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            className="timestamp-input"
            min="0"
            step="1"
            disabled={loading || extracting}
          />
          <button
            onClick={analyzeVideo}
            disabled={loading || extracting}
            className="analyze-button"
          >
            {loading && !extracting ? (
              <>
                <span className="button-spinner" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </button>
          <button
            onClick={extractVocabulary}
            disabled={loading || extracting}
            className="extract-button"
          >
            {extracting ? (
              <>
                <span className="button-spinner" />
                Extracting...
              </>
            ) : (
              'Extract Vocabulary'
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && !loading && !extracting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorDisplay 
              error={error} 
              onRetry={() => {
                setError(null)
                if (extractionResult) {
                  extractVocabulary()
                } else {
                  analyzeVideo()
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading states */}
      <AnimatePresence>
        {(loading || extracting) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="loading-overlay"
          >
            <LoadingSpinner 
              message={
                extracting 
                  ? 'Extracting vocabulary from video transcript...' 
                  : loading && extractionResult
                  ? 'Saving vocabulary to database...'
                  : 'Analyzing video information...'
              } 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {videoInfo && (
        <motion.div
          className="video-info-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="video-thumbnail">
            <img src={videoInfo.thumbnail} alt={videoInfo.title} />
            <div className="duration-badge">{youtubeService.formatDuration(videoInfo.duration)}</div>
          </div>
          
          <div className="video-details">
            <h3 className="video-title">{videoInfo.title}</h3>
            <div className="video-meta">
              <span className="channel-name">{videoInfo.channel}</span>
              <span className="view-count">{formatViewCount(videoInfo.view_count)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {expressions.length > 0 && (
        <motion.div
          className="expressions-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h3 className="section-title">Extracted Expressions</h3>
          <div className="expressions-grid">
            {expressions.map((expr, index) => (
              <div key={index} className="expression-card">
                <div className="expression-text">{expr.japanese}</div>
                <div className="expression-type">{expr.type}</div>
                <div className="expression-timestamp">
                  @ {expr.video_time || youtubeService.formatDuration(Math.floor(expr.timestamp))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {extractionResult && (
        <motion.div
          className="extraction-results"
          data-testid="extraction-results-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="results-header">
            <h3 className="section-title">Vocabulary Extraction Results</h3>
            <button
              onClick={saveVocabularyItems}
              className="save-button"
              disabled={!extractionResult.vocabulary_items?.length}
            >
              Save to Database
            </button>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" data-testid="vocabulary-count">{extractionResult.vocabulary_extracted}</div>
              <div className="stat-label">Items Extracted</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {Math.round(extractionResult.language_stats.japanese_ratio)}%
              </div>
              <div className="stat-label">Japanese</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {Math.round(extractionResult.language_stats.english_ratio)}%
              </div>
              <div className="stat-label">English</div>
            </div>
          </div>

          <div className="vocabulary-preview" data-testid="vocabulary-results">
            <h4>Preview (First 5 items):</h4>
            {extractionResult.vocabulary_items?.slice(0, 5).map((item: VocabularyItem, index: number) => (
              <div key={index} className="vocab-item" data-testid="vocabulary-item" data-category={item.category || 'general'}>
                <span className="vocab-japanese" data-testid="japanese-text">{item.japanese}</span>
                <span className="vocab-english">{item.english}</span>
                <span className="vocab-difficulty">Lv.{item.difficulty}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <style>{`
        .video-analyzer {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .analyzer-header {
          text-align: center;
        }

        .analyzer-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .analyzer-description {
          color: var(--text-secondary);
        }

        .input-section {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
        }

        .input-group {
          display: flex;
          gap: 0.5rem;
        }

        .url-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          outline: none;
        }

        .url-input:focus {
          border-color: var(--primary-color);
        }

        .timestamp-input {
          width: 150px;
          padding: 0.75rem 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          outline: none;
        }

        .analyze-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .analyze-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .analyze-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .extract-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--success);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .extract-button:hover:not(:disabled) {
          background-color: var(--success-hover);
        }

        .extract-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .video-info-card {
          background-color: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .video-thumbnail {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
        }

        .video-thumbnail img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .duration-badge {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          padding: 0.25rem 0.5rem;
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: 0.875rem;
          border-radius: 0.25rem;
        }

        .video-details {
          padding: 1rem;
        }

        .video-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .video-meta {
          display: flex;
          justify-content: space-between;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .expressions-section {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        .expressions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .expression-card {
          background-color: var(--surface);
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
        }

        .expression-text {
          font-size: 1rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }

        .expression-type {
          font-size: 0.875rem;
          color: var(--primary-color);
          margin-bottom: 0.25rem;
        }

        .expression-timestamp {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .extraction-results {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .save-button {
          padding: 0.5rem 1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .save-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background-color: var(--surface);
          padding: 1rem;
          border-radius: 0.5rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--primary-color);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .vocabulary-preview {
          background-color: var(--surface);
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .vocabulary-preview h4 {
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .vocab-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .vocab-item:last-child {
          border-bottom: none;
        }

        .vocab-japanese {
          font-weight: 500;
        }

        .vocab-english {
          flex: 1;
          color: var(--text-secondary);
        }

        .vocab-difficulty {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background-color: var(--primary-color);
          color: white;
          border-radius: 0.25rem;
        }

        /* Loading and error states */
        .loading-overlay {
          position: relative;
          padding: 2rem;
          background-color: rgba(30, 41, 59, 0.5);
          border-radius: 0.75rem;
          margin: 1rem 0;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .loading-spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .button-spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-message {
          color: var(--text-secondary);
          font-size: 0.875rem;
          text-align: center;
        }

        .error-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          margin: 1rem 0;
        }

        .error-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: var(--error);
          flex-shrink: 0;
        }

        .error-message {
          flex: 1;
          color: var(--error);
          font-size: 0.875rem;
        }

        .retry-button {
          padding: 0.375rem 0.75rem;
          background-color: transparent;
          color: var(--error);
          border: 1px solid var(--error);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .retry-button:hover {
          background-color: var(--error);
          color: white;
        }

        /* Disabled state improvements */
        .url-input:disabled,
        .timestamp-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .analyze-button:disabled,
        .extract-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Success toast override */
        [role="status"] {
          background-color: var(--success) !important;
        }
      `}</style>
    </div>
  )
}

export default VideoAnalyzer