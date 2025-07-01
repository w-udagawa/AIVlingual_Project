import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../contexts/WebSocketContext'
import type { OBSConfig } from '../OBSRouter'

interface Subtitle {
  id: string
  text: string
  speaker: 'user' | 'ai'
  language: 'ja' | 'en' | 'mixed'
  timestamp: number
  translation?: string
}

interface OBSSubtitleViewProps {
  config: OBSConfig
}

const OBSSubtitleView: React.FC<OBSSubtitleViewProps> = ({ config }) => {
  const { messages, isConnected } = useWebSocket()
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null)
  const [subtitleQueue, setSubtitleQueue] = useState<Subtitle[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Process incoming messages into subtitles
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    // Create subtitle from message
    const subtitle: Subtitle = {
      id: `sub-${Date.now()}`,
      text: lastMessage.content,
      speaker: lastMessage.role === 'user' ? 'user' : 'ai',
      language: detectLanguage(lastMessage.content),
      timestamp: Date.now(),
      translation: lastMessage.translation
    }

    // Add to queue
    setSubtitleQueue(prev => [...prev, subtitle])
  }, [messages])

  // Process subtitle queue
  useEffect(() => {
    if (currentSubtitle || subtitleQueue.length === 0) return

    const nextSubtitle = subtitleQueue[0]
    setCurrentSubtitle(nextSubtitle)
    setSubtitleQueue(prev => prev.slice(1))

    // Auto-hide after duration based on text length
    const duration = Math.max(3000, nextSubtitle.text.length * 50)
    timeoutRef.current = setTimeout(() => {
      setCurrentSubtitle(null)
    }, duration)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentSubtitle, subtitleQueue])

  // Detect language
  const detectLanguage = (text: string): 'ja' | 'en' | 'mixed' => {
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)
    const hasEnglish = /[a-zA-Z]/.test(text)
    
    if (hasJapanese && hasEnglish) return 'mixed'
    if (hasJapanese) return 'ja'
    return 'en'
  }

  // Get position styles
  const getPositionStyles = () => {
    switch (config.position) {
      case 'top':
        return { top: '10%', transform: 'translateX(-50%)' }
      case 'center':
        return { top: '50%', transform: 'translate(-50%, -50%)' }
      case 'bottom':
      default:
        return { bottom: '10%', transform: 'translateX(-50%)' }
    }
  }

  // Get speaker color
  const getSpeakerColor = (speaker: 'user' | 'ai') => {
    if (config.theme === 'transparent') {
      return speaker === 'user' ? '#FFD700' : '#00CED1'
    }
    return speaker === 'user' ? '#FF6B6B' : '#4ECDC4'
  }

  return (
    <div className="obs-subtitle-view">
      {!isConnected && (
        <div className="connection-status">
          <span className="status-dot"></span>
          Connecting...
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentSubtitle && (
          <motion.div
            key={currentSubtitle.id}
            className="subtitle-container"
            style={{
              ...getPositionStyles(),
              fontSize: config.fontSize
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="subtitle-box">
              <div className="speaker-indicator" style={{
                backgroundColor: getSpeakerColor(currentSubtitle.speaker)
              }}>
                {currentSubtitle.speaker === 'user' ? 'User' : 'AI'}
              </div>
              
              <div className="subtitle-text">
                {currentSubtitle.text}
              </div>
              
              {currentSubtitle.translation && (
                <div className="subtitle-translation">
                  {currentSubtitle.translation}
                </div>
              )}
              
              <div className="language-badge">
                {currentSubtitle.language.toUpperCase()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .obs-subtitle-view {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .connection-status {
          position: absolute;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 20px;
          font-size: 14px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #ff4444;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .subtitle-container {
          position: absolute;
          left: 50%;
          max-width: 80%;
          z-index: 1000;
        }

        .subtitle-box {
          background: ${config.theme === 'transparent' 
            ? 'rgba(0, 0, 0, 0.85)' 
            : 'rgba(30, 30, 30, 0.95)'};
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 20px 30px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          position: relative;
          min-width: 300px;
          text-align: center;
        }

        .speaker-indicator {
          position: absolute;
          top: -10px;
          left: 20px;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .subtitle-text {
          color: ${config.fontColor};
          line-height: 1.6;
          font-weight: 500;
          margin: 10px 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        }

        .subtitle-translation {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85em;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          font-style: italic;
        }

        .language-badge {
          position: absolute;
          bottom: -10px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        /* Specific styles for different themes */
        ${config.theme === 'dark' ? `
          .subtitle-box {
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        ` : ''}

        ${config.theme === 'light' ? `
          .subtitle-box {
            background: rgba(255, 255, 255, 0.95);
            color: #333;
          }
          
          .subtitle-text {
            color: #333;
            text-shadow: none;
          }
          
          .subtitle-translation {
            color: #666;
          }
        ` : ''}

        /* Animation for subtitle queue indicator */
        .queue-indicator {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          gap: 4px;
        }

        .queue-dot {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
        }
      `}</style>
    </div>
  )
}

export default OBSSubtitleView