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
import { register } from '../../features/account/account-api'
import './register.css'

type FieldErrors = {
  email_address?: string
  firstname?: string
  lastname?: string
  password?: string
  confirmation?: string
  gdrp?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Halaman Daftar.
 *
 * Submit dikirim ke /api/account/register yang memanggil CustomerRegistration
 * scenario 'registration' milik tema PHP, jadi aturan validasi (email unik,
 * panjang password, gdrp) identik dengan toko. Field alamat, gender,
 * dob, dan telepon tidak ditampilkan karena konfigurasi ACCOUNT_*-nya
 * 'visible'/'disabled' — tidak wajib saat registrasi di instalasi ini.
 */
export function RegisterPage() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [revealPassword, setRevealPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}

    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email_address = 'Masukkan email yang valid'
    }
    // Batas mengikuti server: ENTRY_FIRST_NAME_MIN_LENGTH / ENTRY_LAST_NAME_MIN_LENGTH = 2
    // (CustomerRegistration::requiredOnRegister). Jangan diturunkan di sini, atau
    // form lolos validasi client lalu ditolak server.
    if (firstname.trim().length < 2) {
      next.firstname = 'Nama depan minimal 2 karakter'
    }
    if (lastname.trim().length < 2) {
      next.lastname = 'Nama belakang minimal 2 karakter'
    }
    // ENTRY_PASSWORD_MIN_LENGTH = 12 (CustomerRegistration::requiredOnRegister).
    // Client sebelumnya 8 - penyebab akun tidak tersimpan lalu login gagal.
    if (password.length < 12) {
      next.password = 'Kata sandi minimal 12 karakter'
    } else if (password !== confirmation) {
      next.confirmation = 'Konfirmasi kata sandi tidak cocok'
    }
    if (!agreed) {
      next.gdrp = 'Setujui Syarat & Ketentuan terlebih dahulu'
    }
    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBanner(null)

    const next = validate()
    setErrors(next)

    if (Object.keys(next).length > 0) {
      showToast('Periksa kembali isian yang ditandai', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = await register({
        email,
        password,
        confirmation,
        firstname,
        lastname,
        gdrp: agreed,
      })

      if (!payload.ok) {
        setBanner(payload.error || 'Pendaftaran gagal. Periksa kembali data Anda.')
        const fieldErrors: FieldErrors = {}
        const map: Array<[keyof FieldErrors, string]> = [
          ['email_address', 'email_address'],
          ['firstname', 'firstname'],
          ['lastname', 'lastname'],
          ['password', 'password'],
          ['confirmation', 'confirmation'],

        ]
        for (const [key, source] of map) {
          if (payload.field_errors?.[source]) {
            fieldErrors[key] = payload.field_errors[source]
          }
        }
        if (payload.field_errors?.gdrp) {
          fieldErrors.gdrp = payload.field_errors.gdrp
        }
        setErrors(fieldErrors)
        return
      }

      // Registrasi sukses langsung login di PHP. Muat ulang shell supaya
      // header membaca session baru.
      window.location.assign(payload.redirect.account)
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Pendaftaran gagal. Coba lagi.')

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

          <p className="tp-auth__tagline">Belanja Mudah, Hemat dan Nyaman</p>
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
            <Link to="/login">Masuk</Link>
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

          {banner ? <div className="tp-auth__banner tp-auth__banner--error">{banner}</div> : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`tp-auth__field${errors.email_address ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="email">E-mail</label>
              <EnvelopeIcon className="tp-auth__field-icon" />
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

            <div className="tp-auth__row">
              <div className={`tp-auth__field${errors.firstname ? ' tp-auth__field--error' : ''}`}>
                <label htmlFor="firstname">Nama Depan</label>
                <UserIcon className="tp-auth__field-icon" />
                <input
                  id="firstname"
                  className="tp-auth__input"
                  type="text"
                  value={firstname}
                  placeholder="Nama depan"
                  autoComplete="given-name"
                  onChange={(event) => {
                    setFirstname(event.target.value)
                    setErrors((prev) => ({ ...prev, firstname: undefined }))
                  }}
                />
                {errors.firstname ? <span className="tp-auth__error">{errors.firstname}</span> : null}
              </div>

              <div className={`tp-auth__field${errors.lastname ? ' tp-auth__field--error' : ''}`}>
                <label htmlFor="lastname">Nama Belakang</label>
                <UserIcon className="tp-auth__field-icon" />
                <input
                  id="lastname"
                  className="tp-auth__input"
                  type="text"
                  value={lastname}
                  placeholder="Nama belakang"
                  autoComplete="family-name"
                  onChange={(event) => {
                    setLastname(event.target.value)
                    setErrors((prev) => ({ ...prev, lastname: undefined }))
                  }}
                />
                {errors.lastname ? <span className="tp-auth__error">{errors.lastname}</span> : null}
              </div>
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

            <div className={`tp-auth__field${errors.confirmation ? ' tp-auth__field--error' : ''}`}>
              <label htmlFor="confirmation">Konfirmasi Kata Sandi</label>
              <LockIcon className="tp-auth__field-icon" />
              <input
                id="confirmation"
                className="tp-auth__input"
                type={revealPassword ? 'text' : 'password'}
                value={confirmation}
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
                onChange={(event) => {
                  setConfirmation(event.target.value)
                  setErrors((prev) => ({ ...prev, confirmation: undefined }))
                }}
              />
              {errors.confirmation ? <span className="tp-auth__error">{errors.confirmation}</span> : null}
            </div>



            <div className="tp-auth__check">
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked)
                  setErrors((prev) => ({ ...prev, gdrp: undefined }))
                }}
              />
              <label htmlFor="agreeTerms">
                Saya menyetujui <a href="#terms">Syarat &amp; Ketentuan</a> serta{' '}
                <a href="#privacy">Kebijakan Privasi</a> {STORE_NAME}
              </label>
            </div>
            {errors.gdrp ? <span className="tp-auth__error tp-auth__error--block">{errors.gdrp}</span> : null}

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