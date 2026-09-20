import { useId } from 'react'

export default function Input({
  label,
  hint,
  error,
  icon,
  id,
  className = '',
  containerClassName = '',
  ...rest
}) {
  const generated = useId()
  const inputId = id || generated
  const describedBy = [hint && !error && `${inputId}-hint`, error && `${inputId}-error`]
    .filter(Boolean)
    .join(' ')

  const field = (
    <input
      id={inputId}
      className={`input ${error ? 'input--error' : ''} ${className}`.trim()}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      {...rest}
    />
  )

  return (
    <div className={`field ${containerClassName}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {icon ? (
        <div className="input-group">
          <span className="input-group__icon">{icon}</span>
          {field}
        </div>
      ) : (
        field
      )}
      {hint && !error && (
        <span className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${inputId}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
