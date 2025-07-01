/**
 * Global type definitions
 */

declare global {
  interface Window {
    obsstudio?: {
      pluginVersion: string
      getCurrentScene: () => void
      getScenes: () => void
    }
  }
}

export {}