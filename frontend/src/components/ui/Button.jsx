import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

/**
 * The one button in the system.
 *
 * The loading state keeps the label in the layout (visibility:hidden) so the
 * button never changes width mid-click, which is the usual cause of a form
 * jumping under the user's cursor.
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon = null,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    as = 'button',
    to,
    href,
    className = '',
    type = 'button',
    onClick,
    ...rest
  },
  ref,
) {
  const isIconOnly = Boolean(icon) && !children
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full',
    isIconOnly && 'btn--icon',
    loading && 'btn--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {icon && iconPosition === 'left' && <span className="btn__icon">{icon}</span>}
      {children && <span className="btn__label">{children}</span>}
      {icon && iconPosition === 'right' && <span className="btn__icon">{icon}</span>}
    </>
  )

  const shared = {
    className: classes,
    'aria-busy': loading || undefined,
    ...rest,
  }

  if (as === 'link' && to) {
    return (
      <Link
        {...shared}
        ref={ref}
        to={to}
        aria-disabled={disabled || loading || undefined}
        onClick={(event) => {
          if (disabled || loading) {
            event.preventDefault()
            return
          }
          onClick?.(event)
        }}
      >
        {content}
      </Link>
    )
  }

  if (as === 'a' || href) {
    return (
      <a {...shared} ref={ref} href={href} onClick={onClick} aria-disabled={disabled || undefined}>
        {content}
      </a>
    )
  }

  return (
    <button {...shared} ref={ref} type={type} onClick={onClick} disabled={disabled || loading}>
      {content}
    </button>
  )
})

export default Button
