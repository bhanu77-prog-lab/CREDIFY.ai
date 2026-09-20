import { useRef } from 'react'

/**
 * Roving-focus tablist: arrow keys move between tabs, Home/End jump to the ends.
 */
export default function Tabs({ items, value, onChange, ariaLabel = 'Sections', className = '' }) {
  const refs = useRef([])

  const focusTab = (index) => {
    const next = (index + items.length) % items.length
    refs.current[next]?.focus()
    onChange(items[next].value)
  }

  const onKeyDown = (event, index) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        focusTab(index + 1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        focusTab(index - 1)
        break
      case 'Home':
        event.preventDefault()
        focusTab(0)
        break
      case 'End':
        event.preventDefault()
        focusTab(items.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className={`tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`tab-${item.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="tab"
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ value, children }) {
  return (
    <div role="tabpanel" id={`panel-${value}`} aria-labelledby={`tab-${value}`} tabIndex={-1}>
      {children}
    </div>
  )
}
