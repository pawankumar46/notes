import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'

export default function ResetPassword() {
  const { user, loading, passwordRecovery, updatePassword, clearPasswordRecovery, signOut } =
    useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!loading && !passwordRecovery && !user) {
      navigate('/', { replace: true })
    }
  }, [loading, passwordRecovery, user, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await updatePassword(password)
      setDone(true)
      clearPasswordRecovery()
      setTimeout(() => navigate('/app', { replace: true }), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" aria-hidden />
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!passwordRecovery && !user) {
    return null
  }

  if (!passwordRecovery && user && !done) {
    return (
      <div className="page-center">
        <div className="auth-form reset-card">
          <div className="auth-form-head">
            <h2>Reset link required</h2>
            <p className="muted small">
              Open the link from your email to set a new password, or go back to your notes.
            </p>
          </div>
          <Link to="/app" className="btn btn-primary btn-block">
            Go to notes
          </Link>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-center">
      <form className="auth-form reset-card" onSubmit={handleSubmit}>
        <div className="auth-form-head">
          <h2>Choose a new password</h2>
          <p className="muted small">Enter a new password for {user?.email || 'your account'}.</p>
        </div>

        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <PasswordInput
          label="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="alert alert-ok" role="status">
            Password updated. Taking you to your notes…
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy || done}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
