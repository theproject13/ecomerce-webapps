import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EyeIcon,
  LockIcon,
  StoreLogo,
  UserIcon,
} from '../../components/ui/Icon'
import { STORE_NAME } from '../../lib/brand'
import { routeUrl } from '../../lib/routes'
import { login } from '../../features/account/account-api'
import '../register/register.css'

type FieldErrors = {
  email_address?: string
  password?: string
}

/**
 * Halaman Masuk.
 *
 * Layar penuh tanpa header/footer, sama seperti RegisterPage. Submit dikirim
 * ke /api/account/login yang memanggil CustomerRegistration scenario 'login',
 * jadi aturan validasi dan pesan errornya identik dengan tema PHP.
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [revealPassword, setRevealPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBanner(null)

    const next: FieldErrors = {}
    if (!email.trim()) {
      next.email_address = 'Email wajib diisi'
    }
    if (!password) {
      next.password = 'Kata sandi wajib diisi'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      const payload = await login({ email, password, remember })

      if (!payload.ok) {
        setBanner(payload.error || 'Email atau kata sandi salah.')
        const fieldErrors: FieldErrors = {}
        if (payload.field_errors?.email_address) {
          fieldErrors.email_address = payload.field_errors.email_address
        }
        if (payload.field_errors?.password) {
          fieldErrors.password = payload.field_errors.password
        }
        setErrors(fieldErrors)
        return
      }

      // Navigasi penuh, bukan client-side, supaya shell React dimuat ulang dan
      // header membaca session PHP yang baru (logged_in = true).
      window.location.assign(payload.redirect.account)
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Masuk gagal. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="tp-auth">
      <section className="tp-auth__art" aria-hidden="true">
        <span className="tp-auth__spark tp-auth__spark--1" />
        <span className="tp-auth__spark tp-auth__spark--2" />
        <span className="tp-auth__spark tp-auth__spark--3" />

        <div className="tp-auth__art-inner">
          <svg className="tp-auth__illustration" viewBox="0 0 500 400" fill="none">
            <path
              d="M250 40 Q150 30 100 80 Q80 100 120 110 Q180 90 250 85 Q320 90 380 110 Q420 100 400 80 Q350 30 250 40Z"
              fill="#FF6B6B"
              opacity="0.9"
            />
            <line x1="170" y1="65" x2="210" y2="140" stroke="#e0e0e0" strokeWidth="1.5" />
            <line x1="330" y1="65" x2="290" y2="140" stroke="#e0e0e0" strokeWidth="1.5" />
            <line x1="250" y1="85" x2="250" y2="140" stroke="#e0e0e0" strokeWidth="1.5" />

            <rect x="195" y="140" width="110" height="120" rx="12" fill="#fff" />
            <path
              d="M220 140 Q220 115 250 115 Q280 115 280 140"
              stroke="#43b550"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="232" cy="185" r="6" fill="#43b550" />
            <circle cx="268" cy="185" r="6" fill="#43b550" />
            <path d="M230 205 Q250 220 270 205" stroke="#43b550" strokeWidth="4" fill="none" strokeLinecap="round" />
            <rect x="225" y="230" width="50" height="6" rx="3" fill="#43b550" opacity="0.3" />

            <rect x="30" y="250" width="80" height="70" rx="8" fill="#fff" opacity="0.95" />
            <rect x="30" y="250" width="80" height="18" rx="8" fill="#FF6B6B" opacity="0.8" />
            <rect x="50" y="242" width="40" height="12" rx="4" fill="#FF6B6B" />
            <text x="70" y="251" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">
              SALE
            </text>

            <rect x="390" y="240" width="80" height="80" rx="8" fill="#fff" opacity="0.95" />
            <rect x="390" y="240" width="80" height="18" rx="8" fill="#5ec6ca" opacity="0.8" />
            <rect x="410" y="232" width="40" height="12" rx="4" fill="#5ec6ca" />
            <text x="430" y="241" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">
              SHOP
            </text>

            <rect x="340" y="290" width="35" height="35" rx="4" fill="#e91e63" opacity="0.8" />
            <rect x="354" y="290" width="8" height="35" fill="#c2185b" opacity="0.3" />

            <line x1="20" y1="340" x2="480" y2="340" stroke="#fff" strokeWidth="1.5" opacity="0.2" />
          </svg>

          <p className="tp-auth__tagline">Selamat Datang Kembali</p>
          <p className="tp-auth__art-sub">
            Masuk untuk melihat pesanan, alamat, dan melanjutkan belanja di {STORE_NAME}
          </p>
        </div>
      </section>

      <section className="tp-auth__form">
        <div className="tp-auth__container">
          <Link className="tp-auth__logo" to="/">
            <StoreLogo className="tp-auth__logo-mark" />
            <span>{STORE_NAME}</span>
          </Link>

          <h1 className="tp-auth__heading">Masuk</h1>
          <p className="tp-auth__subheading">
            Belum punya akun {STORE_NAME}?{' '}
            <Link to="/register">Daftar</Link>
          </p>

          {banner ? <div className="tp-auth__banner tp-auth__banner--error">{banner}</div> : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`tp-auth__field${errors.email_address ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="email">E-mail</label>
              <UserIcon className="tp-auth__field-icon" />
              <input
                id="email"
                className="tp-auth__input"
                type="email"
                value={email}
                placeholder="email@domain.com"
                autoComplete="email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrors((prev) => ({ ...prev, email_address: undefined }))
                }}
              />
              {errors.email_address ? <span className="tp-auth__error">{errors.email_address}</span> : null}
            </div>

            <div className={`tp-auth__field${errors.password ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="password">Kata Sandi</label>
              <LockIcon className="tp-auth__field-icon" />
              <input
                id="password"
                className="tp-auth__input"
                type={revealPassword ? 'text' : 'password'}
                value={password}
                placeholder="Kata sandi Anda"
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value)
                  setErrors((prev) => ({ ...prev, password: undefined }))
                }}
              />
              <button
                type="button"
                className="tp-auth__reveal"
                onClick={() => setRevealPassword((prev) => !prev)}
              >
                <EyeIcon />
                <span className="visually-hidden">
                  {revealPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                </span>
              </button>
              {errors.password ? <span className="tp-auth__error">{errors.password}</span> : null}
            </div>



            <div className="tp-auth__meta">
              <label htmlFor="remember">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Ingat saya
              </label>
              <a href={routeUrl('account/password-forgotten')}>Lupa kata sandi?</a>
            </div>

            <button type="submit" className="tp-auth__submit" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="tp-auth__terms">
            Dengan masuk, Anda menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi {STORE_NAME}.
          </p>
        </div>
      </section>
    </div>
  )
}