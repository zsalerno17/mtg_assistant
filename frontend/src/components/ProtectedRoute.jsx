import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, profile } = useAuth()
  const location = useLocation()

  if (session === undefined) {
    // Still loading session from Supabase
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="text-[var(--color-muted)] font-[var(--font-mono)]">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // First-time user: profile loaded (non-null) and username never set → profile setup
  if (profile !== null && profile?.username === null && location.pathname !== '/profile') {
    return <Navigate to="/profile?firstTime=1" replace />
  }

  return children
}
