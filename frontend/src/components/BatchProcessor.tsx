import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { youtubeService } from '../services'
import type { BatchProgress, BatchStatusResponse } from '../services'

const BatchProcessor: React.FC = () => {
  const [urls, setUrls] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [results, setResults] = useState<BatchStatusResponse['results'] | null>(null)

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

      // Start batch processing
      const response = await youtubeService.startBatchExtraction(urlList)
      setBatchId(response.batch_id)
      toast.success('Batch processing started!')

      // Poll for progress
      const finalStatus = await youtubeService.pollBatchStatus(
        response.batch_id,
        (currentProgress) => {
          setProgress(currentProgress)
        }
      )

      setResults(finalStatus.results)
      toast.success('Batch processing completed!')
    } catch (error: any) {
      console.error('Batch processing error:', error)
      toast.error(error.message || 'Failed to process batch')
    } finally {
      setProcessing(false)
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

  return (
    <div className="batch-processor">
      <div className="processor-header">
        <h2 className="processor-title">Batch Video Processor</h2>
        <p className="processor-description">
          Process multiple YouTube videos at once (max 10)
        </p>
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
            </div>

            {progress.current_url && (
              <div className="current-processing">
                <span>Currently processing:</span>
                <code>{progress.current_url}</code>
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
      `}</style>
    </div>
  )
}

export default BatchProcessor