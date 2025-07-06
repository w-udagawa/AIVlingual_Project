import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, updatePreferences } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    preferred_language: 'ja',
    study_level: 'intermediate',
    ai_temperature: '0.7',
    tts_voice: 'ja-JP',
    export_format: 'anki',
  })

  useEffect(() => {
    // Load user preferences if available
    if (user?.preferences) {
      setFormData(prev => ({
        ...prev,
        ...user.preferences,
      }))
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updatePreferences(formData)
      toast.success('設定を保存しました')
    } catch (error) {
      toast.error('設定の保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">設定</h1>
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ユーザー情報セクション */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">ユーザー情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ユーザー名</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* 言語設定セクション */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">言語設定</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700">
                    優先言語
                  </label>
                  <select
                    id="preferred_language"
                    name="preferred_language"
                    value={formData.preferred_language}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                    <option value="ko">한국어</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="study_level" className="block text-sm font-medium text-gray-700">
                    学習レベル
                  </label>
                  <select
                    id="study_level"
                    name="study_level"
                    value={formData.study_level}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="beginner">初級</option>
                    <option value="intermediate">中級</option>
                    <option value="advanced">上級</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tts_voice" className="block text-sm font-medium text-gray-700">
                    音声合成の声
                  </label>
                  <select
                    id="tts_voice"
                    name="tts_voice"
                    value={formData.tts_voice}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="ja-JP">日本語（標準）</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="zh-CN">中文（普通话）</option>
                    <option value="ko-KR">한국어</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI設定セクション */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">AI応答設定</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="ai_temperature" className="block text-sm font-medium text-gray-700">
                    応答のクリエイティビティ
                  </label>
                  <select
                    id="ai_temperature"
                    name="ai_temperature"
                    value={formData.ai_temperature}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="0.3">低い（より正確）</option>
                    <option value="0.7">標準（バランス）</option>
                    <option value="1.0">高い（よりクリエイティブ）</option>
                  </select>
                </div>
              </div>
            </div>

            {/* エクスポート設定セクション */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">エクスポート設定</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="export_format" className="block text-sm font-medium text-gray-700">
                    デフォルトのエクスポート形式
                  </label>
                  <select
                    id="export_format"
                    name="export_format"
                    value={formData.export_format}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="anki">Anki (APKG)</option>
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 保存ボタン */}
            <div className="px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}