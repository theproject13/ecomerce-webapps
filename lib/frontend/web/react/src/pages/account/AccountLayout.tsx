import { useEffect, useState, type ComponentType } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { routeUrl, routes } from '../../lib/routes'
import { useStorefront } from '../../app/providers'
import { useToast } from '../../components/ui/Toast'
import { STORE_NAME } from '../../lib/brand'
import { fetchOverview, logout, type AccountOverview } from '../../features/account/account-api'
import {
  BellIcon,
  CheckCircleIcon,
  CloseIcon,
  CreditCardIcon,
  HeartIcon,
  HeadsetIcon,
  LockIcon,
  LogoutIcon,
  MapPinIcon,
  MenuIcon,
  ReceiptIcon,
  UserIcon,
  WalletIcon,
} from '../../components/ui/Icon'
import './account.css'

type NavEntry = {
  label: string
  Icon: ComponentType<{ className?: string }>
  to?: string
  href?: string
  toast?: string
  badge?: string
}

function navGroups(storeName: string): Array<{ title: string; items: NavEntry[] }> {
  return [
    {
      title: 'Akun Saya',
      items: [
        { label: 'Profil Saya', Icon: UserIcon, href: routeUrl(routes.account) },
        { label: 'Alamat', Icon: MapPinIcon, href: routeUrl(routes.addresses) },
        { label: 'Daftar Transaksi', Icon: ReceiptIcon, to: '/orders' },
        { label: 'Wishlist', Icon: HeartIcon, to: '/wishlist' },
      ],
    },
    {
      title: 'Pembayaran',
      items: [
        { label: 'Saldo & Top Up', Icon: WalletIcon, toast: 'Saldo & Top Up belum tersedia' },
        { label: 'GoPay', Icon: WalletIcon, toast: 'GoPay belum tersedia' },
        { label: 'OVO', Icon: WalletIcon, toast: 'OVO belum tersedia' },
        { label: 'Kartu Kredit', Icon: CreditCardIcon, toast: 'Kartu Kredit belum tersedia' },
      ],
    },
    {
      title: 'Layanan',
      items: [
        { label: `${storeName} CARE`, Icon: HeadsetIcon, toast: 'CARE belum tersedia' },
        { label: 'Bantuan', Icon: BellIcon, toast: 'Bantuan belum tersedia' },
        { label: 'Pengaturan', Icon: LockIcon, toast: 'Pengaturan belum tersedia' },
      ],
    },
  ]
}

export function AccountLayout() {
  const { session } = useStorefront()
  const { showToast } = useToast()
  const [overview, setOverview] = useState<AccountOverview | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true

    fetchOverview()
      .then((payload) => {
        if (active) {
          setOverview(payload.items)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  async function handleLogout() {
    if (loggingOut) {
      return
    }

    setLoggingOut(true)
    try {
      const payload = await logout()
      window.location.assign(payload.redirect.home)
    } catch {
      showToast('Keluar gagal. Coba lagi.')
      setLoggingOut(false)
    }
  }

  const name = overview?.display_name || session.display_name || 'Pelanggan'
  const email = overview?.email || ''
  const initial = session.initial || name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="account-layout">
      <div
        className={`account-overlay${menuOpen ? ' show' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`account-sidebar${menuOpen ? ' open' : ''}`}>
        <button
          type="button"
          className="account-sidebar__close"
          onClick={() => setMenuOpen(false)}
          aria-label="Tutup menu"
        >
          <CloseIcon />
        </button>

        <div className="account-sidebar__profile">
          <div className="account-sidebar__top">
            <span className="account-sidebar__avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="account-sidebar__meta">
              <p className="account-sidebar__name">{name}</p>
              {email ? <p className="account-sidebar__email">{email}</p> : null}
            </div>
          </div>
          <div className="account-sidebar__verify">
            <CheckCircleIcon />
            <span>Terverifikasi</span>
          </div>
        </div>

        <div className="account-sidebar__balance">
          <p className="account-sidebar__balance-label">Saldo {STORE_NAME}</p>
          <p className="account-sidebar__balance-amount">Rp0</p>
        </div>

        <nav className="account-sidebar__nav" aria-label="Menu akun">
          {navGroups(STORE_NAME).map((group) => (
            <div className="account-sidebar__group" key={group.title}>
              <p className="account-sidebar__group-title">{group.title}</p>

              {group.items.map((entry) => {
                if (entry.to) {
                  return (
                    <NavLink
                      key={entry.label}
                      to={entry.to}
                      end={entry.to === '/account'}
                      className={({ isActive }) =>
                        `account-sidebar__item${isActive ? ' is-active' : ''}`
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      <entry.Icon />
                      <span>{entry.label}</span>
                      {entry.badge ? (
                        <span className="account-sidebar__count">{entry.badge}</span>
                      ) : null}
                    </NavLink>
                  )
                }

                if (entry.href) {
                  return (
                    <a
                      key={entry.label}
                      className="account-sidebar__item"
                      href={entry.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      <entry.Icon />
                      <span>{entry.label}</span>
                      {entry.badge ? (
                        <span className="account-sidebar__count">{entry.badge}</span>
                      ) : null}
                    </a>
                  )
                }

                return (
                  <button
                    key={entry.label}
                    type="button"
                    className="account-sidebar__item"
                    onClick={() => entry.toast && showToast(entry.toast)}
                  >
                    <entry.Icon />
                    <span>{entry.label}</span>
                  </button>
                )
              })}
            </div>
          ))}

          <div className="account-sidebar__group">
            <button
              type="button"
              className="account-sidebar__item account-sidebar__item--danger"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogoutIcon />
              <span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
            </button>
          </div>
        </nav>
      </aside>

      <div className="account-main">
        <button
          type="button"
          className="account-menu-btn"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
          <span>Menu Akun</span>
        </button>

        <Outlet />
      </div>
    </div>
  )
}
