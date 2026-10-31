import { useEffect, useRef } from 'react'

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
    <div
      className="modal-root"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.()
      }}
    >
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
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
          <button
            ref={confirmRef}
            type="button"
            className={danger ? 'btn btn-primary modal-btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
