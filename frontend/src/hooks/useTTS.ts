import { useCallback, useRef, useEffect } from 'react'
import { useSettings } from '../contexts/SettingsContext'

export const useTTS = () => {
  const { settings } = useSettings()
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSpeakingRef = useRef<boolean>(false)

  // Cancel any ongoing speech when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string, language?: string) => {
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Detect language if not provided
    const detectedLang = language || detectLanguage(text)
    utterance.lang = detectedLang === 'ja' ? 'ja-JP' : 'en-US'

    // Apply TTS voice from settings
    if (settings.language.ttsVoice !== 'default') {
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(voice => voice.name === settings.language.ttsVoice)
      
      if (selectedVoice) {
        utterance.voice = selectedVoice
      } else {
        // Fallback to best available voice for the language
        const langVoices = voices.filter(voice => voice.lang.startsWith(detectedLang))
        if (langVoices.length > 0) {
          // Prefer Google voices for better quality
          const googleVoice = langVoices.find(voice => voice.name.includes('Google'))
          utterance.voice = googleVoice || langVoices[0]
        }
      }
    }

    // Apply other settings
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Event handlers
    utterance.onstart = () => {
      isSpeakingRef.current = true
    }

    utterance.onend = () => {
      isSpeakingRef.current = false
    }

    utterance.onerror = (event) => {
      console.error('TTS error:', event)
      isSpeakingRef.current = false
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [settings.language.ttsVoice])

  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      isSpeakingRef.current = false
    }
  }, [])

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
    }
  }, [])

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }, [])

  const isSpeaking = useCallback(() => {
    return isSpeakingRef.current
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking
  }
}

// Helper function to detect language
function detectLanguage(text: string): string {
  // Count Japanese characters (Hiragana, Katakana, Kanji)
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g
  const japaneseMatches = text.match(japaneseRegex) || []
  const japaneseRatio = japaneseMatches.length / text.length

  // If more than 30% Japanese characters, consider it Japanese
  return japaneseRatio > 0.3 ? 'ja' : 'en'
}