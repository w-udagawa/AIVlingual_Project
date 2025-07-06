import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

interface User {
  id: number
  username: string
  email: string
  preferences?: {
    preferred_language?: string
    study_level?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updatePreferences: (preferences: Partial<User['preferences']>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          // Initialize auth in service first
          authService.initializeAuth()
          
          // Then try to get current user
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('authToken')
        authService.logout() // This will clear the token from API client
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password)
      localStorage.setItem('authToken', response.access_token)
      
      // Verify user session by calling getCurrentUser
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } catch (verifyError) {
        // Fall back to response user data if getCurrentUser fails
        setUser(response.user)
      }
      
      toast.success('ログインしました')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'ログインに失敗しました')
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authService.register(username, email, password)
      localStorage.setItem('authToken', response.access_token)
      setUser(response.user)
      toast.success('アカウントを作成しました')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '登録に失敗しました')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('authToken')
      setUser(null)
      toast.success('ログアウトしました')
    }
  }

  const updatePreferences = async (preferences: Partial<User['preferences']>) => {
    try {
      const updatedUser = await authService.updatePreferences(preferences)
      setUser(updatedUser)
      toast.success('設定を更新しました')
    } catch (error: any) {
      toast.error('設定の更新に失敗しました')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}