import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserSettings {
  language: {
    defaultLanguage: 'ja' | 'en' | 'auto'
    ttsVoice: string
    responseMixRatio: number
  }
  ai: {
    temperature: number
    responseStyle: 'formal' | 'casual' | 'educational'
    streamingEnabled: boolean
  }
  export: {
    defaultFormat: 'csv' | 'json' | 'anki'
    includeContext: boolean
    includeTimestamps: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    fontSize: 'small' | 'medium' | 'large'
  }
}

const defaultSettings: UserSettings = {
  language: {
    defaultLanguage: 'auto',
    ttsVoice: 'default',
    responseMixRatio: 70
  },
  ai: {
    temperature: 0.7,
    responseStyle: 'educational',
    streamingEnabled: false
  },
  export: {
    defaultFormat: 'csv',
    includeContext: true,
    includeTimestamps: false
  },
  appearance: {
    theme: 'light',
    fontSize: 'medium'
  }
}

interface SettingsContextType {
  settings: UserSettings
  updateSettings: (newSettings: Partial<UserSettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    // Load settings from localStorage on initialization
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings)
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
        return defaultSettings
      }
    }
    return defaultSettings
  })

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings))
  }, [settings])

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      const theme = settings.appearance.theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      if (theme === 'dark' || (theme === 'auto' && prefersDark)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    applyTheme()

    // Listen for system theme changes if auto mode is enabled
    if (settings.appearance.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [settings.appearance.theme])

  // Apply font size changes
  useEffect(() => {
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    
    document.documentElement.style.fontSize = fontSizeMap[settings.appearance.fontSize]
  }, [settings.appearance.fontSize])

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev }
      
      Object.entries(newSettings).forEach(([category, values]) => {
        if (typeof values === 'object' && values !== null) {
          updated[category as keyof UserSettings] = {
            ...prev[category as keyof UserSettings],
            ...values
          }
        }
      })
      
      return updated
    })
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export type { UserSettings }