import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../context/AuthContext'
import { fadeUp, useMotionConfig } from '../lib/motion'

export default function HomePage() {
  const { user, loading, passwordRecovery, signIn, signUp, resetPassword } = useAuth()
  const { reduce } = useMotionConfig()
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
      title: 'Open your folio',
      subtitle: 'Sign in to continue shared work.',
    },
    signup: {
      title: 'Join Notefolio',
      subtitle: 'Set up access for your team, then start a space.',
    },
    forgot: {
      title: 'Reset password',
      subtitle: 'We’ll email a reset link.',
    },
  }

  return (
    <div className="home">
      <motion.section className="home-stage" {...fadeInStage(reduce)}>
        <div className="home-stage-glow" aria-hidden />
        <div className="home-stage-inner">
          <motion.div className="home-brand-row" {...fadeUp(reduce, 0.05)}>
            <motion.img
              className="home-logo"
              src="/logo.svg"
              alt=""
              width="40"
              height="40"
              whileHover={reduce ? undefined : { rotate: -4, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            />
            <h1 className="brand-hero">Notefolio</h1>
          </motion.div>
          <motion.p className="home-lead" {...fadeUp(reduce, 0.12)}>
            Notes, PDFs, spreadsheets, and docs in one shared folio — built for
            engineering, architecture, and IT teams.
          </motion.p>

          <motion.div
            className="home-preview"
            data-ui
            aria-hidden="true"
            {...fadeUp(reduce, 0.2)}
            whileHover={reduce ? undefined : { y: -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <div className="home-preview-bar">
              <span>Site package · Q3</span>
              <span className="home-preview-live">Live</span>
            </div>
            <div className="home-preview-body">
              <p>
                Facade revision notes
                <span className="home-blame">aisha  2m ago</span>
              </p>
              <p>
                <span className="home-mark">schedule.xlsx</span> + plan set
                <span className="home-blame">dev  14m ago</span>
              </p>
              <p className="home-preview-check">
                <span className="home-check" />
                Spec PDF attached
                <span className="home-blame">you  just now</span>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section className="home-auth" {...fadeUp(reduce, 0.1)}>
        <form className="auth-form" onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              className="auth-form-head"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2>{headings[mode].title}</h2>
              <p className="muted small">{headings[mode].subtitle}</p>
            </motion.div>
          </AnimatePresence>

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

          <AnimatePresence mode="wait">
            {mode === 'signup' && (
              <motion.div
                key="signup-fields"
                className="auth-extra"
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>

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

          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                className="alert alert-error"
                role="alert"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.p>
            )}
            {info && (
              <motion.p
                key="info"
                className="alert alert-ok"
                role="status"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {info}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy}
            whileTap={reduce || busy ? undefined : { scale: 0.98 }}
            whileHover={reduce || busy ? undefined : { y: -1 }}
          >
            {busy
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Send reset link'}
          </motion.button>

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
      </motion.section>
    </div>
  )
}

function fadeInStage(reduce) {
  if (reduce) return { initial: false, animate: { opacity: 1 } }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  }
}
