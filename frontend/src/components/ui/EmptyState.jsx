import { IconInbox } from './Icons'

export default function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon || <IconInbox size={22} />}</div>
      <p className="empty__title">{title}</p>
      {text && <p className="empty__text">{text}</p>}
      {action}
    </div>
  )
}
