import { CartIcon, GridIcon, HomeIcon, TagIcon, UserIcon } from '../ui/Icon'
import { routeUrl, routes } from '../../lib/routes'

type Item = {
  key: string
  label: string
  href: string
  Icon: typeof HomeIcon
  active?: boolean
  badge?: number
}

/**
 * Navigasi bawah khusus layar kecil, disembunyikan di desktop lewat CSS.
 * Semua item adalah tautan asli ke halaman PHP, bukan tombol palsu.
 */
export function BottomNav({ cartCount }: { cartCount: number }) {
  const items: Item[] = [
    {
      key: 'home',
      label: 'Home',
      href: routeUrl(routes.home),
      Icon: HomeIcon,
      active: true,
    },
    {
      key: 'featured',
      label: 'Promo',
      href: routeUrl(routes.featured),
      Icon: TagIcon,
    },
    {
      key: 'catalog',
      label: 'Katalog',
      href: routeUrl(routes.search),
      Icon: GridIcon,
    },
    {
      key: 'cart',
      label: 'Keranjang',
      href: routeUrl(routes.cart),
      Icon: CartIcon,
      badge: cartCount,
    },
    {
      key: 'account',
      label: 'Akun',
      href: routeUrl(routes.login),
      Icon: UserIcon,
    },
  ]

  return (
    <nav className="tp-bottom-nav" aria-label="Navigasi utama">
      {items.map(({ key, label, href, Icon, active, badge }) => (
        <a
          key={key}
          className={`tp-bottom-nav__item${active ? ' tp-bottom-nav__item--active' : ''}`}
          href={href}
        >
          <span className="tp-bottom-nav__icon">
            <Icon />
            {badge && badge > 0 ? <span className="tp-bottom-nav__badge">{badge}</span> : null}
          </span>
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}