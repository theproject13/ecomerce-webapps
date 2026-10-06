import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellIcon,
  CartIcon,
  EnvelopeIcon,
  SearchIcon,
  StoreLogo,
  UserIcon,
} from '../ui/Icon'
import { useToast } from '../ui/Toast'
import { routeUrl, routes, searchUrl } from '../../lib/routes'
import type { Channel, SessionState } from '../../types/api'

type StoreHeaderProps = {
  storeName: string
  cartCount: number
  channels: Channel[]
  session: SessionState
}

/**
 * Header sticky.
 *
 * Tab memakai channel asli dari API, bukan kategori karangan seperti
 * "Top-up" atau "Keuangan" yang tidak ada di toko ini.
 */
export function StoreHeader({ storeName, cartCount, channels, session }: StoreHeaderProps) {
  const [keyword, setKeyword] = useState('')
  const { showToast } = useToast()
  const isLoggedIn = session.logged_in

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = keyword.trim()

    if (!value) {
      showToast('Ketik kata kunci dulu')
      return
    }

    window.location.href = searchUrl(value)
  }

  return (
    <header className="tp-header">
      <div className="tp-header__inner">
        <div className="tp-header__top">
          <a className="tp-header__logo" href={routeUrl(routes.home)} aria-label={storeName}>
            <StoreLogo className="tp-header__logo-mark" />
            <span>{storeName}</span>
          </a>

          <form className="tp-search" role="search" onSubmit={submitSearch}>
            <SearchIcon className="tp-search__icon" />
            <input
              className="tp-search__input"
              type="search"
              name="keywords"
              value={keyword}
              placeholder={`Cari di ${storeName}`}
              aria-label="Cari produk"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </form>

          <div className="tp-header__icons">
            <a
              className="tp-header__icon"
              href={routeUrl(routes.cart)}
              title="Keranjang"
              onClick={(event) => {
                if (cartCount === 0) {
                  event.preventDefault()
                  showToast('Keranjang kosong')
                }
              }}
            >
              <CartIcon />
              {cartCount > 0 ? <span className="tp-header__badge">{cartCount}</span> : null}
              <span className="visually-hidden">Keranjang</span>
            </a>

            <button
              type="button"
              className="tp-header__icon"
              title="Inbox"
              onClick={() => showToast('Inbox belum ada pesan')}
            >
              <EnvelopeIcon />
              <span className="visually-hidden">Inbox</span>
            </button>

            <button
              type="button"
              className="tp-header__icon"
              title="Notifikasi"
              onClick={() => showToast('Belum ada notifikasi')}
            >
              <BellIcon />
              <span className="visually-hidden">Notifikasi</span>
            </button>

            {isLoggedIn ? (
              <a
                className="tp-header__icon tp-header__icon--profile"
                href={routeUrl(routes.accountOverview)}
                title={session.display_name ? `Profil ${session.display_name}` : 'Profil saya'}
              >
                {session.initial ? (
                  <span className="tp-header__avatar" aria-hidden="true">
                    {session.initial}
                  </span>
                ) : (
                  <UserIcon />
                )}
                <span className="visually-hidden">
                  {session.display_name ? `Profil ${session.display_name}` : 'Profil saya'}
                </span>
              </a>
            ) : (
              <div className="tp-header__auth">
                <a className="tp-header__auth-btn" href={routeUrl(routes.login)}>
                  Masuk
                </a>
                <Link className="tp-header__auth-btn tp-header__auth-btn--solid" to="/register">
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>

        <nav className="tp-header__tabs" aria-label="Kanal toko">
          <a className="tp-tab tp-tab--active" href={routeUrl(routes.home)}>
            Semua
          </a>
          {channels.flatMap((channel) =>
            channel.url ? (
              [
                <a key={channel.platform_id} className="tp-tab" href={channel.url}>
                  {channel.name}
                </a>,
              ]
            ) : [],
          )}
        </nav>
      </div>
    </header>
  )
}