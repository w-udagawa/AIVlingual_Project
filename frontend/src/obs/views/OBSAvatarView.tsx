import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebSocket } from '../../contexts/WebSocketContext'
import type { OBSConfig } from '../OBSRouter'

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'excited' | 'confused'

interface OBSAvatarViewProps {
  config: OBSConfig
}

const OBSAvatarView: React.FC<OBSAvatarViewProps> = ({ config }) => {
  const { messages, isConnected, connectionState } = useWebSocket()
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [emotion, setEmotion] = useState<string>('neutral')

  // Update avatar state based on WebSocket activity
  useEffect(() => {
    if (!isConnected) {
      setAvatarState('idle')
      return
    }

    if (connectionState === 'listening') {
      setAvatarState('listening')
    } else if (connectionState === 'processing') {
      setAvatarState('thinking')
    }
  }, [isConnected, connectionState])

  // React to new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    if (lastMessage.role === 'assistant') {
      setAvatarState('speaking')
      
      // Detect emotion from message content
      const content = lastMessage.content.toLowerCase()
      if (content.includes('!') || content.includes('すごい')) {
        setEmotion('excited')
        setAvatarState('excited')
      } else if (content.includes('?') || content.includes('どう')) {
        setEmotion('curious')
      } else if (content.includes('...') || content.includes('うーん')) {
        setAvatarState('confused')
      }

      // Simulate speaking duration
      const speakingDuration = Math.min(lastMessage.content.length * 50, 5000)
      setTimeout(() => {
        setAvatarState('idle')
        setEmotion('neutral')
      }, speakingDuration)
    }
  }, [messages])

  // Get avatar image based on state
  const getAvatarImage = () => {
    // Using static PNG images for all states
    const basePath = '/avatars/'
    const stateImages = {
      idle: 'idle.png',
      listening: 'listening.png',
      thinking: 'thinking.png',
      speaking: 'speaking.png',
      excited: 'excited.png',
      confused: 'confused.png'
    }
    
    return `${basePath}${stateImages[avatarState]}`
  }

  // Lip sync simulation for speaking
  const renderMouth = () => {
    if (avatarState !== 'speaking') return null
    
    return (
      <motion.div
        className="mouth"
        animate={{
          scaleY: [1, 0.6, 1, 0.8, 1],
          scaleX: [1, 1.2, 1, 1.1, 1]
        }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    )
  }

  return (
    <div className="obs-avatar-view">
      <div className="avatar-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={avatarState}
            className="avatar-wrapper"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Avatar image with animations */}
            <motion.img 
              src={getAvatarImage()} 
              alt="AI Avatar"
              className="avatar-image"
              animate={{
                y: avatarState === 'speaking' ? [-3, 3, -3] : 0,
                scale: avatarState === 'excited' ? [1, 1.05, 1] : 1,
              }}
              transition={{
                y: {
                  duration: 2,
                  repeat: avatarState === 'speaking' ? Infinity : 0,
                  ease: "easeInOut"
                },
                scale: {
                  duration: 0.5,
                  repeat: avatarState === 'excited' ? Infinity : 0,
                  repeatType: "reverse"
                }
              }}
              onError={(e) => {
                // Fallback to idle image if current state image not found
                const target = e.target as HTMLImageElement
                if (!target.src.includes('idle.png')) {
                  target.src = '/avatars/idle.png'
                }
              }}
            />
            
            {/* Overlay effects */}
            {avatarState === 'thinking' && (
              <motion.div 
                className="thinking-bubble overlay"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <span>💭</span>
              </motion.div>
            )}
            
            {avatarState === 'excited' && (
              <motion.div 
                className="excitement-effects overlay"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  ✨
                </motion.span>
              </motion.div>
            )}
            
            {/* Blinking overlay for idle state */}
            {(avatarState === 'idle' || avatarState === 'listening') && (
              <motion.div 
                className="blink-overlay"
                animate={{
                  opacity: [0, 0, 1, 0]
                }}
                transition={{
                  duration: 0.2,
                  repeat: Infinity,
                  repeatDelay: 4,
                  times: [0, 0.4, 0.5, 1]
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Status indicator */}
        <div className="status-indicator">
          <span className={`status-dot ${avatarState}`}></span>
          <span className="status-text">{avatarState}</span>
        </div>
      </div>

      <style>{`
        .obs-avatar-view {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .avatar-container {
          position: relative;
        }

        .avatar-wrapper {
          position: relative;
        }

        /* Avatar image styles */
        .avatar-image {
          width: 300px;
          height: 300px;
          object-fit: contain;
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3));
        }

        /* Overlay effects */
        .overlay {
          position: absolute;
          pointer-events: none;
        }

        .thinking-bubble {
          top: -20px;
          right: -20px;
          font-size: 48px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        .excitement-effects {
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 48px;
        }

        /* Blink overlay */
        .blink-overlay {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 20px;
          background: ${config.backgroundColor === 'transparent' ? 'rgba(0, 0, 0, 0.9)' : config.backgroundColor};
          border-radius: 50%;
          pointer-events: none;
          opacity: 0;
        }

        .status-indicator {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          padding: 8px 16px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }

        .status-dot.idle { background: #666; }
        .status-dot.listening { background: #3B82F6; animation: pulse 2s infinite; }
        .status-dot.thinking { background: #F59E0B; animation: pulse 1s infinite; }
        .status-dot.speaking { background: #10B981; animation: pulse 0.5s infinite; }
        .status-dot.excited { background: #EC4899; }
        .status-dot.confused { background: #8B5CF6; }

        .status-text {
          font-size: 14px;
          color: white;
          text-transform: capitalize;
        }


        /* Theme variations */
        ${config.theme === 'transparent' ? `
          .avatar-body {
            background: rgba(102, 126, 234, 0.8);
            backdrop-filter: blur(20px);
          }
        ` : ''}
      `}</style>
    </div>
  )
}

export default OBSAvatarView