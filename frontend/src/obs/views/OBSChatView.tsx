import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../contexts/WebSocketContext'
import type { OBSConfig } from '../OBSRouter'

interface OBSChatViewProps {
  config: OBSConfig
}

const OBSChatView: React.FC<OBSChatViewProps> = ({ config }) => {
  const { messages, isConnected } = useWebSocket()
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get theme-based styles
  const getMessageStyle = (role: string) => {
    const isUser = role === 'user'
    
    if (config.theme === 'transparent') {
      return {
        background: isUser 
          ? 'rgba(255, 215, 0, 0.2)' 
          : 'rgba(0, 206, 209, 0.2)',
        borderColor: isUser ? '#FFD700' : '#00CED1'
      }
    }
    
    return {
      background: isUser 
        ? 'rgba(79, 70, 229, 0.1)' 
        : 'rgba(16, 185, 129, 0.1)',
      borderColor: isUser ? '#4F46E5' : '#10B981'
    }
  }

  return (
    <div className="obs-chat-view">
      <div className="chat-messages">
        <AnimatePresence initial={false}>
          {messages.slice(-10).map((message, index) => (
            <motion.div
              key={`${message.id}-${index}`}
              className={`chat-message ${message.role}`}
              style={getMessageStyle(message.role)}
              initial={{ opacity: 0, x: message.role === 'user' ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="message-header">
                <span className="speaker-name">
                  {message.role === 'user' ? '🎮 User' : '🤖 AI'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="message-content">
                {message.content}
              </div>
              
              {message.translation && (
                <div className="message-translation">
                  {message.translation}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {!isConnected && (
        <div className="connection-overlay">
          <div className="connection-message">
            Waiting for connection...
          </div>
        </div>
      )}

      <style>{`
        .obs-chat-view {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Hide scrollbar for OBS */
        .chat-messages::-webkit-scrollbar {
          display: none;
        }

        .chat-message {
          border-radius: 12px;
          padding: 16px;
          border-left: 4px solid;
          backdrop-filter: blur(10px);
          max-width: 80%;
          animation: slideIn 0.3s ease-out;
        }

        .chat-message.user {
          align-self: flex-end;
          margin-left: auto;
        }

        .chat-message.assistant {
          align-self: flex-start;
          margin-right: auto;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .speaker-name {
          font-weight: bold;
          color: ${config.fontColor};
        }

        .message-time {
          font-size: 12px;
          opacity: 0.7;
          color: ${config.fontColor};
        }

        .message-content {
          color: ${config.fontColor};
          line-height: 1.6;
          font-size: ${config.fontSize - 4}px;
        }

        .message-translation {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-style: italic;
          opacity: 0.8;
          font-size: ${config.fontSize - 6}px;
        }

        .connection-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }

        .connection-message {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px 40px;
          border-radius: 12px;
          font-size: 18px;
          color: white;
          animation: pulse 2s infinite;
        }

        /* Different themes */
        ${config.theme === 'dark' ? `
          .chat-messages {
            background: rgba(0, 0, 0, 0.9);
          }
        ` : ''}

        ${config.theme === 'light' ? `
          .chat-messages {
            background: rgba(255, 255, 255, 0.9);
          }
          
          .chat-message {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
        ` : ''}

        ${config.theme === 'transparent' ? `
          .chat-messages {
            background: transparent;
          }
          
          .chat-message {
            background: rgba(0, 0, 0, 0.7) !important;
            backdrop-filter: blur(20px);
          }
        ` : ''}
      `}</style>
    </div>
  )
}

export default OBSChatView