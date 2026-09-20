import { forwardRef, useId } from 'react'

const Textarea = forwardRef(function Textarea(
  { label, hint, error, maxLength, value = '', mono = false, id, className = '', ...rest },
  ref,
) {
  const generated = useId()
  const fieldId = id || generated
  const count = value.length
  const over = maxLength ? count > maxLength : false

  return (
    <div className="field">
      {(label || maxLength) && (
        <div className="row between gap-3">
          {label ? (
            <label className="field__label" htmlFor={fieldId}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {maxLength ? (
            <span className={`char-count ${over ? 'char-count--over' : ''}`.trim()}>
              {count.toLocaleString('en-IN')} / {maxLength.toLocaleString('en-IN')}
            </span>
          ) : null}
        </div>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        value={value}
        className={`textarea ${mono ? 'textarea--mono' : ''} ${
          error ? 'textarea--error' : ''
        } ${className}`.trim()}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint && !error ? `${fieldId}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <span className="field__hint" id={`${fieldId}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
})

export default Textarea
