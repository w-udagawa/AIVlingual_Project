import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { youtubeService, vocabularyService } from '../services'
import type { BatchProgress, BatchStatusResponse } from '../services'
import { useAuth } from '../contexts/AuthContext'

interface URLStatus {
  url: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  vocabularyCount?: number
  error?: string
  title?: string
}

// WebSocket connection status component
const ConnectionStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
    <div className="connection-dot" />
    <span className="connection-text">
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  </div>
)

// Error recovery component
const ErrorRecovery: React.FC<{ onRetry: () => void; errorCount: number }> = ({ onRetry, errorCount }) => (
  <div className="error-recovery">
    <p className="error-message">
      Processing encountered {errorCount} error{errorCount !== 1 ? 's' : ''}
    </p>
    <button onClick={onRetry} className="retry-button">
      🔄 Retry Failed URLs
    </button>
  </div>
)

const BatchProcessor: React.FC = () => {
  const { currentUser } = useAuth()
  const [urls, setUrls] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchStatusResponse['results'] | null>(null)
  const [urlStatuses, setUrlStatuses] = useState<URLStatus[]>([])
  const [recentBatches, setRecentBatches] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [vocabularyPreview, setVocabularyPreview] = useState<any[]>([])
  const [wsConnected, setWsConnected] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (currentUser) {
      fetchRecentBatches()
    }
  }, [currentUser])

  // Estimate remaining time based on progress
  useEffect(() => {
    if (progress && progress.completed > 0 && progress.completed < progress.total) {
      const startTime = Date.now() - (progress.completed * 10000) // Estimate 10s per video
      const averageTimePerVideo = (Date.now() - startTime) / progress.completed
      const remainingVideos = progress.total - progress.completed
      const estimate = Math.round((remainingVideos * averageTimePerVideo) / 1000)
      setEstimatedTimeRemaining(estimate)
    } else {
      setEstimatedTimeRemaining(null)
    }
  }, [progress])

  const fetchRecentBatches = async () => {
    try {
      const batches = await youtubeService.getBatchHistory(5)
      setRecentBatches(batches)
    } catch (error) {
      console.error('Error fetching batch history:', error)
    }
  }

  const handleBatchProcess = async () => {
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    if (urlList.length === 0) {
      toast.error('Please enter at least one YouTube URL')
      return
    }

    if (urlList.length > 10) {
      toast.error('Maximum 10 URLs allowed per batch')
      return
    }

    try {
      setProcessing(true)
      setProgress(null)
      setResults(null)
      setVocabularyPreview([])
      setRetryCount(0)
      setWsConnected(true)
      
      // Initialize URL statuses
      setUrlStatuses(urlList.map(url => ({
        url,
        status: 'pending'
      })))

      // Start batch processing
      const response = await youtubeService.startBatchExtraction(urlList)
      setBatchId(response.batch_id)
      toast.success('Batch processing started!')

      // Poll for progress with enhanced updates
      const finalStatus = await youtubeService.pollBatchStatus(
        response.batch_id,
        (currentProgress) => {
          setProgress(currentProgress)
          
          // Update individual URL statuses
          if (currentProgress.url_statuses) {
            setUrlStatuses(currentProgress.url_statuses)
          }
          
          // Update vocabulary preview
          if (currentProgress.vocabulary_preview) {
            setVocabularyPreview(prev => [
              ...prev,
              ...currentProgress.vocabulary_preview
            ])
          }
          
          // Check for connection issues
          if (currentProgress.failed > 0 && retryCount < 3) {
            setRetryCount(prev => prev + 1)
          }
        },
        2000, // Poll interval
        () => setWsConnected(false) // Connection lost callback
      )

      setResults(finalStatus.results)
      toast.success('Batch processing completed!')
      
      // Refresh batch history
      if (currentUser) {
        fetchRecentBatches()
      }
    } catch (error: any) {
      console.error('Batch processing error:', error)
      toast.error(error.message || 'Failed to process batch')
    } finally {
      setProcessing(false)
    }
  }
  
  const retryFailedUrls = () => {
    const failedUrls = urlStatuses
      .filter(us => us.status === 'failed')
      .map(us => us.url)
      .join('\n')
    
    setUrls(failedUrls)
    setUrlStatuses([])
    setProgress(null)
    setResults(null)
    setVocabularyPreview([])
  }
  
  const downloadResults = async () => {
    if (!batchId || !results) return
    
    try {
      const data = {
        batch_id: batchId,
        results: results,
        vocabulary_preview: vocabularyPreview,
        timestamp: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch_results_${batchId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Results downloaded!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download results')
    }
  }

  const formatProgress = () => {
    if (!progress) return '0%'
    return `${Math.round(progress.progress_percentage)}%`
  }

  const getProgressColor = () => {
    if (!progress) return 'var(--primary-color)'
    if (progress.failed > 0) return 'var(--warning)'
    return 'var(--success)'
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="batch-processor">
      <div className="processor-header">
        <div className="header-content">
          <h2 className="processor-title">Batch Video Processor</h2>
          <p className="processor-description">
            Process multiple YouTube videos at once (max 10)
          </p>
        </div>
        <ConnectionStatus isConnected={wsConnected} />
      </div>

      <div className="url-input-section">
        <label className="input-label">Enter YouTube URLs (one per line):</label>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={`https://www.youtube.com/watch?v=VIDEO_ID_1\nhttps://www.youtube.com/watch?v=VIDEO_ID_2\nhttps://www.youtube.com/watch?v=VIDEO_ID_3`}
          className="url-textarea"
          rows={6}
          disabled={processing}
        />
        <button
          onClick={handleBatchProcess}
          disabled={processing}
          className="process-button"
        >
          {processing ? 'Processing...' : 'Start Batch Processing'}
        </button>
      </div>

      <AnimatePresence>
        {progress && (
          <motion.div
            className="progress-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="section-title">Processing Progress</h3>
            
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: formatProgress(),
                  backgroundColor: getProgressColor()
                }}
              />
              <span className="progress-text">{formatProgress()}</span>
            </div>

            <div className="progress-stats">
              <div className="stat">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{progress.total}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Completed:</span>
                <span className="stat-value success">{progress.completed}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Failed:</span>
                <span className="stat-value error">{progress.failed}</span>
              </div>
              {estimatedTimeRemaining && (
                <div className="stat">
                  <span className="stat-label">Est. Time:</span>
                  <span className="stat-value">{formatTimeRemaining(estimatedTimeRemaining)}</span>
                </div>
              )}
            </div>

            {progress.current_url && (
              <div className="current-processing">
                <span>Currently processing:</span>
                <code>{progress.current_url}</code>
              </div>
            )}
            
            {/* Show error recovery if there are failures */}
            {progress.failed > 0 && !processing && (
              <ErrorRecovery 
                errorCount={progress.failed}
                onRetry={retryFailedUrls}
              />
            )}
            
            {/* Individual URL Status */}
            {urlStatuses.length > 0 && (
              <div className="url-status-list">
                <h4>URL Status:</h4>
                {urlStatuses.map((us, index) => (
                  <div key={index} className={`url-status-item ${us.status}`}>
                    <div className="status-icon">
                      {us.status === 'pending' && '⏳'}
                      {us.status === 'processing' && '🔄'}
                      {us.status === 'completed' && '✅'}
                      {us.status === 'failed' && '❌'}
                    </div>
                    <div className="status-content">
                      <div className="status-url">{us.url}</div>
                      {us.title && <div className="status-title">{us.title}</div>}
                      {us.vocabularyCount !== undefined && (
                        <div className="status-vocab-count">
                          {us.vocabularyCount} vocabulary items
                        </div>
                      )}
                      {us.error && <div className="status-error">{us.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Vocabulary Preview */}
            {vocabularyPreview.length > 0 && (
              <div className="vocabulary-preview">
                <h4>Vocabulary Preview ({vocabularyPreview.length} items):</h4>
                <div className="preview-list">
                  {vocabularyPreview.slice(0, 5).map((item, index) => (
                    <div key={index} className="preview-item">
                      <span className="preview-japanese">{item.japanese}</span>
                      <span className="preview-separator">→</span>
                      <span className="preview-english">{item.english}</span>
                    </div>
                  ))}
                  {vocabularyPreview.length > 5 && (
                    <div className="preview-more">...and {vocabularyPreview.length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {results && (
          <motion.div
            className="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="section-title">Batch Results</h3>
            
            <div className="results-summary">
              <div className="summary-stat">
                <div className="stat-value">{results.successful}</div>
                <div className="stat-label">Videos Processed</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value">{results.total_vocabulary}</div>
                <div className="stat-label">Total Vocabulary</div>
              </div>
              <div className="summary-stat">
                <div className="stat-value">{results.failed}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>

            {results.results.length > 0 && (
              <div className="successful-results">
                <h4>Successfully Processed:</h4>
                {results.results.map((result, index) => (
                  <div key={index} className="result-item success">
                    <div className="result-title">{result.video_title}</div>
                    <div className="result-stats">
                      {result.vocabulary_extracted} vocabulary items extracted
                    </div>
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="result-link"
                    >
                      View on YouTube →
                    </a>
                  </div>
                ))}
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="error-results">
                <h4>Failed to Process:</h4>
                {results.errors.map((error, index) => (
                  <div key={index} className="result-item error">
                    <div className="error-url">{error.url}</div>
                    <div className="error-message">{error.error}</div>
                  </div>
                ))}
                <button onClick={retryFailedUrls} className="retry-button">
                  🔄 Retry Failed URLs
                </button>
              </div>
            )}
            
            <div className="result-actions">
              <button onClick={downloadResults} className="download-button">
                📥 Download Results
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Batch History */}
      {currentUser && (
        <div className="batch-history-section">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="history-toggle"
          >
            {showHistory ? '📖 Hide' : '📖 Show'} Processing History
          </button>
          
          <AnimatePresence>
            {showHistory && recentBatches.length > 0 && (
              <motion.div
                className="batch-history"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3>Recent Batches</h3>
                {recentBatches.map((batch) => (
                  <div key={batch.id} className="history-item">
                    <div className="history-header">
                      <span className="history-date">
                        {new Date(batch.started_at).toLocaleString()}
                      </span>
                      <span className={`history-status ${batch.status}`}>
                        {batch.status}
                      </span>
                    </div>
                    <div className="history-stats">
                      <span>URLs: {batch.total_urls}</span>
                      <span>Success: {batch.successful}</span>
                      <span>Failed: {batch.failed}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <style>{`
        .batch-processor {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .processor-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .processor-title {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .processor-description {
          color: var(--text-secondary);
        }

        .url-input-section {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
        }

        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .url-textarea {
          width: 100%;
          padding: 0.75rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-family: monospace;
          font-size: 0.875rem;
          resize: vertical;
          margin-bottom: 1rem;
        }

        .url-textarea:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .url-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .process-button {
          width: 100%;
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .process-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .process-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .progress-section {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        .progress-bar-container {
          position: relative;
          width: 100%;
          height: 2rem;
          background-color: var(--surface);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-bar {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 500;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .progress-stats {
          display: flex;
          justify-content: space-around;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }

        .stat-value.success {
          color: var(--success);
        }

        .stat-value.error {
          color: var(--error);
        }

        .current-processing {
          padding: 0.75rem;
          background-color: var(--surface);
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .current-processing span {
          color: var(--text-secondary);
          margin-right: 0.5rem;
        }

        .current-processing code {
          color: var(--primary-color);
          word-break: break-all;
        }

        .results-section {
          background-color: rgba(30, 41, 59, 0.5);
          padding: 1.5rem;
          border-radius: 0.75rem;
        }

        .results-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .summary-stat {
          text-align: center;
          padding: 1rem;
          background-color: var(--surface);
          border-radius: 0.5rem;
        }

        .summary-stat .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 0.25rem;
        }

        .summary-stat .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .successful-results,
        .error-results {
          margin-top: 1.5rem;
        }

        .successful-results h4,
        .error-results h4 {
          margin-bottom: 0.75rem;
          font-weight: 500;
        }

        .result-item {
          padding: 1rem;
          background-color: var(--surface);
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
          border-left: 3px solid transparent;
        }

        .result-item.success {
          border-left-color: var(--success);
        }

        .result-item.error {
          border-left-color: var(--error);
        }

        .result-title {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .result-stats {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .result-link {
          color: var(--primary-color);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .result-link:hover {
          text-decoration: underline;
        }

        .error-url {
          font-family: monospace;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          word-break: break-all;
        }

        .error-message {
          color: var(--error);
          font-size: 0.875rem;
        }
        
        /* New Styles for Enhanced Features */
        .url-status-list {
          margin-top: 1rem;
        }
        
        .url-status-list h4 {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }
        
        .url-status-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.5rem;
          background-color: var(--surface);
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
          transition: all 0.2s;
        }
        
        .url-status-item.processing {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .url-status-item.completed {
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .url-status-item.failed {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .status-icon {
          font-size: 1.25rem;
          line-height: 1;
        }
        
        .status-content {
          flex: 1;
          min-width: 0;
        }
        
        .status-url {
          font-size: 0.75rem;
          color: var(--text-secondary);
          word-break: break-all;
        }
        
        .status-title {
          font-weight: 500;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        
        .status-vocab-count {
          font-size: 0.75rem;
          color: var(--primary-color);
          margin-top: 0.25rem;
        }
        
        .status-error {
          font-size: 0.75rem;
          color: var(--error);
          margin-top: 0.25rem;
        }
        
        .vocabulary-preview {
          margin-top: 1rem;
          padding: 1rem;
          background-color: var(--surface);
          border-radius: 0.5rem;
        }
        
        .vocabulary-preview h4 {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }
        
        .preview-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .preview-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        
        .preview-japanese {
          font-weight: 500;
        }
        
        .preview-separator {
          color: var(--text-secondary);
        }
        
        .preview-english {
          color: var(--primary-color);
        }
        
        .preview-more {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-style: italic;
          margin-top: 0.5rem;
        }
        
        .retry-button,
        .download-button {
          padding: 0.5rem 1rem;
          background-color: transparent;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }
        
        .retry-button:hover {
          border-color: var(--warning);
          color: var(--warning);
        }
        
        .download-button:hover {
          border-color: var(--success);
          color: var(--success);
        }
        
        .result-actions {
          display: flex;
          justify-content: center;
          margin-top: 1.5rem;
        }
        
        /* Batch History Styles */
        .batch-history-section {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-color);
        }
        
        .history-toggle {
          padding: 0.75rem 1.5rem;
          background-color: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: center;
        }
        
        .history-toggle:hover {
          border-color: var(--primary-color);
        }
        
        .batch-history {
          margin-top: 1rem;
          overflow: hidden;
        }
        
        .batch-history h3 {
          font-size: 1.125rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }
        
        .history-item {
          padding: 1rem;
          background-color: rgba(30, 41, 59, 0.3);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .history-date {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .history-status {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .history-status.completed {
          background-color: rgba(16, 185, 129, 0.2);
          color: var(--success);
        }
        
        .history-status.failed {
          background-color: rgba(239, 68, 68, 0.2);
          color: var(--error);
        }
        
        .history-status.processing {
          background-color: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .history-stats {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Connection status */
        .processor-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-content {
          flex: 1;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: rgba(30, 41, 59, 0.5);
          border-radius: 1rem;
          font-size: 0.875rem;
        }

        .connection-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .connection-status.connected .connection-dot {
          background-color: var(--success);
        }

        .connection-status.disconnected .connection-dot {
          background-color: var(--error);
          animation: none;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .connection-text {
          color: var(--text-secondary);
        }

        /* Error recovery */
        .error-recovery {
          margin-top: 1rem;
          padding: 1rem;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.5rem;
          text-align: center;
        }

        .error-recovery .error-message {
          margin-bottom: 0.75rem;
          color: var(--error);
          font-size: 0.875rem;
        }

        /* Enhanced status indicators */
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .url-status-item.processing .status-icon {
          animation: rotate 1s linear infinite;
        }

        /* Estimated time display */
        .stat-value {
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}

export default BatchProcessor