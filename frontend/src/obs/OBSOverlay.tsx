import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../contexts/WebSocketContext'

interface SubtitleData {
  text: string
  language: 'ja' | 'en' | 'mixed'
  timestamp: number
}

interface VocabularyHighlight {
  japanese: string
  english: string
  showDuration: number
}

const OBSOverlay: React.FC = () => {
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleData | null>(null)
  const [vocabularyHighlight, setVocabularyHighlight] = useState<VocabularyHighlight | null>(null)
  const [avatarState, setAvatarState] = useState<'idle' | 'talking' | 'thinking'>('idle')
  const { isConnected } = useWebSocket()

  useEffect(() => {
    // Listen for OBS events via WebSocket
    const handleSubtitle = (event: CustomEvent) => {
      setCurrentSubtitle(event.detail)
      
      // Auto-hide subtitle after 5 seconds
      setTimeout(() => {
        setCurrentSubtitle(null)
      }, 5000)
    }

    const handleVocabulary = (event: CustomEvent) => {
      setVocabularyHighlight(event.detail)
      
      // Auto-hide after specified duration
      setTimeout(() => {
        setVocabularyHighlight(null)
      }, event.detail.showDuration || 3000)
    }

    const handleAvatarState = (event: CustomEvent) => {
      setAvatarState(event.detail.state)
    }

    window.addEventListener('obs:subtitle', handleSubtitle as EventListener)
    window.addEventListener('obs:vocabulary', handleVocabulary as EventListener)
    window.addEventListener('obs:avatar', handleAvatarState as EventListener)

    // Also listen for WebSocket events
    const handleTranscription = (event: CustomEvent) => {
      if (event.detail.text) {
        setCurrentSubtitle({
          text: event.detail.text,
          language: event.detail.language || 'ja',
          timestamp: Date.now()
        })
        
        setTimeout(() => {
          setCurrentSubtitle(null)
        }, 5000)
      }
    }

    const handleAIResponse = (event: CustomEvent) => {
      if (event.detail.text) {
        setAvatarState('talking')
        setTimeout(() => {
          setAvatarState('idle')
        }, 3000)
      }
    }

    window.addEventListener('transcription', handleTranscription as EventListener)
    window.addEventListener('ai_response', handleAIResponse as EventListener)

    return () => {
      window.removeEventListener('obs:subtitle', handleSubtitle as EventListener)
      window.removeEventListener('obs:vocabulary', handleVocabulary as EventListener)
      window.removeEventListener('obs:avatar', handleAvatarState as EventListener)
      window.removeEventListener('transcription', handleTranscription as EventListener)
      window.removeEventListener('ai_response', handleAIResponse as EventListener)
    }
  }, [])

  return (
    <div className="obs-overlay">
      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-warning">
          <span className="warning-icon">⚠️</span>
          <span>Not connected to server</span>
        </div>
      )}
      {/* Avatar Display */}
      <div className="avatar-container">
        <img 
          src={`/obs-assets/avatars/${avatarState}.png`} 
          alt="AIVlingual Avatar"
          className="avatar-image"
        />
      </div>

      {/* Subtitle Display */}
      <AnimatePresence>
        {currentSubtitle && (
          <motion.div
            className="subtitle-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`subtitle-text ${currentSubtitle.language}`}>
              {currentSubtitle.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vocabulary Highlight */}
      <AnimatePresence>
        {vocabularyHighlight && (
          <motion.div
            className="vocabulary-highlight"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="vocabulary-japanese">{vocabularyHighlight.japanese}</div>
            <div className="vocabulary-arrow">↓</div>
            <div className="vocabulary-english">{vocabularyHighlight.english}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .obs-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .avatar-container {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 300px;
          height: 300px;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .subtitle-container {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 80%;
          background-color: rgba(0, 0, 0, 0.8);
          padding: 1rem 2rem;
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
        }

        .subtitle-text {
          font-size: 1.5rem;
          color: white;
          text-align: center;
          line-height: 1.5;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .subtitle-text.ja {
          font-family: 'Noto Sans JP', sans-serif;
        }

        .subtitle-text.mixed {
          font-family: 'Noto Sans JP', 'Segoe UI', sans-serif;
        }

        .vocabulary-highlight {
          position: absolute;
          top: 50px;
          right: 50px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(236, 72, 153, 0.9));
          padding: 1.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          min-width: 250px;
        }

        .vocabulary-japanese {
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          text-align: center;
          margin-bottom: 0.5rem;
          font-family: 'Noto Sans JP', sans-serif;
        }

        .vocabulary-arrow {
          font-size: 1.5rem;
          color: white;
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .vocabulary-english {
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
          text-align: center;
        }

        .connection-warning {
          position: absolute;
          top: 20px;
          left: 20px;
          background-color: rgba(239, 68, 68, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default OBSOverlay