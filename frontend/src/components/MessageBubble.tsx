import React, { useState } from 'react'

interface MessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    language?: string
    timestamp: number | Date
    translation?: string
    audioUrl?: string
    isStreaming?: boolean
    metadata?: {
      contains_translation?: boolean
      new_expressions?: string[]
      grammar_points?: string[]
    }
  }
}

const MessageBubble: React.FC<MessageProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'ja':
        return '日本語'
      case 'en':
        return 'English'
      case 'mixed':
        return '日/EN'
      default:
        return ''
    }
  }

  return (
    <div className={`message-bubble ${message.role}`}>
      <div className="message-header">
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'AIVlingual'}
        </span>
        {message.language && <span className="message-language">{getLanguageLabel(message.language)}</span>}
      </div>
      
      <div className="message-content">
        {message.content}
        {message.isStreaming && (
          <span className="streaming-indicator">●●●</span>
        )}
      </div>
      
      {message.audioUrl && (
        <div className="audio-controls">
          <button onClick={playAudio} className="audio-button">
            {isPlaying ? '⏸️' : '▶️'} Play Audio
          </button>
          <audio ref={audioRef} src={message.audioUrl} onEnded={() => setIsPlaying(false)} />
        </div>
      )}
      
      {message.metadata?.new_expressions && message.metadata.new_expressions.length > 0 && (
        <div className="expressions-section">
          <div className="expressions-label">New Expressions:</div>
          <div className="expressions-list">
            {message.metadata.new_expressions.map((expr, index) => (
              <span key={index} className="expression-tag">
                {expr}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>

      <style>{`
        .message-bubble {
          max-width: 70%;
          padding: 1rem;
          border-radius: 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
        }

        .message-bubble.user {
          align-self: flex-end;
          background-color: rgba(124, 58, 237, 0.1);
          border-color: rgba(124, 58, 237, 0.3);
          margin-left: auto;
        }

        .message-bubble.assistant {
          align-self: flex-start;
          background-color: rgba(236, 72, 153, 0.1);
          border-color: rgba(236, 72, 153, 0.3);
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
        }

        .message-role {
          font-weight: 600;
          color: var(--text-primary);
        }

        .message-language {
          padding: 0.125rem 0.5rem;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 0.25rem;
          color: var(--text-secondary);
        }

        .message-content {
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .audio-controls {
          margin-top: 0.75rem;
        }

        .audio-button {
          padding: 0.5rem 1rem;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .audio-button:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }

        .expressions-section {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }

        .expressions-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .expressions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .expression-tag {
          padding: 0.25rem 0.75rem;
          background-color: rgba(124, 58, 237, 0.2);
          border-radius: 1rem;
          font-size: 0.875rem;
          color: var(--primary-color);
        }

        .message-time {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: right;
        }

        .streaming-indicator {
          display: inline-block;
          margin-left: 0.5rem;
          animation: pulse 1.5s ease-in-out infinite;
          color: var(--primary-color);
          font-size: 0.75rem;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default MessageBubble