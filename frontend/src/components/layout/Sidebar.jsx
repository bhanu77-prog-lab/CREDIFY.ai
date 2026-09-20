import { NavLink } from 'react-router-dom'

import Button from '../ui/Button'
import {
  IconChart,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDatabase,
  IconInfo,
  IconShield,
  IconUsers,
} from '../ui/Icons'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconChart size={18} /> },
  { to: '/scanner', label: 'Scanner', icon: <IconShield size={18} /> },
  { to: '/history', label: 'History', icon: <IconClock size={18} /> },
  { to: '/community', label: 'Community', icon: <IconUsers size={18} /> },
  { to: '/intel', label: 'Threat Intel', icon: <IconDatabase size={18} /> },
  { to: '/about', label: 'About', icon: <IconInfo size={18} /> },
]

export default function Sidebar({ collapsed, onToggle, open, onClose }) {
  return (
    <aside
      className={[
        'sidebar',
        collapsed && 'sidebar--collapsed',
        open && 'sidebar--open',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Workspace sections"
    >
      <nav className="stack gap-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()
            }
            title={collapsed ? link.label : undefined}
          >
            <span className="sidebar__icon">{link.icon}</span>
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__foot">
        <Button
          variant="ghost"
          size="sm"
          fullWidth={!collapsed}
          icon={collapsed ? <IconChevronRight size={17} /> : <IconChevronLeft size={17} />}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && 'Collapse'}
        </Button>
      </div>
    </aside>
  )
}
