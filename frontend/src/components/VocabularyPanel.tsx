import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { vocabularyService, youtubeService } from '../services'
import type { VocabularyItem } from '../services'
import { useAuth } from '../contexts/AuthContext'


interface VocabularyItemWithProgress extends VocabularyItem {
  progress?: {
    status: 'new' | 'learning' | 'reviewing' | 'mastered'
    review_count: number
    last_reviewed_at?: string
    next_review_at?: string
  }
}

const VocabularyPanel: React.FC = () => {
  const { currentUser } = useAuth()
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItemWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'difficulty' | 'educational'>('educational')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'anki'>('json')
  const [learningStats, setLearningStats] = useState<any>(null)

  useEffect(() => {
    fetchVocabulary()
    if (currentUser) {
      fetchLearningStats()
    }
  }, [difficultyFilter, currentUser])

  const fetchVocabulary = async () => {
    try {
      setLoading(true)
      const params: any = { limit: 50 }
      if (difficultyFilter !== null) {
        params.difficulty = difficultyFilter
      }
      const result = await vocabularyService.getVocabularyItems(params)
      
      // Fetch progress for each item if user is logged in
      const itemsWithProgress: VocabularyItemWithProgress[] = result.items
      if (currentUser) {
        for (const item of itemsWithProgress) {
          try {
            const progress = await vocabularyService.getVocabularyProgress(item.id!)
            item.progress = progress
          } catch (error) {
            // Progress not found, use default
            item.progress = {
              status: 'new',
              review_count: 0
            }
          }
        }
      }
      
      // 教育価値で並び替え
      const sortedItems = sortVocabularyItems(itemsWithProgress, sortBy)
      setVocabularyItems(sortedItems)
    } catch (error: any) {
      console.error('Error fetching vocabulary:', error)
      toast.error(error.message || 'Failed to load vocabulary')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchLearningStats = async () => {
    try {
      const stats = await vocabularyService.getLearningStats()
      setLearningStats(stats)
    } catch (error) {
      console.error('Error fetching learning stats:', error)
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
      // 検索結果も教育価値で並び替え
      const sortedItems = sortVocabularyItems(result.items, sortBy)
      setVocabularyItems(sortedItems)
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
  
  const calculateEducationalScore = (item: VocabularyItem): number => {
    let score = 0
    
    // JLPTレベルによるスコア
    if (item.difficulty === 1 || item.difficulty === 2) score += 8  // N5, N4
    else if (item.difficulty === 3) score += 6  // N3
    else score += 4  // N2, N1
    
    // カテゴリ/タグによるスコア
    if (item.tags?.includes('daily') || item.category === 'essential_daily') score += 10
    if (item.tags?.includes('grammar') || item.category === 'common_grammar') score += 7
    if (item.tags?.includes('polite') || item.category === 'polite_expressions') score += 6
    if (item.tags?.includes('emotion') || item.category === 'emotion_expressions') score += 5
    if (item.tags?.includes('vtuber') || item.category === 'vtuber_culture') score += 3
    
    return score
  }
  
  const sortVocabularyItems = (items: VocabularyItemWithProgress[], sortBy: string): VocabularyItemWithProgress[] => {
    const sorted = [...items]
    
    switch (sortBy) {
      case 'educational':
        return sorted.sort((a, b) => calculateEducationalScore(b) - calculateEducationalScore(a))
      case 'difficulty':
        return sorted.sort((a, b) => a.difficulty - b.difficulty)
      case 'date':
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }
  
  const getEducationalBadge = (item: VocabularyItem): { color: string; label: string } | null => {
    const score = calculateEducationalScore(item)
    if (score >= 15) return { color: '#10b981', label: '必須' }
    if (score >= 10) return { color: '#3b82f6', label: '重要' }
    if (score >= 7) return { color: '#f59e0b', label: '推奨' }
    return null
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
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new': return '#6b7280'
      case 'learning': return '#3b82f6'
      case 'reviewing': return '#f59e0b'
      case 'mastered': return '#10b981'
      default: return '#6b7280'
    }
  }
  
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'new': return '🆕'
      case 'learning': return '📖'
      case 'reviewing': return '🔄'
      case 'mastered': return '✅'
      default: return '🆕'
    }
  }
  
  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }
  
  const handleSelectAll = () => {
    if (selectedItems.size === vocabularyItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(vocabularyItems.map(item => item.id!)))
    }
  }
  
  const handleExport = async () => {
    try {
      const params: any = { limit: 1000 }
      if (difficultyFilter !== null) {
        params.difficulty_level = difficultyFilter
      }
      
      let response
      switch (exportFormat) {
        case 'csv':
          response = await vocabularyService.exportToCSV(params)
          break
        case 'anki':
          response = await vocabularyService.exportToAnki(params)
          break
        case 'json':
        default:
          response = await vocabularyService.exportToJSON(params)
          break
      }
      
      // Download the file
      const blob = new Blob([response], { 
        type: exportFormat === 'csv' ? 'text/csv' : 
              exportFormat === 'anki' ? 'application/octet-stream' : 
              'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vocabulary_${new Date().toISOString().split('T')[0]}.${exportFormat === 'anki' ? 'apkg' : exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Export successful!')
      setShowExportModal(false)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error('Export failed')
    }
  }
  
  const updateLearningStatus = async (itemId: string, status: string) => {
    if (!currentUser) {
      toast.error('Please login to track your progress')
      return
    }
    
    try {
      await vocabularyService.updateVocabularyProgress(itemId, { status })
      
      // Update local state
      setVocabularyItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            progress: {
              ...item.progress!,
              status: status as any
            }
          }
        }
        return item
      }))
      
      toast.success('Progress updated')
      fetchLearningStats() // Refresh stats
    } catch (error) {
      console.error('Error updating progress:', error)
      toast.error('Failed to update progress')
    }
  }

  return (
    <div className="vocabulary-panel">
      <div className="panel-header">
        <h2 className="panel-title">Vocabulary Database</h2>
        {learningStats && currentUser && (
          <div className="learning-stats">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{learningStats.total_vocabulary}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">🆕 New:</span>
              <span className="stat-value">{learningStats.new_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">📖 Learning:</span>
              <span className="stat-value">{learningStats.learning_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">🔄 Reviewing:</span>
              <span className="stat-value">{learningStats.reviewing_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">✅ Mastered:</span>
              <span className="stat-value">{learningStats.mastered_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">🔥 Streak:</span>
              <span className="stat-value">{learningStats.streak_days} days</span>
            </div>
          </div>
        )}
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
          <button 
            onClick={() => setShowExportModal(true)} 
            className="export-button"
            disabled={vocabularyItems.length === 0}
          >
            📥 Export
          </button>
        </div>
      </div>

      <div className="filters-section">
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
        
        <div className="sort-controls">
          <label className="sort-label">並び替え:</label>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any)
              // 現在のアイテムを再ソート
              setVocabularyItems(prev => sortVocabularyItems(prev, e.target.value))
            }}
            className="sort-select"
          >
            <option value="educational">🎓 教育価値順</option>
            <option value="difficulty">📊 難易度順</option>
            <option value="date">📅 日付順</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading vocabulary...</div>
      ) : (
        <div className="vocabulary-list">
          {vocabularyItems.map((item) => (
            <motion.div
              key={item.id}
              className={`vocabulary-card ${selectedItems.has(item.id!) ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => handleSelectItem(item.id!)}
            >
              <div className="card-header">
                <div className="left-section">
                  <div className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(item.difficulty) }}>
                    {formatDifficulty(item.difficulty)}
                  </div>
                  {(() => {
                    const educationalBadge = getEducationalBadge(item)
                    return educationalBadge ? (
                      <div 
                        className="educational-badge" 
                        style={{ backgroundColor: educationalBadge.color }}
                        title={`教育価値スコア: ${calculateEducationalScore(item)}`}
                      >
                        {educationalBadge.label}
                      </div>
                    ) : null
                  })()}
                  {currentUser && item.progress && (
                    <div 
                      className="status-badge" 
                      style={{ backgroundColor: getStatusColor(item.progress.status) }}
                    >
                      {getStatusIcon(item.progress.status)} {item.progress.status}
                    </div>
                  )}
                </div>
                <div className="card-actions">
                  {currentUser && (
                    <select
                      className="status-select"
                      value={item.progress?.status || 'new'}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateLearningStatus(item.id!, e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="new">🆕 New</option>
                      <option value="learning">📖 Learning</option>
                      <option value="reviewing">🔄 Reviewing</option>
                      <option value="mastered">✅ Mastered</option>
                    </select>
                  )}
                  {item.video_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openVideoAtTimestamp(item.video_id, item.timestamp)
                      }}
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
                <div className="footer-left">
                  {item.source && (
                    <span className="source">Source: {item.source}</span>
                  )}
                  {currentUser && item.progress && item.progress.review_count > 0 && (
                    <span className="review-count">
                      🔄 {item.progress.review_count} reviews
                    </span>
                  )}
                </div>
                <span className="timestamp">
                  {new Date(item.created_at || Date.now()).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              className="export-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Export Vocabulary</h3>
              <div className="export-options">
                <label>
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                  />
                  JSON Format
                </label>
                <label>
                  <input
                    type="radio"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                  />
                  CSV Format
                </label>
                <label>
                  <input
                    type="radio"
                    value="anki"
                    checked={exportFormat === 'anki'}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                  />
                  Anki Deck (APKG)
                </label>
              </div>
              <div className="modal-actions">
                <button onClick={handleExport} className="export-confirm">
                  Export
                </button>
                <button onClick={() => setShowExportModal(false)} className="export-cancel">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .vocabulary-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .panel-header {
          margin-bottom: 1.5rem;
        }
        
        .learning-stats {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background-color: rgba(30, 41, 59, 0.5);
          border-radius: 0.5rem;
          border: 1px solid var(--border-color);
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .stat-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
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
        
        .export-button {
          padding: 0.75rem 1.5rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }
        
        .export-button:hover:not(:disabled) {
          background-color: #059669;
        }
        
        .export-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .difficulty-filters {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .sort-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        
        .sort-select {
          padding: 0.5rem 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .sort-select:hover {
          border-color: var(--primary-color);
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
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .vocabulary-card:hover {
          border-color: var(--primary-color);
          transform: translateY(-2px);
        }
        
        .vocabulary-card.selected {
          border-color: var(--primary-color);
          background-color: rgba(124, 58, 237, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .left-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
          text-transform: capitalize;
        }
        
        .status-select {
          padding: 0.25rem 0.5rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .status-select:hover {
          border-color: var(--primary-color);
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
        
        .educational-badge {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 0.375rem;
          color: white;
          font-weight: 600;
          margin-left: 0.5rem;
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
        
        .footer-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .review-count {
          font-size: 0.75rem;
          color: var(--primary-color);
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
        
        /* Export Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .export-modal {
          background-color: var(--background);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
        }
        
        .export-modal h3 {
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .export-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .export-options label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.75rem;
          background-color: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        
        .export-options label:hover {
          border-color: var(--primary-color);
        }
        
        .export-options input[type="radio"] {
          width: 1.25rem;
          height: 1.25rem;
          accent-color: var(--primary-color);
        }
        
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }
        
        .export-confirm {
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }
        
        .export-confirm:hover {
          background-color: var(--primary-hover);
        }
        
        .export-cancel {
          padding: 0.75rem 1.5rem;
          background-color: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
        }
        
        .export-cancel:hover {
          border-color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

export default VocabularyPanel