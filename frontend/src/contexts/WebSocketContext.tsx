import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  translation?: string
  isStreaming?: boolean
}

interface WebSocketContextType {
  ws: WebSocket | null
  isConnected: boolean
  isConnecting: boolean
  messages: Message[]
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'listening' | 'processing'
  sendAudioData: (audioData: Blob) => void
  sendTextMessage: (text: string) => void
  sendControlMessage: (command: string, parameters?: any) => void
  sendMessage: (message: any) => void
}

const WebSocketContext = createContext<WebSocketContextType>({
  ws: null,
  isConnected: false,
  isConnecting: false,
  messages: [],
  connectionState: 'disconnected',
  sendAudioData: () => {},
  sendTextMessage: () => {},
  sendControlMessage: () => {},
  sendMessage: () => {},
})

export const useWebSocket = () => useContext(WebSocketContext)

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'listening' | 'processing'>('disconnected')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const keepAliveIntervalRef = useRef<NodeJS.Timeout>()
  const streamingMessageIdRef = useRef<string | null>(null)

  const connectWebSocket = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      toast.error('Failed to connect after multiple attempts')
      return
    }

    setConnectionState('connecting')
    const websocket = new WebSocket('ws://localhost:8000/ws/audio')
    
    websocket.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setConnectionState('connected')
      setWs(websocket)
      reconnectAttemptsRef.current = 0
      toast.success('Connected to AIVlingual')
      
      // Start keepalive ping
      keepAliveIntervalRef.current = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000) // Ping every 30 seconds
    }

    websocket.onclose = (event) => {
      console.log('WebSocket disconnected', event)
      setIsConnected(false)
      setConnectionState('disconnected')
      setWs(null)
      
      // Clear keepalive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
      }
      
      // Don't reconnect if it was a clean close
      if (event.code === 1000) {
        return
      }
      
      // Attempt to reconnect
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
        toast.error(`Disconnected. Reconnecting in ${delay / 1000}s...`)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, delay)
      } else {
        toast.error('Unable to connect to server. Please refresh the page.')
      }
    }

    websocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data)
        console.log('Parsed WebSocket data:', data);
        
        switch (data.type) {
          case 'connection':
            console.log('Connection confirmed:', data)
            break
          case 'transcription':
          case 'transcription_confirmed':
            // Add user message
            const userMessage: Message = {
              id: `msg-${Date.now()}-user`,
              role: 'user',
              content: data.text || data.content || '',
              timestamp: Date.now()
            }
            setMessages(prev => [...prev, userMessage])
            setConnectionState('processing')
            window.dispatchEvent(new CustomEvent('transcription', { detail: data }))
            break
          case 'ai_response':
            // Add AI message
            const aiMessage: Message = {
              id: `msg-${Date.now()}-ai`,
              role: 'assistant',
              content: data.response || data.content || data.text || '',
              timestamp: Date.now(),
              translation: data.translation
            }
            console.log('Adding AI message:', aiMessage);
            setMessages(prev => [...prev, aiMessage])
            setConnectionState('listening')
            window.dispatchEvent(new CustomEvent('ai_response', { detail: data }))
            break
          case 'ai_response_chunk':
            // Handle streaming chunk
            console.log('AI chunk received:', data.text)
            if (!streamingMessageIdRef.current) {
              // Create new streaming message
              streamingMessageIdRef.current = `msg-${Date.now()}-ai`
              const newStreamingMessage: Message = {
                id: streamingMessageIdRef.current,
                role: 'assistant',
                content: data.text || '',
                timestamp: Date.now(),
                isStreaming: true
              }
              console.log('Creating new streaming message:', newStreamingMessage)
              setMessages(prev => {
                console.log('Messages before adding:', prev.length)
                return [...prev, newStreamingMessage]
              })
            } else {
              // Append to existing streaming message
              console.log('Appending to existing message:', streamingMessageIdRef.current)
              setMessages(prev => prev.map(msg => 
                msg.id === streamingMessageIdRef.current
                  ? { ...msg, content: msg.content + (data.text || '') }
                  : msg
              ))
            }
            break
          case 'ai_response_final':
            // Finalize streaming message
            if (streamingMessageIdRef.current) {
              setMessages(prev => prev.map(msg => 
                msg.id === streamingMessageIdRef.current
                  ? { 
                      ...msg, 
                      content: data.text || msg.content,
                      translation: data.translation,
                      isStreaming: false 
                    }
                  : msg
              ))
              streamingMessageIdRef.current = null
            } else {
              // If no streaming message, create a new one
              const finalMessage: Message = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: data.text || '',
                timestamp: Date.now(),
                translation: data.translation,
                isStreaming: false
              }
              setMessages(prev => [...prev, finalMessage])
            }
            setConnectionState('listening')
            window.dispatchEvent(new CustomEvent('ai_response_final', { detail: data }))
            break
          case 'error':
            console.error('Server error:', data)
            // Provide more user-friendly error messages
            const errorMessage = data.message || 'An error occurred'
            if (errorMessage.includes('Unknown message type')) {
              toast.error('Communication error. Please refresh the page.')
            } else if (errorMessage.includes('Audio processing error')) {
              toast.error('Audio processing failed. Please check your microphone.')
            } else {
              toast.error(errorMessage)
            }
            break
          case 'pong':
            // Handle pong response for keepalive
            break
          case 'tts_command':
            // Handle TTS command (ignore for now)
            break
          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast.error('WebSocket connection error')
    }

    return websocket
  }, [])

  useEffect(() => {
    const websocket = connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
      }
      if (websocket) {
        websocket.close()
      }
    }
  }, []) // Empty dependency array since connectWebSocket doesn't depend on any props/state

  const sendAudioData = useCallback((audioData: Blob) => {
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      // Convert blob to array buffer and send
      audioData.arrayBuffer().then((buffer) => {
        const audioPrefix = new TextEncoder().encode('AUDIO:')
        const combinedBuffer = new Uint8Array(audioPrefix.length + buffer.byteLength)
        combinedBuffer.set(audioPrefix, 0)
        combinedBuffer.set(new Uint8Array(buffer), audioPrefix.length)
        
        ws.send(combinedBuffer)
      })
    }
  }, [ws, isConnected])

  const sendTextMessage = useCallback((text: string, enableStreaming: boolean = false) => {
    console.log('sendTextMessage called:', { text, ws: !!ws, isConnected, wsState: ws?.readyState });
    
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: text,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, userMessage])
      setConnectionState('processing')
      
      const messageToSend = {
        type: 'generate_response_stream',
        text: text,
        enable_streaming: enableStreaming,
        context: {
          language: 'auto'
        },
        timestamp: new Date().toISOString(),
      };
      
      console.log('Sending WebSocket message:', messageToSend);
      
      // Send with streaming support
      ws.send(JSON.stringify(messageToSend))
    } else {
      console.error('Cannot send message - WebSocket not ready:', {
        ws: !!ws,
        isConnected,
        readyState: ws?.readyState
      });
    }
  }, [ws, isConnected])

  const sendControlMessage = useCallback((command: string, parameters?: any) => {
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: command,
        ...parameters,
        timestamp: new Date().toISOString(),
      }))
    }
  }, [ws, isConnected])

  const sendMessage = useCallback((message: any) => {
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }, [ws, isConnected])

  const contextValue: WebSocketContextType = {
    ws,
    isConnected,
    isConnecting: connectionState === 'connecting',
    messages,
    connectionState,
    sendAudioData,
    sendTextMessage,
    sendControlMessage,
    sendMessage,
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}