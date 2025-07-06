import React from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'

const ConnectionStatus: React.FC = () => {
  const { isConnected, isConnecting } = useWebSocket()

  const getStatusIcon = () => {
    if (isConnecting) {
      return (
        <div className="connection-status-icon connecting">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )
    }

    return (
      <div className={`connection-status-icon ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="status-dot"></div>
      </div>
    )
  }

  return (
    <div className="connection-status" data-testid="connection-status">
      {getStatusIcon()}
      <span className="status-text" data-testid="connection-status-text">
        {isConnecting ? '接続中...' : isConnected ? '接続済み' : '切断'}
      </span>

      <style>{`
        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .connection-status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .connected .status-dot {
          background-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .disconnected .status-dot {
          background-color: #ef4444;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
        }

        .connecting {
          color: #f59e0b;
        }

        .status-text {
          color: var(--text-secondary);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .connected .status-dot {
          animation: pulse 2s infinite;
        }

        @media (max-width: 768px) {
          .connection-status {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }

          .status-text {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default ConnectionStatus