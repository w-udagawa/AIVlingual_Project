import React, { useMemo } from 'react'
import OBSSubtitleView from './views/OBSSubtitleView'
import OBSChatView from './views/OBSChatView'
import OBSAnalysisView from './views/OBSAnalysisView'
import OBSEducationalView from './views/OBSEducationalView'
import OBSAvatarView from './views/OBSAvatarView'
import { WebSocketProvider } from '../contexts/WebSocketContext'

export type OBSViewMode = 'subtitle' | 'chat' | 'analysis' | 'educational' | 'avatar'

interface OBSConfig {
  mode: OBSViewMode
  fontSize?: number
  fontColor?: string
  backgroundColor?: string
  position?: 'top' | 'center' | 'bottom'
  width?: number
  height?: number
  animation?: boolean
  theme?: 'light' | 'dark' | 'transparent'
}

const OBSRouter: React.FC = () => {
  // Parse configuration from URL parameters
  const config: OBSConfig = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search)
    
    return {
      mode: (searchParams.get('mode') as OBSViewMode) || 'subtitle',
      fontSize: parseInt(searchParams.get('fontSize') || '24'),
      fontColor: searchParams.get('fontColor') || '#FFFFFF',
      backgroundColor: searchParams.get('bgColor') || 'transparent',
      position: (searchParams.get('position') as any) || 'bottom',
      width: parseInt(searchParams.get('width') || '1920'),
      height: parseInt(searchParams.get('height') || '1080'),
      animation: searchParams.get('animation') !== 'false',
      theme: (searchParams.get('theme') as any) || 'transparent'
    }
  }, [])

  // Render the appropriate view based on mode
  const renderView = () => {
    switch (config.mode) {
      case 'subtitle':
        return <OBSSubtitleView config={config} />
      case 'chat':
        return <OBSChatView config={config} />
      case 'analysis':
        return <OBSAnalysisView config={config} />
      case 'educational':
        return <OBSEducationalView config={config} />
      case 'avatar':
        return <OBSAvatarView config={config} />
      default:
        return <OBSSubtitleView config={config} />
    }
  }

  return (
    <WebSocketProvider>
      <div className="obs-container" style={{
        width: config.width,
        height: config.height,
        backgroundColor: config.backgroundColor,
        color: config.fontColor,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {renderView()}
        
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
          }
          
          .obs-container {
            font-family: 'Noto Sans JP', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Global animations */
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }
          
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </WebSocketProvider>
  )
}

export default OBSRouter

// Export config type for use in view components
export type { OBSConfig }