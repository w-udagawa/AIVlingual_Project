import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MessageBubble from './MessageBubble'
import { useWebSocket } from '../contexts/WebSocketContext'
import webSpeechSynthesis from '../services/WebSpeechSynthesis'

// Remove local Message interface and use the one from WebSocketContext

const ChatDisplay: React.FC = () => {
  const [localMessages, setLocalMessages] = useState<any[]>([])
  const [isAIResponding, setIsAIResponding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { sendTextMessage, messages, connectionState } = useWebSocket()
  const [inputValue, setInputValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    // Listen for transcription events
    const handleTranscription = (event: CustomEvent) => {
      const { text, language } = event.detail
      
      const newMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        language,
        timestamp: new Date(),
      }
      
      setLocalMessages(prev => [...prev, newMessage])
      setIsAIResponding(true)
    }

    // Listen for AI response events
    const handleAIResponse = (event: CustomEvent) => {
      const { text, language, tts_command, metadata } = event.detail
      
      const newMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: text,
        language,
        timestamp: new Date(),
        ttsCommand: tts_command,
        metadata,
      }
      
      setLocalMessages(prev => [...prev, newMessage])
      setIsAIResponding(false)
      
      // Automatically speak the response if TTS command is provided
      if (tts_command && webSpeechSynthesis.isSupported()) {
        // Handle nested command structure
        const commandToSpeak = tts_command.command || tts_command
        webSpeechSynthesis.speak(commandToSpeak).catch(error => {
          console.error('Failed to speak:', error)
        })
      }
    }

    // Listen for streaming AI response completion
    const handleAIResponseFinal = (event: CustomEvent) => {
      setIsAIResponding(false)
      
      const { tts_command } = event.detail
      // Automatically speak the response if TTS command is provided
      if (tts_command && webSpeechSynthesis.isSupported()) {
        // Handle nested command structure
        const commandToSpeak = tts_command.command || tts_command
        webSpeechSynthesis.speak(commandToSpeak).catch(error => {
          console.error('Failed to speak:', error)
        })
      }
    }

    window.addEventListener('transcription', handleTranscription as EventListener)
    window.addEventListener('ai_response', handleAIResponse as EventListener)
    window.addEventListener('ai_response_final', handleAIResponseFinal as EventListener)

    return () => {
      window.removeEventListener('transcription', handleTranscription as EventListener)
      window.removeEventListener('ai_response', handleAIResponse as EventListener)
      window.removeEventListener('ai_response_final', handleAIResponseFinal as EventListener)
    }
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, localMessages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    console.log('ChatDisplay: Sending message:', inputValue);

    // No need to add message here, WebSocketContext will handle it
    sendTextMessage(inputValue)
    setInputValue('')
    setIsAIResponding(true)
    
    // Set timeout to reset AI responding state if no response
    const timeoutId = setTimeout(() => {
      if (isAIResponding) {
        console.warn('No AI response received after 30 seconds');
        setIsAIResponding(false);
      }
    }, 30000);
    
    // Store timeout ID for cleanup
    return () => clearTimeout(timeoutId);
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      window.dispatchEvent(new CustomEvent('stop_speech_recognition'))
      setIsRecording(false)
    } else {
      // Start recording
      window.dispatchEvent(new CustomEvent('start_speech_recognition'))
      setIsRecording(true)
    }
  }

  return (
    <div className="chat-display">
      <div className="messages-container">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isAIResponding && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="ai-loading-indicator"
          >
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="loading-text">AIが考えています...</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <button
          type="button"
          onClick={handleVoiceInput}
          className={`voice-button ${isRecording ? 'recording' : ''}`}
          aria-label="音声入力"
        >
          {isRecording ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"/>
              <path d="M16 11a4 4 0 0 1-8 0H6a6 6 0 0 0 12 0h-2z"/>
              <path d="M12 18v3m-3 0h6"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="メッセージを入力..."
          className="chat-input"
        />
        <button type="submit" className="send-button" disabled={!inputValue.trim() || isAIResponding}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>

      <style>{`
        .chat-display {
          display: flex;
          flex-direction: column;
          height: 500px;
          background-color: rgba(15, 23, 42, 0.3);
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chat-input-form {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background-color: rgba(30, 41, 59, 0.5);
          border-top: 1px solid var(--border-color);
        }

        .chat-input {
          flex: 1;
          padding: 0.75rem 1rem;
          background-color: var(--surface);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-input:focus {
          border-color: var(--primary-color);
        }

        .voice-button {
          padding: 0.75rem;
          background-color: var(--surface);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .voice-button:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .voice-button.recording {
          background-color: var(--error);
          color: white;
          border-color: var(--error);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .send-button {
          padding: 0.75rem 1rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          min-width: 50px;
        }

        .send-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: translateX(2px);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-loading-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background-color: rgba(124, 58, 237, 0.1);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .typing-dots {
          display: flex;
          gap: 0.25rem;
        }

        .typing-dots span {
          width: 8px;
          height: 8px;
          background-color: var(--primary-color);
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          40% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        .loading-text {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

export default ChatDisplay