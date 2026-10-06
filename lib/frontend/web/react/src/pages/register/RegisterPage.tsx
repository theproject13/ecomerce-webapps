import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import {
  EnvelopeIcon,
  EyeIcon,
  GoogleIcon,
  HeadsetIcon,
  LockIcon,
  StoreLogo,
  UserIcon,
} from '../../components/ui/Icon'
import { STORE_NAME } from '../../lib/brand'
import { routeUrl, routes } from '../../lib/routes'
import './register.css'

type FieldErrors = {
  identity?: string
  fullName?: string
  password?: string
  terms?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(\+62|62|08)\d{8,12}$/

function isPhoneOrEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  return EMAIL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed.replace(/[\s-]/g, ''))
}

/** Halaman Daftar. Branding memakai STORE_NAME, bukan "tokopedia". */
export function RegisterPage() {
  const { showToast } = useToast()
  const [identity, setIdentity] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [revealPassword, setRevealPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}

    if (!isPhoneOrEmail(identity)) {
      next.identity = 'Masukkan nomor HP atau email yang valid'
    }

    if (fullName.trim().length < 2) {
      next.fullName = 'Nama lengkap wajib diisi'
    }

    if (password.length < 8) {
      next.password = 'Kata sandi minimal 8 karakter'
    }

    if (!agreed) {
      next.terms = 'Setujui Syarat & Ketentuan terlebih dahulu'
    }

    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const next = validate()
    setErrors(next)

    if (Object.keys(next).length > 0) {
      showToast('Periksa kembali isian yang ditandai', 'error')
      return
    }

    setSubmitting(true)

    // Belum tersambung ke PHP. Endpoint account/create (scenario=create)
    // menuntut: email_address, password, confirmation, firstname, lastname,
    // telephone, landline, gender, dob, gdrp, dan CSRF.
    // Form ini baru punya 3 field tersebut, jadi tidak dikirim dulu supaya
    // tidak membuat akun setengah jadi. Lihat CustomerRegistration::rules().
    window.setTimeout(() => {
      setSubmitting(false)
      showToast('Pendaftaran belum tersambung ke server', 'error')
    }, 600)
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

          <p className="tp-auth__tagline">Jual Beli Mudon, Hemat dan Nyaman</p>
          <p className="tp-auth__art-sub">
            Gabung jutaan orang yang sudah merasakan belanja online terpercaya di {STORE_NAME}
          </p>
        </div>
      </section>

      <section className="tp-auth__form">
        <div className="tp-auth__container">
          <Link className="tp-auth__logo" to="/">
            <StoreLogo className="tp-auth__logo-mark" />
            <span>{STORE_NAME}</span>
          </Link>

          <h1 className="tp-auth__heading">Daftar Sekarang</h1>
          <p className="tp-auth__subheading">
            Sudah punya akun {STORE_NAME}?{' '}
            <a href={routeUrl(routes.login)}>Masuk</a>
          </p>

          <div className="tp-auth__social">
            <button type="button" className="tp-auth__social-btn" onClick={() => showToast('Pendaftaran dengan Google belum tersedia')}>
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button type="button" className="tp-auth__social-btn" onClick={() => showToast('Pendaftaran dengan E-mail belum tersedia')}>
              <EnvelopeIcon />
              <span>E-mail</span>
            </button>
          </div>

          <div className="tp-auth__divider">
            <span className="tp-auth__divider-line" />
            <span className="tp-auth__divider-text">atau daftar dengan</span>
            <span className="tp-auth__divider-line" />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={`tp-auth__field${errors.identity ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="identity">Nomor HP atau E-mail</label>
              <UserIcon className="tp-auth__field-icon" />
              <input
                id="identity"
                className="tp-auth__input"
                type="text"
                value={identity}
                placeholder="Contoh: email@domain.com atau 08123xxx"
                autoComplete="off"
                onChange={(event) => {
                  setIdentity(event.target.value)
                  setErrors((prev) => ({ ...prev, identity: undefined }))
                }}
              />
              {errors.identity ? <span className="tp-auth__error">{errors.identity}</span> : null}
            </div>

            <div className={`tp-auth__field${errors.fullName ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="fullName">Nama Lengkap</label>
              <UserIcon className="tp-auth__field-icon" />
              <input
                id="fullName"
                className="tp-auth__input"
                type="text"
                value={fullName}
                placeholder="Masukkan nama lengkap"
                autoComplete="off"
                onChange={(event) => {
                  setFullName(event.target.value)
                  setErrors((prev) => ({ ...prev, fullName: undefined }))
                }}
              />
              {errors.fullName ? <span className="tp-auth__error">{errors.fullName}</span> : null}
            </div>

            <div className={`tp-auth__field${errors.password ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="password">Kata Sandi</label>
              <LockIcon className="tp-auth__field-icon" />
              <input
                id="password"
                className="tp-auth__input"
                type={revealPassword ? 'text' : 'password'}
                value={password}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
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

            <div className="tp-auth__check">
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked)
                  setErrors((prev) => ({ ...prev, terms: undefined }))
                }}
              />
              <label htmlFor="agreeTerms">
                Saya menyetujui <a href="#terms">Syarat &amp; Ketentuan</a> serta{' '}
                <a href="#privacy">Kebijakan Privasi</a> {STORE_NAME}
              </label>
            </div>
            {errors.terms ? <span className="tp-auth__error tp-auth__error--block">{errors.terms}</span> : null}

            <button type="submit" className="tp-auth__submit" disabled={submitting}>
              {submitting ? 'Mendaftarkan...' : 'Daftar'}
            </button>
          </form>

          <p className="tp-auth__terms">
            Dengan mendaftar, Anda menyetujui Syarat &amp; Ketentuan dan Kebijakan Privasi kami,
            termasuk penggunaan Cookie.
          </p>
        </div>

        <div className="tp-auth__footer">
          <p className="tp-auth__footer-copy">&copy; {STORE_NAME}</p>
          <button type="button" className="tp-auth__care" onClick={() => showToast(`${STORE_NAME} Care belum tersedia`)}>
            <HeadsetIcon />
            {STORE_NAME} Care
          </button>
        </div>
      </section>
    </div>
  )
}