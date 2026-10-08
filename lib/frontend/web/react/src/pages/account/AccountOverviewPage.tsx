import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { routeUrl, routes } from '../../lib/routes'
import { ApiError, catalogUrl } from '../../lib/api-client'
import { StateMessage } from '../../components/ui/StateMessage'
import {
  fetchOverview,
  logout,
  type AccountOverview,
} from '../../features/account/account-api'
import './account.css'

type LoadState = 'loading' | 'ready' | 'error' | 'guest'

/**
 * Ringkasan akun.
 *
 * Profil hanya bisa dibaca setelah login; di sisi server /api/account/overview
 * menolak tamu dengan 401, jadi halaman ini punya satu sumber kebenaran yang
 * sama dengan tema. Halaman ubah data (profil, kata sandi, alamat, newsletter)
 * masih milik tema PHP dan ditautkan ke sana.
 */
export function AccountOverviewPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<AccountOverview | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true

    fetchOverview()
      .then((payload) => {
        if (!active) {
          return
        }
        setProfile(payload.items)
        setState('ready')
      })
      .catch((error) => {
        if (!active) {
          return
        }
        if (error instanceof ApiError && error.status === 401) {
          setState('guest')
          return
        }
        setMessage(error instanceof Error ? error.message : 'Data akun tidak bisa dimuat.')
        setState('error')
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    setMessage(null)
    try {
      const payload = await logout()
      window.location.assign(payload.redirect.home)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Keluar gagal. Coba lagi.')
      setLoggingOut(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="container section">
        <div className="surface">
          <p className="account-loading">Memuat akun...</p>
        </div>
      </div>
    )
  }

  if (state === 'guest') {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            title="Belum masuk"
            description="Masuk dulu untuk melihat profil dan riwayat pesanan Anda."
            action={{
              label: 'Masuk',
              onClick: () => window.location.assign(catalogUrl('login')),
            }}
          />
        </div>
      </div>
    )
  }

  if (state === 'error' || !profile) {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage title="Gagal memuat akun" description={message ?? undefined} tone="error" />
        </div>
      </div>
    )
  }

  const initial = profile.firstname ? profile.firstname.trim().charAt(0).toUpperCase() : '?'

  return (
    <div className="container section">
      <div className="surface account-page">
        <h1 className="account-heading">Akun Saya</h1>

        {message ? <StateMessage title="Perhatian" description={message} tone="error" /> : null}

        <div className="account-profile">
          <span className="account-profile__avatar" aria-hidden="true">
            {initial}
          </span>
          <div className="account-profile__meta">
            <p className="account-profile__name">{profile.display_name || 'Pelanggan'}</p>
            {profile.email ? <p className="account-profile__line">{profile.email}</p> : null}
            {profile.telephone ? <p className="account-profile__line">{profile.telephone}</p> : null}
            <p className="account-profile__line">{profile.orders_count} pesanan</p>
          </div>
        </div>

        <div className="account-grid">
          <Link className="account-tile" to="/orders">
            <span className="account-tile__label">Pesanan Saya</span>
            <span className="account-tile__desc">Riwayat & status pengiriman</span>
          </Link>
          <a className="account-tile" href={routeUrl(routes.addresses)}>
            <span className="account-tile__label">Buku Alamat</span>
            <span className="account-tile__desc">Alamat kirim & tagih</span>
          </a>
          <a className="account-tile" href={routeUrl(routes.account)}>
            <span className="account-tile__label">Ubah Profil</span>
            <span className="account-tile__desc">Nama, email, telepon</span>
          </a>
        </div>

        <div className="account-actions">
          <Link className="account-btn account-btn--solid" to="/orders">
            Lihat Pesanan
          </Link>
          <button
            type="button"
            className="account-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Keluar...' : 'Keluar'}
          </button>
        </div>
      </div>
    </div>
  )
}