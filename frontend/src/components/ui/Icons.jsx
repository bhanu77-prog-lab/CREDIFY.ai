/**
 * Inline SVG icon set. Icons are decorative by default (aria-hidden); pass a
 * `title` when an icon carries meaning on its own.
 */
function Svg({ children, size = 18, title, strokeWidth = 1.8, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export const IconShield = (p) => (
  <Svg {...p}>
    <path d="M12 3 4 6.2v5.4c0 4.6 3.3 8.3 8 9.4 4.7-1.1 8-4.8 8-9.4V6.2L12 3Z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </Svg>
)
export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </Svg>
)
export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4.5M12 17h.01" />
  </Svg>
)
export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
)
export const IconX = (p) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)
export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M4 20h16" />
    <path d="M6 20v-7M11 20V6M16 20v-4M21 20v-9" />
  </Svg>
)
export const IconMessage = (p) => (
  <Svg {...p}>
    <path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 20.5 12Z" />
  </Svg>
)
export const IconPhone = (p) => (
  <Svg {...p}>
    <path d="M6.6 3.5h3l1.5 3.7-1.9 1.4a12 12 0 0 0 5.2 5.2l1.4-1.9 3.7 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
  </Svg>
)
export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Svg>
)
export const IconLink = (p) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3" />
  </Svg>
)
export const IconRupee = (p) => (
  <Svg {...p}>
    <path d="M7 4h10M7 8.5h10M7 13h4.5c2.5 0 4.5-1.9 4.5-4.3" />
    <path d="M7 13 15 21" />
  </Svg>
)
export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
    <path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6M17.5 14.4A6.2 6.2 0 0 1 21.2 20" />
  </Svg>
)
export const IconDatabase = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="7.5" ry="3" />
    <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </Svg>
)
export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
)
export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </Svg>
)
export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z" />
  </Svg>
)
export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
)
export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
)
export const IconChevronLeft = (p) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
)
export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
)
export const IconArrowUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)
export const IconArrowDown = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
)
export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4 20h16" />
  </Svg>
)
export const IconCopy = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
  </Svg>
)
export const IconExternal = (p) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
  </Svg>
)
export const IconFlag = (p) => (
  <Svg {...p}>
    <path d="M5 21V4.5" />
    <path d="M5 5h10.5l-1.6 3.2L15.5 12H5" />
  </Svg>
)
export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M11 16.5 15.5 12 11 7.5M15.5 12H4" />
  </Svg>
)
export const IconLock = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
)
export const IconBrain = (p) => (
  <Svg {...p}>
    <path d="M12 5.5a3 3 0 0 0-5.8-1A2.8 2.8 0 0 0 4 8.4a3 3 0 0 0 .6 4.8A3 3 0 0 0 7 18.6a2.8 2.8 0 0 0 5-1.2Z" />
    <path d="M12 5.5a3 3 0 0 1 5.8-1A2.8 2.8 0 0 1 20 8.4a3 3 0 0 1-.6 4.8A3 3 0 0 1 17 18.6a2.8 2.8 0 0 1-5-1.2Z" />
  </Svg>
)
export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.6 3.9 5.7 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.7-3.9-9S9.4 5.6 12 3Z" />
  </Svg>
)
export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.3l3.4 2" />
  </Svg>
)
export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M3.5 5h17l-6.6 7.8V19l-3.8 2v-8.2Z" />
  </Svg>
)
export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
  </Svg>
)
export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-.7 4.5" />
    <path d="M20 5v6h-6" />
  </Svg>
)
export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 20h16" />
  </Svg>
)
export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M3.5 13.5 6 5.5h12l2.5 8v4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M3.5 13.5H8l1.2 2.5h5.6l1.2-2.5h4.5" />
  </Svg>
)
