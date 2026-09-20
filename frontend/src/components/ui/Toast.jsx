import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import Button from './Button'
import { IconAlert, IconCheck, IconInfo, IconX } from './Icons'

const ToastContext = createContext(null)

const ICONS = {
  success: <IconCheck size={18} />,
  error: <IconAlert size={18} />,
  warn: <IconAlert size={18} />,
  info: <IconInfo size={18} />,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast) => {
      idRef.current += 1
      const id = idRef.current
      const entry = { id, tone: 'info', duration: 4500, ...toast }
      setToasts((current) => [...current, entry])
      if (entry.duration > 0) {
        window.setTimeout(() => dismiss(id), entry.duration)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toast: push,
      success: (title, text) => push({ tone: 'success', title, text }),
      error: (title, text) => push({ tone: 'error', title, text, duration: 7000 }),
      warn: (title, text) => push({ tone: 'warn', title, text }),
      info: (title, text) => push({ tone: 'info', title, text }),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <span className={`risk--${toast.tone === 'success' ? 'safe' : toast.tone === 'error' ? 'danger' : 'warn'}`}>
              {ICONS[toast.tone]}
            </span>
            <div className="toast__body">
              <p className="toast__title">{toast.title}</p>
              {toast.text && <p className="toast__text">{toast.text}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<IconX size={15} />}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
