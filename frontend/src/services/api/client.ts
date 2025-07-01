/**
 * Base API Client
 */

import { API_CONFIG } from './config'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor() {
    this.baseUrl = API_CONFIG.baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string) {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`,
    }
  }

  /**
   * Clear authorization token
   */
  clearAuthToken() {
    const { Authorization, ...headers } = this.defaultHeaders as any
    this.defaultHeaders = headers
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new ApiError(
          response.status,
          data?.detail || response.statusText,
          data
        )
      }

      return {
        data,
        status: response.status,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout')
      }

      throw new ApiError(
        0,
        error instanceof Error ? error.message : 'Network error'
      )
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let queryString = ''
    if (params) {
      // Filter out undefined values
      const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value
        }
        return acc
      }, {} as Record<string, any>)
      
      if (Object.keys(filteredParams).length > 0) {
        queryString = '?' + new URLSearchParams(filteredParams).toString()
      }
    }
    
    const response = await this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    })

    return response.data as T
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    return response.data as T
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })

    return response.data as T
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
    })

    return response.data as T
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const { 'Content-Type': _, ...headers } = this.defaultHeaders as any

    const response = await this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    })

    return response.data as T
  }
}

// Singleton instance
const apiClient = new ApiClient()

export default apiClient