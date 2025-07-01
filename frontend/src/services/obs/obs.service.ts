/**
 * OBS Service
 */

import apiClient from '../api/client'

export interface OBSSceneInfo {
  name: string
  sources: string[]
}

export interface OBSStatus {
  connected: boolean
  currentScene?: string
  recording: boolean
  streaming: boolean
}

class OBSService {
  private obsWebSocket: WebSocket | null = null
  private isConnected = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageHandlers: Map<string, (data: any) => void> = new Map()

  /**
   * Connect to OBS WebSocket
   */
  async connectToOBS(
    host: string = 'localhost',
    port: number = 4455,
    password?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${host}:${port}`
        this.obsWebSocket = new WebSocket(url)

        this.obsWebSocket.onopen = () => {
          console.log('Connected to OBS WebSocket')
          this.isConnected = true
          
          // Authenticate if password provided
          if (password) {
            this.authenticate()
          }
          
          resolve()
        }

        this.obsWebSocket.onclose = () => {
          console.log('Disconnected from OBS WebSocket')
          this.isConnected = false
          this.scheduleReconnect(host, port, password)
        }

        this.obsWebSocket.onerror = (error) => {
          console.error('OBS WebSocket error:', error)
          reject(error)
        }

        this.obsWebSocket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from OBS
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.obsWebSocket) {
      this.obsWebSocket.close()
      this.obsWebSocket = null
    }

    this.isConnected = false
  }

  /**
   * Send request to OBS
   */
  private sendRequest(requestType: string, requestData?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.obsWebSocket || !this.isConnected) {
        reject(new Error('Not connected to OBS'))
        return
      }

      const requestId = Math.random().toString(36).substring(7)
      
      const message = {
        op: 6, // Request
        d: {
          requestType,
          requestId,
          requestData,
        },
      }

      // Set up response handler
      this.messageHandlers.set(requestId, (response) => {
        this.messageHandlers.delete(requestId)
        
        if (response.requestStatus.result) {
          resolve(response.responseData)
        } else {
          reject(new Error(response.requestStatus.comment))
        }
      })

      this.obsWebSocket.send(JSON.stringify(message))
    })
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any) {
    switch (message.op) {
      case 7: // RequestResponse
        const handler = this.messageHandlers.get(message.d.requestId)
        if (handler) {
          handler(message.d)
        }
        break
      
      case 5: // Event
        this.handleEvent(message.d)
        break
    }
  }

  /**
   * Handle OBS events
   */
  private handleEvent(event: any) {
    switch (event.eventType) {
      case 'CurrentProgramSceneChanged':
        window.dispatchEvent(
          new CustomEvent('obs-scene-changed', {
            detail: { sceneName: event.eventData.sceneName },
          })
        )
        break
      
      case 'RecordStateChanged':
        window.dispatchEvent(
          new CustomEvent('obs-record-state-changed', {
            detail: { outputActive: event.eventData.outputActive },
          })
        )
        break
      
      case 'StreamStateChanged':
        window.dispatchEvent(
          new CustomEvent('obs-stream-state-changed', {
            detail: { outputActive: event.eventData.outputActive },
          })
        )
        break
    }
  }

  /**
   * Authenticate with OBS
   */
  private async authenticate() {
    // OBS WebSocket v5 authentication
    // This is a simplified version - full implementation would include
    // proper authentication flow with challenge-response
    console.log('Authenticating with OBS...')
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(host: string, port: number, password?: string) {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to OBS...')
      this.connectToOBS(host, port, password).catch(console.error)
      this.reconnectTimer = null
    }, 5000)
  }

  /**
   * Get current scene
   */
  async getCurrentScene(): Promise<string> {
    const response = await this.sendRequest('GetCurrentProgramScene')
    return response.currentProgramSceneName
  }

  /**
   * Set current scene
   */
  async setCurrentScene(sceneName: string): Promise<void> {
    await this.sendRequest('SetCurrentProgramScene', { sceneName })
    
    // Also notify backend
    await apiClient.post('/api/v1/obs/scene-change', { scene_name: sceneName })
  }

  /**
   * Get scene list
   */
  async getSceneList(): Promise<OBSSceneInfo[]> {
    const response = await this.sendRequest('GetSceneList')
    return response.scenes.map((scene: any) => ({
      name: scene.sceneName,
      sources: scene.sceneIndex,
    }))
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    await this.sendRequest('StartRecord')
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    await this.sendRequest('StopRecord')
  }

  /**
   * Get recording status
   */
  async getRecordingStatus(): Promise<boolean> {
    const response = await this.sendRequest('GetRecordStatus')
    return response.outputActive
  }

  /**
   * Create educational scene setup
   */
  async setupEducationalScene() {
    // This would create a scene optimized for educational content
    // with appropriate sources and layouts
    console.log('Setting up educational scene...')
    
    // Example scene structure:
    // - Main camera
    // - Screen capture
    // - Vocabulary overlay
    // - Chat overlay
    
    // Implementation would use OBS scene creation APIs
  }

  /**
   * Update vocabulary overlay
   */
  updateVocabularyOverlay(vocabulary: { japanese: string; english: string }[]) {
    // Send vocabulary to OBS browser source
    window.dispatchEvent(
      new CustomEvent('obs-vocabulary-update', {
        detail: { vocabulary },
      })
    )
  }

  /**
   * Update subtitle overlay
   */
  updateSubtitleOverlay(text: string, language: string) {
    // Send subtitle to OBS browser source
    window.dispatchEvent(
      new CustomEvent('obs-subtitle-update', {
        detail: { text, language },
      })
    )
  }

  /**
   * Get OBS status
   */
  getStatus(): OBSStatus {
    return {
      connected: this.isConnected,
      currentScene: undefined, // Would be tracked from events
      recording: false, // Would be tracked from events
      streaming: false, // Would be tracked from events
    }
  }
}

// Singleton instance
const obsService = new OBSService()

export default obsService