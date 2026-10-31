import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'

const DialogContext = createContext(null)

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const close = useCallback((result) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setDialog(null)
  }, [])

  const confirm = useCallback((options) => {
    const config =
      typeof options === 'string'
        ? { message: options }
        : options || {}

    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        mode: 'confirm',
        title: config.title || 'Please confirm',
        message: config.message || 'Are you sure?',
        confirmLabel: config.confirmLabel || 'Confirm',
        cancelLabel: config.cancelLabel || 'Cancel',
        danger: config.danger !== false,
      })
    })
  }, [])

  const alert = useCallback((options) => {
    const config =
      typeof options === 'string'
        ? { message: options }
        : options || {}

    return new Promise((resolve) => {
      resolverRef.current = resolve
      setDialog({
        mode: 'alert',
        title: config.title || 'Notice',
        message: config.message || '',
        confirmLabel: config.confirmLabel || 'OK',
        danger: Boolean(config.danger),
      })
    })
  }, [])

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert])

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <ConfirmModal
          mode={dialog.mode}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          danger={dialog.danger}
          onConfirm={() => close(true)}
          onCancel={() => close(false)}
        />
      )}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}
