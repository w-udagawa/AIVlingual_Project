/**
 * WebSocket hook
 */

import { useContext } from 'react'
import { WebSocketContext } from '../contexts/WebSocketContext'

export default function useWebSocket() {
  const context = useContext(WebSocketContext)
  
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  
  return context
}