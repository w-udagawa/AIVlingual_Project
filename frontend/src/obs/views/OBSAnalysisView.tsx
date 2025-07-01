import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OBSConfig } from '../OBSRouter'

interface AnalysisData {
  videoTitle?: string
  vocabularyCount: number
  difficulty: number
  topics: string[]
  expressions: Array<{
    japanese: string
    english: string
    type: string
  }>
}

interface OBSAnalysisViewProps {
  config: OBSConfig
}

const OBSAnalysisView: React.FC<OBSAnalysisViewProps> = ({ config }) => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [currentExpression, setCurrentExpression] = useState(0)

  // Mock data for demonstration - in real implementation, this would come from WebSocket
  useEffect(() => {
    // Simulate receiving analysis data
    const mockData: AnalysisData = {
      videoTitle: "【雑談】今日のゲーム配信について話すよ！",
      vocabularyCount: 42,
      difficulty: 3,
      topics: ['Gaming', 'Daily Chat', 'Vtuber Slang'],
      expressions: [
        { japanese: 'てぇてぇ', english: 'precious/wholesome', type: 'vtuber_slang' },
        { japanese: 'ぽんこつ', english: 'clumsy/airhead', type: 'vtuber_slang' },
        { japanese: '草', english: 'lol', type: 'internet_slang' },
        { japanese: 'がんばる', english: 'do my best', type: 'common' },
      ]
    }
    
    setAnalysisData(mockData)
  }, [])

  // Cycle through expressions
  useEffect(() => {
    if (!analysisData || analysisData.expressions.length === 0) return

    const interval = setInterval(() => {
      setCurrentExpression(prev => 
        (prev + 1) % analysisData.expressions.length
      )
    }, 3000)

    return () => clearInterval(interval)
  }, [analysisData])

  if (!analysisData) {
    return (
      <div className="obs-analysis-view">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Waiting for analysis data...</span>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (level: number) => {
    const colors = ['#4ADE80', '#84CC16', '#EAB308', '#F97316', '#EF4444']
    return colors[Math.min(level - 1, 4)]
  }

  return (
    <div className="obs-analysis-view">
      <div className="analysis-container">
        {/* Header */}
        <motion.div 
          className="analysis-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="video-title">{analysisData.videoTitle}</h2>
          <div className="analysis-stats">
            <div className="stat">
              <span className="stat-value">{analysisData.vocabularyCount}</span>
              <span className="stat-label">Vocabulary</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: getDifficultyColor(analysisData.difficulty) }}>
                {'★'.repeat(analysisData.difficulty)}
              </span>
              <span className="stat-label">Difficulty</span>
            </div>
          </div>
        </motion.div>

        {/* Topics */}
        <motion.div 
          className="topics-section"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3>Topics Covered</h3>
          <div className="topics-list">
            {analysisData.topics.map((topic, index) => (
              <motion.span 
                key={topic}
                className="topic-tag"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                {topic}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Expression Showcase */}
        <motion.div 
          className="expression-showcase"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3>Key Expressions</h3>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentExpression}
              className="current-expression"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="expression-japanese">
                {analysisData.expressions[currentExpression].japanese}
              </div>
              <div className="expression-english">
                {analysisData.expressions[currentExpression].english}
              </div>
              <div className="expression-type">
                {analysisData.expressions[currentExpression].type.replace('_', ' ')}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Expression progress dots */}
          <div className="expression-dots">
            {analysisData.expressions.map((_, index) => (
              <span 
                key={index}
                className={`dot ${index === currentExpression ? 'active' : ''}`}
              />
            ))}
          </div>
        </motion.div>

        {/* Live indicator */}
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span>LIVE ANALYSIS</span>
        </div>
      </div>

      <style>{`
        .obs-analysis-view {
          width: 100%;
          height: 100%;
          padding: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          color: ${config.fontColor};
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: ${config.fontColor};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .analysis-container {
          width: 100%;
          max-width: 800px;
          background: ${config.theme === 'transparent' 
            ? 'rgba(0, 0, 0, 0.8)' 
            : 'rgba(30, 30, 30, 0.95)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 40px;
          position: relative;
        }

        .analysis-header {
          margin-bottom: 30px;
        }

        .video-title {
          font-size: 28px;
          font-weight: bold;
          color: ${config.fontColor};
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .analysis-stats {
          display: flex;
          gap: 40px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #4ECDC4;
        }

        .stat-label {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.7;
          color: ${config.fontColor};
        }

        .topics-section {
          margin-bottom: 30px;
        }

        .topics-section h3 {
          font-size: 18px;
          margin-bottom: 16px;
          color: ${config.fontColor};
          opacity: 0.9;
        }

        .topics-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .topic-tag {
          background: rgba(78, 205, 196, 0.2);
          border: 1px solid #4ECDC4;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          color: ${config.fontColor};
        }

        .expression-showcase {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
        }

        .expression-showcase h3 {
          font-size: 18px;
          margin-bottom: 20px;
          color: ${config.fontColor};
          opacity: 0.9;
        }

        .current-expression {
          margin: 20px 0;
        }

        .expression-japanese {
          font-size: 48px;
          font-weight: bold;
          color: ${config.fontColor};
          margin-bottom: 16px;
        }

        .expression-english {
          font-size: 28px;
          color: ${config.fontColor};
          opacity: 0.8;
          margin-bottom: 12px;
        }

        .expression-type {
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.6;
          color: #4ECDC4;
        }

        .expression-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transition: all 0.3s;
        }

        .dot.active {
          background: #4ECDC4;
          transform: scale(1.5);
        }

        .live-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 0, 0, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 1px;
          color: white;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #FF0000;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        /* Theme variations */
        ${config.theme === 'light' ? `
          .analysis-container {
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          
          .topic-tag {
            background: rgba(78, 205, 196, 0.1);
            color: #047857;
          }
        ` : ''}
      `}</style>
    </div>
  )
}

export default OBSAnalysisView