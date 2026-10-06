type IconProps = {
  className?: string
}

/**
 * Ikon sebagai inline SVG, bukan icon font dari CDN, supaya tidak ada request
 * eksternal dan tidak ada layout bergeser (FOUT) kalau gagal dimuat.
 *
 * Font teks (Plus Jakarta Sans) tetap dari Google Fonts, tapi tokens.css punya
 * fallback ke system font sehingga halaman tetap terbaca saat offline.
 */
function base(className?: string) {
  return {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2.5 3h2l2.6 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
    </svg>
  )
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 15Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function EnvelopeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3 6 9 6.5L21 6" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2.4}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2.4}>
      <path d="m15 5-7 7 7 7" />
    </svg>
  )
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor" stroke="none">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />
    </svg>
  )
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor" stroke="none">
      <path d="M13.5 2 5 13.2h5.2L10 22l8.5-11.4h-5.3L13.5 2Z" />
    </svg>
  )
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  )
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M11 3.5H4.5a1 1 0 0 0-1 1V11l9 9 8-8-9.5-8.5Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  )
}

export function FilterIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  )
}

export function StoreLogo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <circle cx="16" cy="16" r="14" fill="white" />
      <path
        d="M10 16.5C10 13.5 12.5 11 16 11C19.5 11 22 13.5 22 16.5C22 19.5 19.5 22 16 22C12.5 22 10 19.5 10 16.5Z"
        fill="var(--tp-green)"
      />
      <circle cx="14" cy="15" r="1.5" fill="white" />
      <circle cx="18.5" cy="15" r="1.5" fill="white" />
    </svg>
  )
}
export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3.2 5 6v5.4c0 4 2.9 7.7 7 9.4 4.1-1.7 7-5.4 7-9.4V6l-7-2.8Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  )
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 4v16M7 8h10M5 20h14" />
      <path d="M7 8 4 14h6L7 8ZM17 8l-3 6h6l-3-6Z" />
    </svg>
  )
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

export function StorefrontIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 9.5 5 4h14l2 5.5a3 3 0 0 1-5.5 1.6 3 3 0 0 1-5 0A3 3 0 0 1 3 9.5Z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  )
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5h-2.5zM19 19h1.5M14.5 20.5h2.5" />
    </svg>
  )
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor" stroke="none">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3 0-1.3-.1-2.45-.1-2.4 0-4 1.5-4 4.2v2.2H7.5V13h2.75v8h3.25Z" />
    </svg>
  )
}

export function TwitterIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} fill="currentColor" stroke="none">
      <path d="M21 5.6a7.4 7.4 0 0 1-2.1.6 3.7 3.7 0 0 0 1.6-2 7.5 7.5 0 0 1-2.4.9 3.7 3.7 0 0 0-6.3 3.4A10.5 10.5 0 0 1 4.2 4.6a3.7 3.7 0 0 0 1.1 4.9 3.7 3.7 0 0 1-1.7-.5 3.7 3.7 0 0 0 3 3.7c-.6.2-1.2.2-1.7.1a3.7 3.7 0 0 0 3.5 2.6A7.4 7.4 0 0 1 3 16.7a10.4 10.4 0 0 0 5.7 1.7c6.8 0 10.5-5.6 10.5-10.5v-.5A7.5 7.5 0 0 0 21 5.6Z" />
    </svg>
  )
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PinterestIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 19c-.6-1.8-.2-3.3.2-4.7l.8-2.6" />
      <path d="M8.8 10.6c-.3-2.3 1.4-4.3 3.7-4.4 2.1-.1 3.7 1.3 3.7 3.4 0 2.6-1.3 4.5-3.1 4.5-1 0-1.7-.8-1.5-1.8" />
    </svg>
  )
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.24c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.71 7.73 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.9 10.9 0 0 0 1 12c0 1.76.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.73 1 3.99 3.29 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  )
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

export function HeadsetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13" width="4" height="7" rx="1.6" />
      <rect x="17.5" y="13" width="4" height="7" rx="1.6" />
    </svg>
  )
}
