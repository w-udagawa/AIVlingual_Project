import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface StreamingMessageProps {
  initialContent?: string
  isStreaming: boolean
}

const StreamingMessage: React.FC<StreamingMessageProps> = ({ 
  initialContent = '', 
  isStreaming 
}) => {
  const [content, setContent] = useState(initialContent)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isStreaming])

  useEffect(() => {
    // Listen for streaming chunks
    const handleChunk = (event: CustomEvent) => {
      const { text } = event.detail
      setContent(prev => prev + text)
    }

    window.addEventListener('ai_response_chunk', handleChunk as EventListener)

    return () => {
      window.removeEventListener('ai_response_chunk', handleChunk as EventListener)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="streaming-message"
    >
      <div className="message-content">
        {content || 'AIが考えています'}
        {isStreaming && <span className="dots">{dots}</span>}
      </div>
      {isStreaming && (
        <div className="streaming-indicator">
          <div className="pulse"></div>
          <span>生成中...</span>
        </div>
      )}
      <style>{`
        .streaming-message {
          background-color: rgba(124, 58, 237, 0.1);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .message-content {
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .dots {
          color: var(--primary-color);
          font-weight: bold;
        }

        .streaming-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.75rem;
        }

        .pulse {
          width: 8px;
          height: 8px;
          background-color: var(--primary-color);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </motion.div>
  )
}

export default StreamingMessage
