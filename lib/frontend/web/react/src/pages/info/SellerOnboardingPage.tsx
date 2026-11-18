import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircleIcon,
  ChevronRightIcon,
  StorefrontIcon,
  UserIcon,
} from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { routes } from '../../lib/routes'
import { submitSellerApplication } from '../../features/seller/seller-api'
import './info.css'

type FormState = {
  storeName: string
  category: string
  customCategory: string
  description: string
  contactName: string
  contactPhone: string
  streetAddress: string
  city: string
  postcode: string
}

const EMPTY_FORM: FormState = {
  storeName: '',
  category: '',
  customCategory: '',
  description: '',
  contactName: '',
  contactPhone: '',
  streetAddress: '',
  city: '',
  postcode: '',
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const STORE_CATEGORIES = [
  'Fashion',
  'Elektronik',
  'Kecantikan & Perawatan',
  'Makanan & Minuman',
  'Rumah & Dapur',
  'Olahraga & Outdoor',
  'Mainan & Hobi',
  'Lainnya',
]

export function SellerOnboardingPage() {
  const { meta, session } = useStorefront()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}

    if (form.storeName.trim().length < 3) {
      next.storeName = 'Nama toko minimal 3 karakter'
    }
    if (!form.category) {
      next.category = 'Pilih kategori toko'
    }
    if (form.category === 'Lainnya' && form.customCategory.trim().length < 2) {
      next.customCategory = 'Tulis kategori toko'
    }
    if (form.contactName.trim().length < 2) {
      next.contactName = 'Nama penanggung jawab minimal 2 karakter'
    }
    if (form.contactPhone.trim().length < 8) {
      next.contactPhone = 'Nomor telepon minimal 8 digit'
    }
    if (form.streetAddress.trim().length < 5) {
      next.streetAddress = 'Alamat toko minimal 5 karakter'
    }
    if (form.city.trim().length < 2) {
      next.city = 'Isi kota asal pengiriman'
    }

    return next
  }

  function mapServerErrors(fieldErrors?: Record<string, string>): FieldErrors {
    if (!fieldErrors) {
      return {}
    }

    const mapping: Record<string, keyof FormState> = {
      store_name: 'storeName',
      category: form.category === 'Lainnya' ? 'customCategory' : 'category',
      description: 'description',
      contact_name: 'contactName',
      contact_phone: 'contactPhone',
      street_address: 'streetAddress',
      city: 'city',
      postcode: 'postcode',
    }

    const next: FieldErrors = {}
    for (const [field, message] of Object.entries(fieldErrors)) {
      const key = mapping[field]
      if (key) {
        next[key] = message
      }
    }

    return next
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const next = validate()
    setErrors(next)

    if (Object.keys(next).length > 0) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload = await submitSellerApplication({
        storeName: form.storeName.trim(),
        category: form.category,
        customCategory: form.customCategory.trim(),
        description: form.description.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        streetAddress: form.streetAddress.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim(),
      })

      if (!payload.ok) {
        setErrors(mapServerErrors(payload.field_errors))
        setSubmitError(payload.error || 'Pengajuan toko gagal. Periksa kembali data kamu.')
        return
      }

      setSubmitted(true)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Pengajuan toko gagal. Silakan coba lagi.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!session.logged_in) {
    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Buat Toko</p>
          <h1>Masuk dulu untuk membuka toko</h1>
          <p className="tp-info__lead">
            Kamu perlu akun {meta.store_name} sebelum mengisi data toko. Setelah masuk, kamu akan
            dibawa kembali ke halaman ini.
          </p>
          <div className="tp-info__actions">
            <Link
              className="tp-info__btn"
              to={`/login?next=${encodeURIComponent(routes.sellerOnboarding)}`}
            >
              <UserIcon />
              Masuk
            </Link>
            <Link
              className="tp-info__btn tp-info__btn--ghost"
              to={`/register?next=${encodeURIComponent(routes.sellerOnboarding)}`}
            >
              Belum punya akun? Daftar
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Buat Toko</p>
          <h1>Pengajuan toko diterima</h1>
          <p className="tp-info__lead">
            Terima kasih, {form.contactName || session.display_name}. Data toko {form.storeName}{' '}
            sudah kami terima dan akan ditinjau sebelum toko aktif.
          </p>
          <div className="tp-info__actions">
            <Link className="tp-info__btn" to={`/${routes.sellerDashboard}`}>
              Lihat Status Toko
              <ChevronRightIcon />
            </Link>
            <Link className="tp-info__btn" to={`/${routes.sellerCenter}`}>
              Kembali ke Seller Center
            </Link>
            <Link className="tp-info__btn tp-info__btn--ghost" to={`/${routes.care}`}>
              Hubungi {meta.store_name} Care
            </Link>
          </div>
        </section>

        <section className="tp-info__section">
          <h2>Langkah Selanjutnya</h2>
          <ul className="tp-info__list">
            <li>
              <CheckCircleIcon />
              <span>Tim kami meninjau data toko yang kamu kirim.</span>
            </li>
            <li>
              <CheckCircleIcon />
              <span>Setelah disetujui, kamu bisa mengunggah produk dan mengatur stok.</span>
            </li>
            <li>
              <CheckCircleIcon />
              <span>Pantau status lewat halaman Status Pesanan dan pusat bantuan.</span>
            </li>
          </ul>
        </section>
      </div>
    )
  }

  return (
    <div className="tp-info">
      <section className="tp-info__hero">
        <p className="tp-info__eyebrow">Buat Toko</p>
        <h1>Lengkapi Data Toko</h1>
        <p className="tp-info__lead">
          Isi data toko di bawah ini. Setelah diajukan, tim {meta.store_name} akan meninjau dan
          mengaktifkan toko kamu.
        </p>
      </section>

      <section className="tp-info__section">
        <h2>Data Toko</h2>
        <p>Informasi ini yang akan dilihat pembeli di halaman toko kamu.</p>

        <form className="tp-info__form" onSubmit={handleSubmit} noValidate>
          <label className="tp-info__field">
            <span className="tp-info__label">Nama toko</span>
            <input
              type="text"
              value={form.storeName}
              onChange={(event) => update('storeName', event.target.value)}
              placeholder="Contoh: Toko Sumber Makmur"
              maxLength={96}
            />
            {errors.storeName ? <span className="tp-info__error">{errors.storeName}</span> : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Kategori toko</span>
            <select
              value={form.category}
              onChange={(event) => update('category', event.target.value)}
            >
              <option value="">Pilih kategori</option>
              {STORE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category ? <span className="tp-info__error">{errors.category}</span> : null}
          </label>

          {form.category === 'Lainnya' ? (
            <label className="tp-info__field">
              <span className="tp-info__label">Kategori lainnya</span>
              <input
                type="text"
                value={form.customCategory}
                onChange={(event) => update('customCategory', event.target.value)}
                placeholder="Contoh: fashion"
                maxLength={128}
              />
              {errors.customCategory ? (
                <span className="tp-info__error">{errors.customCategory}</span>
              ) : null}
            </label>
          ) : null}

          <label className="tp-info__field tp-info__field--full">
            <span className="tp-info__label">Deskripsi toko</span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Ceritakan singkat produk yang kamu jual"
              rows={3}
              maxLength={500}
            />
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Nama penanggung jawab</span>
            <input
              type="text"
              value={form.contactName}
              onChange={(event) => update('contactName', event.target.value)}
              placeholder="Nama lengkap"
              maxLength={128}
            />
            {errors.contactName ? (
              <span className="tp-info__error">{errors.contactName}</span>
            ) : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Nomor telepon</span>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(event) => update('contactPhone', event.target.value)}
              placeholder="08xxxxxxxxxx"
              maxLength={20}
            />
            {errors.contactPhone ? (
              <span className="tp-info__error">{errors.contactPhone}</span>
            ) : null}
          </label>

          <label className="tp-info__field tp-info__field--full">
            <span className="tp-info__label">Alamat toko</span>
            <input
              type="text"
              value={form.streetAddress}
              onChange={(event) => update('streetAddress', event.target.value)}
              placeholder="Jalan, nomor, RT/RW"
              maxLength={128}
            />
            {errors.streetAddress ? (
              <span className="tp-info__error">{errors.streetAddress}</span>
            ) : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Kota / kabupaten</span>
            <input
              type="text"
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              placeholder="Contoh: Bandung"
              maxLength={128}
            />
            {errors.city ? <span className="tp-info__error">{errors.city}</span> : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Kode pos</span>
            <input
              type="text"
              value={form.postcode}
              onChange={(event) => update('postcode', event.target.value)}
              placeholder="Contoh: 40123"
              maxLength={10}
            />
          </label>

          {submitError ? (
            <p className="tp-info__error tp-info__field--full" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="tp-info__form-actions">
            <button
              type="submit"
              className="tp-info__btn tp-info__btn--solid"
              disabled={submitting}
            >
              <StorefrontIcon />
              {submitting ? 'Mengirim...' : 'Ajukan Toko'}
            </button>
            <Link className="tp-info__btn" to={`/${routes.sellerCenter}`}>
              Batal
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}
