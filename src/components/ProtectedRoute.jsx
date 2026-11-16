import { Navigate, useLocation } from 'react-router-dom'
import { PageSkeleton } from './Skeleton'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageSkeleton label="Loading account…" />

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}
