import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username) {
      newErrors.username = 'ユーザー名は必須です'
    }

    if (isRegisterMode) {
      if (!formData.email) {
        newErrors.email = 'メールアドレスは必須です'
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '有効なメールアドレスを入力してください'
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません'
      }
    }

    if (!formData.password) {
      newErrors.password = 'パスワードは必須です'
    } else if (formData.password.length < 6) {
      newErrors.password = 'パスワードは6文字以上である必要があります'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (isRegisterMode) {
        await register(formData.username, formData.email, formData.password)
      } else {
        await login(formData.username, formData.password)
      }
      navigate('/')
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newErrors: Record<string, string> = {}

    // Validate on blur
    if (name === 'email' && isRegisterMode) {
      if (!value) {
        newErrors.email = 'メールアドレスは必須です'
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        newErrors.email = '有効なメールアドレスを入力してください'
      }
    }

    if (name === 'password') {
      if (!value) {
        newErrors.password = 'パスワードは必須です'
      } else if (value.length < 6) {
        newErrors.password = 'パスワードは6文字以上である必要があります'
      }
    }

    if (name === 'confirmPassword' && isRegisterMode) {
      if (value !== formData.password) {
        newErrors.confirmPassword = 'パスワードが一致しません'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            AIVlingual
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            {isRegisterMode ? 'アカウント作成' : 'ログイン'}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} data-testid="auth-form">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                ユーザー名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="ユーザー名"
                data-testid="username-input"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>
            
            {isRegisterMode && (
              <div>
                <label htmlFor="email" className="sr-only">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="メールアドレス"
                  data-testid="email-input"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                required
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 ${
                  !isRegisterMode ? 'rounded-b-md' : ''
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="パスワード"
                data-testid="password-input"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            {isRegisterMode && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  パスワード（確認）
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="パスワード（確認）"
                  data-testid="confirm-password-input"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-button"
            >
              {loading ? '処理中...' : (isRegisterMode ? 'アカウント作成' : 'ログイン')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setFormData({
                  username: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                })
                setErrors({})
              }}
              className="text-sm text-indigo-600 hover:text-indigo-500"
              data-testid="toggle-mode-button"
            >
              {isRegisterMode
                ? '既にアカウントをお持ちですか？ログイン'
                : 'アカウントをお持ちでない方はこちら'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}