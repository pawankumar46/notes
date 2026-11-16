import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import HomePage from './pages/HomePage'
import ResetPassword from './pages/ResetPassword'
import SpaceEditor from './pages/SpaceEditor'
import SpacesList from './pages/SpacesList'

function LegacyNoteRedirect() {
  const { id } = useParams()
  return <Navigate to={`/app/spaces/${id}`} replace />
}

function AppRoutes() {
  return (
    <PageTransition>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <SpacesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/spaces/:id"
          element={
            <ProtectedRoute>
              <SpaceEditor />
            </ProtectedRoute>
          }
        />
        <Route path="/app/notes/:id" element={<LegacyNoteRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
