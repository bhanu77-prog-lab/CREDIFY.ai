import Modal from './Modal'

/**
 * Keyboard shortcut help overlay.
 * Triggered by pressing ? anywhere (when not in a text field), or by clicking
 * the ? button in the navbar. Accessible: focus is trapped inside, Escape
 * closes, and all content is readable by screen readers.
 */

const isMac =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent)

const MOD = isMac ? '⌘' : 'Ctrl'

/** A single <kbd> chip */
function Key({ children }) {
  return <kbd className="shortcut__key">{children}</kbd>
}

/** A row showing a shortcut and its description */
function ShortcutRow({ keys, description }) {
  return (
    <div className="shortcut__row">
      <div className="shortcut__keys" aria-label={keys.join(' + ')}>
        {keys.map((k, i) => (
          <span key={k} className="shortcut__key-wrap">
            <Key>{k}</Key>
            {i < keys.length - 1 && (
              <span className="shortcut__plus" aria-hidden="true">
                +
              </span>
            )}
          </span>
        ))}
      </div>
      <span className="shortcut__desc">{description}</span>
    </div>
  )
}

/** A labelled section inside the panel */
function ShortcutGroup({ title, children }) {
  return (
    <div className="shortcut__group">
      <p className="shortcut__group-label">{title}</p>
      {children}
    </div>
  )
}

export default function KeyboardShortcutsPanel({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <div className="shortcut__panel">
        <ShortcutGroup title="Scanner">
          <ShortcutRow keys={[MOD, 'Enter']} description="Run the scan" />
          <ShortcutRow keys={['Esc']} description="Close any open dialog or overlay" />
        </ShortcutGroup>

        <ShortcutGroup title="Navigation">
          <ShortcutRow keys={['Tab']} description="Move focus to the next element" />
          <ShortcutRow keys={['Shift', 'Tab']} description="Move focus to the previous element" />
          <ShortcutRow keys={['Enter', 'Space']} description="Activate the focused button or link" />
          <ShortcutRow keys={['?']} description="Open this shortcut reference" />
        </ShortcutGroup>

        <ShortcutGroup title="Screen reader tips">
          <ShortcutRow keys={['H']} description="Jump to the next heading (NVDA / JAWS)" />
          <ShortcutRow keys={['F']} description="Jump to the next form field" />
          <ShortcutRow keys={['B']} description="Jump to the next button" />
        </ShortcutGroup>
      </div>
    </Modal>
  )
}
