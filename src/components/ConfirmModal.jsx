import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMotionConfig } from '../lib/motion'

export default function ConfirmModal({
  mode = 'confirm',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)
  const { reduce } = useMotionConfig()

  useEffect(() => {
    confirmRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel?.()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  return (
    <motion.div
      className="modal-root"
      role="presentation"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.()
      }}
    >
      <motion.div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: 'spring', stiffness: 380, damping: 28 }
        }
      >
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <p id="modal-message" className="modal-message">
          {message}
        </p>
        <div className="modal-actions">
          {mode === 'confirm' && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <motion.button
            ref={confirmRef}
            type="button"
            className={danger ? 'btn btn-primary modal-btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            whileTap={reduce ? undefined : { scale: 0.98 }}
          >
            {confirmLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
