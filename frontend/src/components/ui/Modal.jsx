import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import Button from './Button'
import { IconX } from './Icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: focus is moved in on open, trapped while open, and returned
 * to the trigger on close. Escape and backdrop clicks both dismiss.
 */
export default function Modal({ open, onClose, title, children, footer, wide = false }) {
  const dialogRef = useRef(null)
  const restoreRef = useRef(null)

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return undefined

    restoreRef.current = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE)
      if (nodes && nodes.length) nodes[0].focus()
      else dialogRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = overflow
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <Button variant="ghost" size="sm" icon={<IconX size={18} />} onClick={onClose} aria-label="Close dialog" />
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
