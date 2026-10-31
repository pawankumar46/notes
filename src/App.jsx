import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'
import HomePage from './pages/HomePage'
import ResetPassword from './pages/ResetPassword'
import SpaceEditor from './pages/SpaceEditor'
import SpacesList from './pages/SpacesList'

function LegacyNoteRedirect() {
  const { id } = useParams()
  return <Navigate to={`/app/spaces/${id}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  )
}
