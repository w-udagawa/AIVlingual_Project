import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../contexts/WebSocketContext'
import type { OBSConfig } from '../OBSRouter'

interface VocabularyItem {
  japanese: string
  english: string
  reading?: string
  difficulty: number
  context?: string
  timestamp: number
}

interface OBSEducationalViewProps {
  config: OBSConfig
}

const OBSEducationalView: React.FC<OBSEducationalViewProps> = ({ config }) => {
  const { messages } = useWebSocket()
  const [currentVocab, setCurrentVocab] = useState<VocabularyItem | null>(null)
  const [vocabQueue, setVocabQueue] = useState<VocabularyItem[]>([])
  const [showFlashcard, setShowFlashcard] = useState(false)

  // Mock vocabulary extraction from messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    // Extract vocabulary patterns
    const patterns = [
      { regex: /(てぇてぇ|てえてえ)/g, english: 'precious/wholesome', difficulty: 2 },
      { regex: /(ぽんこつ|ポンコツ)/g, english: 'clumsy/airhead', difficulty: 3 },
      { regex: /(草|くさ|ｗｗｗ)/g, english: 'lol/laughing', difficulty: 1 },
      { regex: /(すごい|スゴイ|凄い)/g, english: 'amazing', difficulty: 1 },
      { regex: /(かわいい|可愛い)/g, english: 'cute', difficulty: 1 },
    ]

    patterns.forEach(({ regex, english, difficulty }) => {
      const matches = lastMessage.content.match(regex)
      if (matches) {
        const vocab: VocabularyItem = {
          japanese: matches[0],
          english,
          difficulty,
          context: lastMessage.content,
          timestamp: Date.now()
        }
        setVocabQueue(prev => [...prev, vocab])
      }
    })
  }, [messages])

  // Process vocabulary queue
  useEffect(() => {
    if (currentVocab || vocabQueue.length === 0) return

    const nextVocab = vocabQueue[0]
    setCurrentVocab(nextVocab)
    setVocabQueue(prev => prev.slice(1))
    setShowFlashcard(true)

    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setShowFlashcard(false)
      setTimeout(() => setCurrentVocab(null), 500)
    }, 5000)

    return () => clearTimeout(timer)
  }, [currentVocab, vocabQueue])

  // Get difficulty color
  const getDifficultyColor = (level: number) => {
    const colors = ['#4ADE80', '#84CC16', '#EAB308', '#F97316', '#EF4444']
    return colors[Math.min(level - 1, 4)]
  }

  // Render difficulty stars
  const renderDifficulty = (level: number) => {
    return '★'.repeat(level) + '☆'.repeat(5 - level)
  }

  return (
    <div className="obs-educational-view">
      <AnimatePresence>
        {showFlashcard && currentVocab && (
          <motion.div
            className="flashcard-container"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="flashcard">
              <div className="flashcard-header">
                <span className="new-vocab-label">New Vocabulary!</span>
                <span className="difficulty-indicator" style={{
                  color: getDifficultyColor(currentVocab.difficulty)
                }}>
                  {renderDifficulty(currentVocab.difficulty)}
                </span>
              </div>

              <div className="flashcard-content">
                <div className="japanese-text">
                  {currentVocab.japanese}
                  {currentVocab.reading && (
                    <span className="reading">({currentVocab.reading})</span>
                  )}
                </div>
                
                <div className="divider"></div>
                
                <div className="english-text">
                  {currentVocab.english}
                </div>
              </div>

              {currentVocab.context && (
                <div className="context-section">
                  <span className="context-label">Context:</span>
                  <p className="context-text">{currentVocab.context}</p>
                </div>
              )}

              <motion.div 
                className="progress-bar"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grammar point display */}
      <div className="grammar-display">
        <AnimatePresence>
          {/* Grammar points would be displayed here */}
        </AnimatePresence>
      </div>

      {/* Stats overlay */}
      <div className="stats-overlay">
        <div className="stat-item">
          <span className="stat-label">Words Learned</span>
          <span className="stat-value">{vocabQueue.length + (currentVocab ? 1 : 0)}</span>
        </div>
      </div>

      <style>{`
        .obs-educational-view {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flashcard-container {
          position: absolute;
          z-index: 1000;
          filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5));
        }

        .flashcard {
          background: ${config.theme === 'transparent' 
            ? 'rgba(0, 0, 0, 0.9)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 30px;
          min-width: 400px;
          max-width: 600px;
          position: relative;
          overflow: hidden;
        }

        .flashcard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .new-vocab-label {
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .difficulty-indicator {
          font-size: 18px;
          font-weight: bold;
        }

        .flashcard-content {
          text-align: center;
          margin: 30px 0;
        }

        .japanese-text {
          font-size: 48px;
          font-weight: bold;
          color: white;
          margin-bottom: 20px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .reading {
          font-size: 24px;
          opacity: 0.8;
          margin-left: 10px;
        }

        .divider {
          width: 80px;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          margin: 20px auto;
          border-radius: 2px;
        }

        .english-text {
          font-size: 32px;
          color: white;
          opacity: 0.9;
        }

        .context-section {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
          margin-top: 20px;
        }

        .context-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
          color: white;
        }

        .context-text {
          margin-top: 8px;
          font-size: 16px;
          line-height: 1.5;
          color: white;
          opacity: 0.9;
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.5);
        }

        .stats-overlay {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
          color: white;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #4ADE80;
        }

        /* Theme variations */
        ${config.theme === 'light' ? `
          .flashcard {
            background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
            color: #1F2937;
          }
          
          .japanese-text, .english-text, .context-text {
            color: #1F2937;
          }
          
          .new-vocab-label {
            background: #4F46E5;
          }
        ` : ''}
      `}</style>
    </div>
  )
}

export default OBSEducationalView