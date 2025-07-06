import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import OBSRouter from './obs/OBSRouter'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { MainPage } from './pages/MainPage'
import { SettingsPage } from './pages/SettingsPage'
import { authService } from './services/authService'
import './App.css'

function App() {
  const [isOBSRoute, setIsOBSRoute] = useState(false)

  // Initialize auth on app start
  useEffect(() => {
    authService.initializeAuth()
  }, [])

  // Check if we're on the OBS route
  useEffect(() => {
    setIsOBSRoute(window.location.pathname.startsWith('/obs'))
  }, [])

  // If on OBS route, render OBS router instead
  if (isOBSRoute) {
    return <OBSRouter />
  }

  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  )
}

export default App