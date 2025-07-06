import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import VoiceVisualizer from './VoiceVisualizer'
import toast from 'react-hot-toast'

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

// Declare Web Speech API for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const WebSpeechInterface: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const streamRef = useRef<MediaStream | null>(null)
  const startRecordingRef = useRef<() => void>()
  const stopRecordingRef = useRef<() => void>()
  
  const { sendMessage, isConnected } = useWebSocket()

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      toast.error('Web Speech API is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'ja-JP' // Default to Japanese, can be changed

    recognition.onstart = () => {
      console.log('Speech recognition started')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          finalTranscript += transcript
          
          // Send final result to backend
          sendMessage({
            type: 'speech_recognition',
            data: {
              transcript: transcript,
              confidence: confidence,
              isFinal: true,
              language: recognition.lang
            }
          })
          
          // Clear interim transcript
          setInterimTranscript('')
        } else {
          interimTranscript += transcript
          setInterimTranscript(interimTranscript)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      
      // Send error to backend
      sendMessage({
        type: 'speech_error',
        data: {
          error: event.error,
          message: event.message
        }
      })

      // Handle specific errors
      switch (event.error) {
        case 'no-speech':
          toast.error('No speech detected. Please try speaking.')
          break
        case 'audio-capture':
          toast.error('Microphone not available. Please check permissions.')
          break
        case 'not-allowed':
          toast.error('Microphone access denied. Please allow microphone access.')
          break
        default:
          toast.error(`Speech recognition error: ${event.error}`)
      }

      stopRecordingRef.current?.()
    }

    recognition.onend = () => {
      console.log('Speech recognition ended')
      if (isRecording) {
        // Restart recognition if still recording
        recognition.start()
      }
    }

    recognitionRef.current = recognition

    // Add event listeners for custom events
    const handleStartRecognition = () => {
      if (!isRecording) {
        startRecordingRef.current?.()
      }
    }

    const handleStopRecognition = () => {
      if (isRecording) {
        stopRecordingRef.current?.()
      }
    }

    window.addEventListener('start_speech_recognition', handleStartRecognition)
    window.addEventListener('stop_speech_recognition', handleStopRecognition)

    return () => {
      window.removeEventListener('start_speech_recognition', handleStartRecognition)
      window.removeEventListener('stop_speech_recognition', handleStopRecognition)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (recognition) {
        recognition.stop()
      }
    }
  }, [sendMessage, isRecording])

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average audio level
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    setAudioLevel(average / 255)

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
  }, [])

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      toast.error('Not connected to server')
      return
    }

    if (!isSupported) {
      toast.error('Web Speech API is not supported')
      return
    }

    try {
      // Get microphone access for audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      
      // Create audio context for visualization
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Start audio level monitoring
      monitorAudioLevel()

      // Start speech recognition
      recognitionRef.current.start()
      setIsRecording(true)
      
      toast.success('Speech recognition started')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start speech recognition')
    }
  }, [isConnected, isSupported, monitorAudioLevel])

  const stopRecording = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setIsRecording(false)
    setAudioLevel(0)
    setInterimTranscript('')
    toast.success('Speech recognition stopped')
  }, [])

  // Store functions in refs to avoid useEffect dependency issues
  useEffect(() => {
    startRecordingRef.current = startRecording
  }, [startRecording])

  useEffect(() => {
    stopRecordingRef.current = stopRecording
  }, [stopRecording])

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const changeLanguage = (lang: string) => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang
      toast.success(`Language changed to ${lang}`)
    }
  }

  if (!isSupported) {
    return (
      <div className="audio-interface unsupported">
        <p>Web Speech API is not supported in your browser.</p>
        <p>Please use Chrome or Edge for speech recognition.</p>
      </div>
    )
  }

  return (
    <div className="audio-interface web-speech-interface" data-testid="voice-input">
      <div className="recording-controls">
        <div className="language-selector">
          <select onChange={(e) => changeLanguage(e.target.value)} defaultValue="ja-JP">
            <option value="ja-JP">日本語</option>
            <option value="en-US">English</option>
            <option value="zh-CN">中文</option>
            <option value="ko-KR">한국어</option>
          </select>
        </div>

        <button
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={!isConnected}
          data-testid="mic-button"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            {isRecording ? (
              <>
                <path d="M9 9v6m6-6v6" />
                <circle cx="12" cy="12" r="10" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </>
            )}
          </svg>
        </button>

        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {isRecording && (
        <>
          <VoiceVisualizer audioLevel={audioLevel} />
          {interimTranscript && (
            <div className="interim-transcript">
              <span className="label">Recognizing:</span>
              <span className="text">{interimTranscript}</span>
            </div>
          )}
        </>
      )}

      <style>{`
        .audio-interface {
          padding: 1.5rem;
          background-color: rgba(30, 41, 59, 0.5);
          border-radius: 0.75rem;
          margin-top: 1rem;
        }

        .audio-interface.unsupported {
          text-align: center;
          color: var(--error);
        }

        .recording-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .record-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .record-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }

        .record-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .record-button.recording {
          background-color: var(--error);
        }

        .record-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mic-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .mic-button:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: scale(1.1);
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }

        .mic-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-button.recording {
          background-color: var(--error);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        .language-selector select {
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
        }

        .status-indicator {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background-color: var(--error);
        }

        .status-indicator.connected {
          background-color: var(--success);
        }

        .interim-transcript {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .interim-transcript .label {
          color: var(--text-secondary);
          margin-right: 0.5rem;
        }

        .interim-transcript .text {
          color: var(--primary-color);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

export default WebSpeechInterface