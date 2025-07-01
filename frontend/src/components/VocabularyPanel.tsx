import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { vocabularyService, youtubeService } from '../services'
import type { VocabularyItem } from '../services'


const VocabularyPanel: React.FC = () => {
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null)

  useEffect(() => {
    fetchVocabulary()
  }, [difficultyFilter])

  const fetchVocabulary = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 50 }
      if (difficultyFilter !== null) {
        params.difficulty = difficultyFilter
      }
      const result = await vocabularyService.getVocabularyItems(params)
      setVocabularyItems(result.items)
    } catch (error: any) {
      console.error('Error fetching vocabulary:', error)
      toast.error(error.message || 'Failed to load vocabulary')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchVocabulary()
      return
    }

    try {
      setLoading(true)
      const result = await vocabularyService.searchVocabulary(searchTerm)
      setVocabularyItems(result.items)
    } catch (error: any) {
      console.error('Error searching vocabulary:', error)
      toast.error(error.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (level: number) => {
    const colors = ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444']
    return colors[level - 1] || colors[0]
  }

  const openVideoAtTimestamp = (videoId?: string, timestamp?: number) => {
    if (videoId && timestamp) {
      const url = youtubeService.formatTimestampLink(videoId, timestamp)
      window.open(url, '_blank')
    } else if (videoId) {
      window.open(`https://youtube.com/watch?v=${videoId}`, '_blank')
    }
  }

  const formatDifficulty = (level: number) => {
    const labels = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert']
    return labels[level - 1] || `Level ${level}`
  }

  return (
    <div className="vocabulary-panel">
      <div className="panel-header">
        <h2 className="panel-title">Vocabulary Database</h2>
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            Search
          </button>
        </div>
      </div>

      <div className="difficulty-filters">
        <button
          className={`filter-button ${difficultyFilter === null ? 'active' : ''}`}
          onClick={() => setDifficultyFilter(null)}
        >
          All
        </button>
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            className={`filter-button ${difficultyFilter === level ? 'active' : ''}`}
            onClick={() => setDifficultyFilter(level)}
            style={{ borderColor: getDifficultyColor(level) }}
          >
            Level {level}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading vocabulary...</div>
      ) : (
        <div className="vocabulary-list">
          {vocabularyItems.map((item) => (
            <motion.div
              key={item.id}
              className="vocabulary-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card-header">
                <div className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(item.difficulty) }}>
                  {formatDifficulty(item.difficulty)}
                </div>
                <div className="card-actions">
                  {item.video_id && (
                    <button
                      onClick={() => openVideoAtTimestamp(item.video_id, item.timestamp)}
                      className="video-link"
                    >
                      📺 View Source
                    </button>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="tags">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="vocabulary-content">
                <div className="japanese-text">
                  {item.japanese}
                  {item.reading && <span className="reading">【{item.reading}】</span>}
                </div>
                <div className="english-text">{item.english}</div>
                {item.context && (
                  <div className="context">{item.context}</div>
                )}
                {item.notes && (
                  <div className="notes">{item.notes}</div>
                )}
              </div>
              
              <div className="card-footer">
                {item.source && (
                  <span className="source">Source: {item.source}</span>
                )}
                <span className="timestamp">
                  {new Date(item.created_at || Date.now()).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .vocabulary-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .panel-header {
          margin-bottom: 1.5rem;
        }

        .panel-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .search-controls {
          display: flex;
          gap: 0.5rem;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          outline: none;
        }

        .search-input:focus {
          border-color: var(--primary-color);
        }

        .search-button {
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }

        .search-button:hover {
          background-color: var(--primary-hover);
        }

        .difficulty-filters {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .filter-button {
          padding: 0.5rem 1rem;
          background-color: transparent;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .filter-button.active {
          color: var(--primary-color);
          background-color: rgba(124, 58, 237, 0.1);
          border-color: var(--primary-color);
        }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .vocabulary-list {
          display: grid;
          gap: 1rem;
          overflow-y: auto;
          padding-bottom: 1rem;
        }

        .vocabulary-card {
          background-color: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .difficulty-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
        }

        .video-link {
          padding: 0.25rem 0.75rem;
          background-color: rgba(124, 58, 237, 0.2);
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 0.375rem;
          color: var(--primary-color);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .video-link:hover {
          background-color: rgba(124, 58, 237, 0.3);
        }

        .vocabulary-content {
          margin-bottom: 0.75rem;
        }

        .japanese-text {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .reading {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-left: 0.5rem;
        }

        .english-text {
          font-size: 1rem;
          color: var(--primary-color);
          margin-bottom: 0.5rem;
        }

        .context {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .source {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: capitalize;
        }

        .notes {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-style: italic;
          margin-top: 0.5rem;
        }

        .tags {
          display: flex;
          gap: 0.25rem;
        }

        .tag {
          padding: 0.125rem 0.5rem;
          background-color: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          color: var(--primary-color);
        }

        .timestamp {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

export default VocabularyPanel