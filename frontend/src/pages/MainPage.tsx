import { useState } from 'react'
import WebSpeechInterface from '../components/WebSpeechInterface'
import ChatDisplay from '../components/ChatDisplay'
import VocabularyPanel from '../components/VocabularyPanel'
import VideoAnalyzer from '../components/VideoAnalyzer'
import BatchProcessor from '../components/BatchProcessor'
import ConnectionStatus from '../components/ConnectionStatus'
import { UserMenu } from '../components/UserMenu'
import { useOBSMode } from '../hooks/useOBSMode'

export const MainPage = () => {
  const [activeView, setActiveView] = useState<'chat' | 'video' | 'vocabulary' | 'batch'>('chat')
  const isOBSMode = useOBSMode()

  return (
    <div className={`app-container ${isOBSMode ? 'obs-mode' : ''}`}>
      {!isOBSMode && (
        <header className="app-header">
          <div className="header-left">
            <h1 className="text-2xl font-bold">AIVlingual</h1>
            <ConnectionStatus />
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeView === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveView('chat')}
            >
              <span className="nav-icon">💬</span>
              <span className="nav-text">チャット</span>
            </button>
            <button
              className={`nav-tab ${activeView === 'video' ? 'active' : ''}`}
              onClick={() => setActiveView('video')}
            >
              <span className="nav-icon">🎥</span>
              <span className="nav-text">動画解析</span>
            </button>
            <button
              className={`nav-tab ${activeView === 'vocabulary' ? 'active' : ''}`}
              onClick={() => setActiveView('vocabulary')}
            >
              <span className="nav-icon">📚</span>
              <span className="nav-text">単語帳</span>
            </button>
            <button
              className={`nav-tab ${activeView === 'batch' ? 'active' : ''}`}
              onClick={() => setActiveView('batch')}
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-text">バッチ処理</span>
            </button>
          </nav>
          <div className="header-right">
            <UserMenu />
          </div>
        </header>
      )}
      
      <main className="app-main">
        <div className="content-area">
          {activeView === 'chat' && (
            <>
              <ChatDisplay />
              <WebSpeechInterface />
            </>
          )}
          
          {activeView === 'video' && <VideoAnalyzer />}
          
          {activeView === 'vocabulary' && <VocabularyPanel />}
          
          {activeView === 'batch' && <BatchProcessor />}
        </div>
      </main>
    </div>
  )
}