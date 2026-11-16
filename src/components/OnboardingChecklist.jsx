import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useMotionConfig } from '../lib/motion'

const STEPS = [
  { id: 'space', label: 'Create your first space' },
  { id: 'write', label: 'Add a title or some writing' },
  { id: 'file', label: 'Attach a file' },
  { id: 'share', label: 'Invite a collaborator' },
]

function storageKey(userId) {
  return `notefolio-onboarding:${userId}`
}

function readProgress(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { done: {}, dismissed: false }
    return JSON.parse(raw)
  } catch {
    return { done: {}, dismissed: false }
  }
}

function writeProgress(userId, data) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data))
  } catch {
    // ignore
  }
}

export default function OnboardingChecklist({
  userId,
  space = false,
  write = false,
  file = false,
  share = false,
  compact = false,
}) {
  const { reduce } = useMotionConfig()
  const [state, setState] = useState(() => readProgress(userId))

  useEffect(() => {
    setState(readProgress(userId))
  }, [userId])

  useEffect(() => {
    const flags = { space, write, file, share }
    setState((prev) => {
      const nextDone = { ...prev.done }
      let changed = false
      for (const [key, value] of Object.entries(flags)) {
        if (value && !nextDone[key]) {
          nextDone[key] = true
          changed = true
        }
      }
      if (!changed) return prev
      const next = { ...prev, done: nextDone }
      writeProgress(userId, next)
      return next
    })
  }, [userId, space, write, file, share])

  const complete = STEPS.filter((s) => state.done[s.id]).length
  const finished = complete >= STEPS.length
  const visible = !state.dismissed && !finished

  const items = useMemo(
    () =>
      STEPS.map((step) => ({
        ...step,
        done: Boolean(state.done[step.id]),
      })),
    [state.done],
  )

  function dismiss() {
    const next = { ...state, dismissed: true }
    setState(next)
    writeProgress(userId, next)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className={compact ? 'onboard onboard-compact' : 'onboard'}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Getting started"
        >
          <div className="onboard-head">
            <div>
              <h2>Getting started</h2>
              <p className="muted small">
                {complete} of {STEPS.length} complete
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
              Dismiss
            </button>
          </div>
          <ol className="onboard-list">
            {items.map((item) => (
              <li key={item.id} className={item.done ? 'onboard-item is-done' : 'onboard-item'}>
                <span className="onboard-check" aria-hidden>
                  {item.done ? '✓' : ''}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
