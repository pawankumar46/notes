import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user, loading, passwordRecovery, signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" aria-hidden />
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (passwordRecovery) return <Navigate to="/auth/reset" replace />
  if (user) return <Navigate to="/app" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setInfo('If an account exists for that email, a reset link has been sent.')
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full name.')
          return
        }
        const data = await signUp(email, password, {
          fullName: fullName.trim(),
          company: company.trim(),
        })
        if (!data.session) {
          setInfo('Account created. Check your email to confirm, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const headings = {
    signin: {
      title: 'Welcome back',
      subtitle: 'Sign in to open your shared notes.',
    },
    signup: {
      title: 'Join Notes Taker',
      subtitle: 'A few details, then you can write and invite.',
    },
    forgot: {
      title: 'Reset password',
      subtitle: 'We’ll send a link to your email.',
    },
  }

  return (
    <div className="home">
      <section className="home-stage">
        <div className="home-stage-glow" aria-hidden />
        <div className="home-stage-inner">
          <p className="home-kicker">Collaborative notes</p>
          <h1 className="brand-hero">Notes Taker</h1>
          <p className="home-lead">
            Write together, invite by email, and see who changed each line.
          </p>

          <div className="home-preview" aria-hidden="true">
            <div className="home-preview-bar">
              <span>Sprint planning</span>
              <span className="home-preview-live">Live</span>
            </div>
            <div className="home-preview-body">
              <p>
                Ship notes with share links
                <span className="home-blame">maya  2m ago</span>
              </p>
              <p>
                <span className="home-mark">Highlight blockers</span> before standup
                <span className="home-blame">jordan  14m ago</span>
              </p>
              <p className="home-preview-check">
                <span className="home-check" />
                Invite design + eng by email
                <span className="home-blame">you  just now</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-auth">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-head">
            <h2>{headings[mode].title}</h2>
            <p className="muted small">{headings[mode].subtitle}</p>
          </div>

          {mode !== 'forgot' && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMode('signin')
                  setError(null)
                  setInfo(null)
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMode('signup')
                  setError(null)
                  setInfo(null)
                }}
              >
                Sign up
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <label className="auth-field">
                <span>Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="auth-field">
                <span>
                  Company <span className="field-optional">(optional)</span>
                </span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  autoComplete="organization"
                />
              </label>
            </>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>

          {mode !== 'forgot' && (
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
          )}

          {mode === 'signin' && (
            <div className="auth-actions">
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode('forgot')
                  setError(null)
                  setInfo(null)
                  setPassword('')
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="alert alert-ok" role="status">
              {info}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Send reset link'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                setMode('signin')
                setError(null)
                setInfo(null)
              }}
            >
              Back to sign in
            </button>
          )}
        </form>
      </section>
    </div>
  )
}
