import apiClient from './api/client'

interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    username: string
    email: string
    is_active?: boolean
    is_verified?: boolean
    preferences?: {
      preferred_language?: string
      study_level?: string
    }
  }
}

interface RegisterResponse extends LoginResponse {}

interface User {
  id: number
  username: string
  email: string
  preferences?: {
    preferred_language?: string
    study_level?: string
  }
}

class AuthService {
  /**
   * Login user
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      username_or_email: username,
      password,
    })
    
    // Set token in API client
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token)
    }
    
    return response
  }

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/api/v1/auth/register', {
      username,
      email,
      password,
    })
    
    // Set token in API client
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token)
    }
    
    return response
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout')
    } catch (error) {
      // Ignore errors during logout
      console.error('Logout error:', error)
    } finally {
      // Clear token from API client
      apiClient.clearAuthToken()
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    return await apiClient.get<User>('/api/v1/auth/me')
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<User['preferences']>): Promise<User> {
    return await apiClient.put<User>('/api/v1/auth/preferences', preferences)
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  }

  /**
   * Initialize auth from stored token
   */
  initializeAuth(): void {
    const token = localStorage.getItem('authToken')
    if (token) {
      apiClient.setAuthToken(token)
    }
  }
}

export const authService = new AuthService()