/**
 * Web Speech Synthesis Service
 * Handles text-to-speech using browser's built-in synthesis API
 */

interface TTSCommand {
  id: string
  text: string
  language: string
  settings: {
    pitch: number
    rate: number
    volume: number
    voice?: string
  }
}

class WebSpeechSynthesisService {
  private synthesis: SpeechSynthesis
  private voices: SpeechSynthesisVoice[] = []
  private isInitialized = false
  private queue: TTSCommand[] = []
  private isSpeaking = false

  constructor() {
    this.synthesis = window.speechSynthesis
    this.initialize()
  }

  private initialize() {
    // Load voices
    this.loadVoices()

    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        this.loadVoices()
      }
    }
  }

  private loadVoices() {
    this.voices = this.synthesis.getVoices()
    this.isInitialized = this.voices.length > 0
    console.log(`Loaded ${this.voices.length} voices`)
    
    // Log available Japanese voices
    const japaneseVoices = this.voices.filter(voice => voice.lang.includes('ja'))
    if (japaneseVoices.length > 0) {
      console.log('Available Japanese voices:', japaneseVoices.map(v => `${v.name} (${v.lang})`).join(', '))
    }
  }

  /**
   * Get available voices for a specific language
   */
  getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith(language.split('-')[0]))
  }

  /**
   * Get the best voice for a language
   */
  private getBestVoice(language: string): SpeechSynthesisVoice | null {
    const languageVoices = this.getVoicesForLanguage(language)
    
    // For Japanese, prefer specific voices if available
    if (language === 'ja-JP' || language === 'ja') {
      // Prefer Google Japanese voices
      const googleJapanese = languageVoices.find(voice => 
        voice.name.includes('Google') && voice.lang === 'ja-JP'
      )
      if (googleJapanese) return googleJapanese
      
      // Or any Japanese voice
      const anyJapanese = languageVoices.find(voice => voice.lang === 'ja-JP')
      if (anyJapanese) return anyJapanese
    }
    
    // Prefer local voices
    const localVoice = languageVoices.find(voice => voice.localService)
    if (localVoice) return localVoice

    // Fallback to any voice for the language
    return languageVoices[0] || null
  }

  /**
   * Speak text using TTS command from backend
   */
  async speak(command: TTSCommand): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Speech synthesis not initialized yet')
      // Try to initialize again
      this.loadVoices()
      
      // If still not initialized, queue the command
      if (!this.isInitialized) {
        this.queue.push(command)
        return
      }
    }

    // Process any queued commands first
    if (this.queue.length > 0) {
      const queuedCommands = [...this.queue]
      this.queue = []
      for (const cmd of queuedCommands) {
        await this.speakInternal(cmd)
      }
    }

    // Speak the current command
    await this.speakInternal(command)
  }

  private speakInternal(command: TTSCommand): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        if (this.isSpeaking) {
          this.synthesis.cancel()
        }

        const utterance = new SpeechSynthesisUtterance(command.text)
        
        // Set language
        utterance.lang = command.language

        // Apply settings
        utterance.pitch = command.settings.pitch
        utterance.rate = command.settings.rate
        utterance.volume = command.settings.volume

        // Try to find the best voice
        const voice = this.getBestVoice(command.language)
        if (voice) {
          utterance.voice = voice
          console.log(`Selected voice: ${voice.name} (${voice.lang})`)
        } else {
          console.warn(`No voice found for language: ${command.language}`)
        }

        // Event handlers
        utterance.onstart = () => {
          this.isSpeaking = true
          console.log(`Started speaking: ${command.text.substring(0, 50)}...`)
        }

        utterance.onend = () => {
          this.isSpeaking = false
          resolve()
        }

        utterance.onerror = (event) => {
          this.isSpeaking = false
          console.error('Speech synthesis error:', event)
          reject(event)
        }

        // Speak
        this.synthesis.speak(utterance)

      } catch (error) {
        console.error('Error in speech synthesis:', error)
        reject(error)
      }
    })
  }

  /**
   * Stop current speech
   */
  stop() {
    this.synthesis.cancel()
    this.isSpeaking = false
    this.queue = []
  }

  /**
   * Pause current speech
   */
  pause() {
    this.synthesis.pause()
  }

  /**
   * Resume paused speech
   */
  resume() {
    this.synthesis.resume()
  }

  /**
   * Check if synthesis is supported
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window
  }
}

// Singleton instance
const webSpeechSynthesis = new WebSpeechSynthesisService()

export default webSpeechSynthesis
export type { TTSCommand }