import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

const AuthLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--background-main)'}}>
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-lg font-medium" style={{color: 'var(--text-main)'}}>Loading Three-Sided...</p>
    </div>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider fallback={<AuthLoadingFallback />}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
