export default function Card({
  children,
  className = '',
  padded = true,
  tight = false,
  hover = false,
  flush = false,
  as: Tag = 'div',
  ...rest
}) {
  const classes = [
    'card',
    padded && !flush && (tight ? 'card--tight' : 'card--pad'),
    hover && 'card--hover',
    flush && 'card--flush',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHead({ title, subtitle, actions, id }) {
  return (
    <div className="card__head">
      <div className="grow">
        <h3 className="card__title" id={id}>
          {title}
        </h3>
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row gap-2 wrap">{actions}</div>}
    </div>
  )
}

export function CardBody({ children, tight = false, className = '' }) {
  return (
    <div className={`card__body ${tight ? 'card__body--tight' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}
