import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, StorefrontIcon, UserIcon } from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { imageUrl } from '../../lib/api-client'
import { routes } from '../../lib/routes'
import {
  createSellerProduct,
  fetchSellerCategories,
  fetchSellerProducts,
  fetchSellerStore,
  type SellerCategory,
  type SellerProduct,
  type SellerStoreResponse,
} from '../../features/seller/seller-api'
import './info.css'

type ProductForm = {
  productName: string
  categoryId: string
  price: string
  quantity: string
  description: string
}

const EMPTY_FORM: ProductForm = {
  productName: '',
  categoryId: '',
  price: '',
  quantity: '',
  description: '',
}

type FieldErrors = Partial<Record<keyof ProductForm | 'images', string>>

function rupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function statusClass(status: number): string {
  if (status === 1) {
    return 'tp-info__badge tp-info__badge--approved'
  }
  if (status === 2) {
    return 'tp-info__badge tp-info__badge--rejected'
  }

  return 'tp-info__badge tp-info__badge--pending'
}

export function SellerDashboardPage() {
  const { meta, session } = useStorefront()
  const [storeData, setStoreData] = useState<SellerStoreResponse['items'] | null>(null)
  const [categories, setCategories] = useState<SellerCategory[]>([])
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const store = storeData?.store ?? null
  const application = storeData?.application ?? null

  useEffect(() => {
    if (!session.logged_in) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const storeResponse = await fetchSellerStore()
        if (cancelled) {
          return
        }
        setStoreData(storeResponse.items)

        if (!storeResponse.items.store) {
          return
        }

        const [categoryResponse, productResponse] = await Promise.all([
          fetchSellerCategories(),
          fetchSellerProducts(),
        ])
        if (cancelled) {
          return
        }
        setCategories(categoryResponse.items)
        setProducts(productResponse.items)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat data toko.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [session.logged_in])

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setFormError(null)
  }

  function handleFiles(selected: FileList | null) {
    const nextFiles = selected ? Array.from(selected) : []
    setFiles(nextFiles)
    setErrors((current) => ({ ...current, images: undefined }))
    setFormError(null)
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const price = Number(form.price)
    const quantity = Number(form.quantity)

    if (form.productName.trim().length < 3) {
      next.productName = 'Nama produk minimal 3 karakter.'
    }
    if (!form.categoryId) {
      next.categoryId = 'Pilih kategori produk.'
    }
    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = 'Harga harus lebih dari 0.'
    }
    if (form.quantity === '' || Number.isNaN(quantity) || quantity < 0) {
      next.quantity = 'Stok tidak boleh negatif.'
    }
    if (form.description.trim() === '') {
      next.description = 'Deskripsi produk wajib diisi.'
    }
    if (files.length < 1) {
      next.images = 'Unggah minimal 1 foto produk.'
    } else if (files.length > 5) {
      next.images = 'Maksimal 5 foto per produk.'
    } else if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      next.images = 'Ukuran tiap foto maksimal 5 MB.'
    }

    return next
  }

  async function refreshProducts() {
    const response = await fetchSellerProducts()
    setProducts(response.items)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) {
      return
    }

    setSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)

    try {
      const payload = await createSellerProduct(
        {
          productName: form.productName.trim(),
          categoryId: Number(form.categoryId),
          price: form.price,
          quantity: form.quantity,
          description: form.description.trim(),
        },
        files,
      )

      if (!payload.ok) {
        const serverErrors = payload.field_errors ?? {}
        setErrors({
          productName: serverErrors.product_name,
          categoryId: serverErrors.category_id,
          price: serverErrors.price,
          quantity: serverErrors.quantity,
          description: serverErrors.description,
          images: serverErrors.images,
        })
        setFormError(payload.error || 'Produk gagal dikirim.')
        return
      }

      setForm(EMPTY_FORM)
      setFiles([])
      if (fileInput.current) {
        fileInput.current.value = ''
      }
      setSuccessMessage('Produk berhasil dikirim dan menunggu persetujuan admin.')
      await refreshProducts()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Produk gagal dikirim.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!session.logged_in) {
    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Toko Saya</p>
          <h1>Masuk dulu untuk mengelola toko</h1>
          <p className="tp-info__lead">
            Kamu perlu akun {meta.store_name} untuk membuka dashboard toko.
          </p>
          <div className="tp-info__actions">
            <Link
              className="tp-info__btn"
              to={`/login?next=${encodeURIComponent(routes.sellerDashboard)}`}
            >
              <UserIcon />
              Masuk
            </Link>
            <Link
              className="tp-info__btn tp-info__btn--ghost"
              to={`/register?next=${encodeURIComponent(routes.sellerDashboard)}`}
            >
              Belum punya akun? Daftar
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Toko Saya</p>
          <h1>Memuat data toko...</h1>
        </section>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Toko Saya</p>
          <h1>Data toko gagal dimuat</h1>
          <p className="tp-info__lead">{loadError}</p>
          <div className="tp-info__actions">
            <Link className="tp-info__btn" to={`/${routes.sellerCenter}`}>
              Kembali ke Seller Center
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!store) {
    const canReapply = !application || application.status === 2

    return (
      <div className="tp-info">
        <section className="tp-info__hero">
          <p className="tp-info__eyebrow">Toko Saya</p>
          <h1>Toko belum aktif</h1>
          <p className="tp-info__lead">
            {application
              ? `Pengajuan ${application.store_name} berstatus ${application.status_label}.`
              : 'Kamu belum mengajukan toko.'}
          </p>
          <div className="tp-info__actions">
            <Link
              className="tp-info__btn"
              to={`/${canReapply ? routes.sellerOnboarding : routes.sellerCenter}`}
            >
              {canReapply ? 'Ajukan Toko' : 'Kembali ke Seller Center'}
              <ChevronRightIcon />
            </Link>
            {application ? (
              <Link className="tp-info__btn tp-info__btn--ghost" to={`/${routes.care}`}>
                Hubungi {meta.store_name} Care
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="tp-info">
      <section className="tp-info__hero">
        <p className="tp-info__eyebrow">Toko Saya</p>
        <h1>{store.store_name}</h1>
        <p className="tp-info__lead">
          Unggah produk baru atau pantau status moderasi produk toko kamu di sini.
        </p>
      </section>

      <section className="tp-info__section">
        <h2>Tambah Produk</h2>
        <p>Produk akan tampil di toko setelah disetujui admin.</p>

        <form className="tp-info__form" onSubmit={handleSubmit} noValidate>
          <label className="tp-info__field tp-info__field--full">
            <span className="tp-info__label">Nama produk</span>
            <input
              type="text"
              value={form.productName}
              onChange={(event) => update('productName', event.target.value)}
              placeholder="Contoh: Sepatu Sneakers Pria"
              maxLength={255}
            />
            {errors.productName ? (
              <span className="tp-info__error">{errors.productName}</span>
            ) : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Kategori</span>
            <select
              value={form.categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {'\u00A0\u00A0'.repeat(category.depth)}
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <span className="tp-info__error">{errors.categoryId}</span>
            ) : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Harga (Rp)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(event) => update('price', event.target.value)}
              placeholder="Contoh: 150000"
            />
            {errors.price ? <span className="tp-info__error">{errors.price}</span> : null}
          </label>

          <label className="tp-info__field">
            <span className="tp-info__label">Stok</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(event) => update('quantity', event.target.value)}
              placeholder="Contoh: 10"
            />
            {errors.quantity ? <span className="tp-info__error">{errors.quantity}</span> : null}
          </label>

          <label className="tp-info__field tp-info__field--full">
            <span className="tp-info__label">Deskripsi produk</span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Jelaskan bahan, ukuran, kondisi, dan keunggulan produk"
              rows={4}
              maxLength={5000}
            />
            {errors.description ? (
              <span className="tp-info__error">{errors.description}</span>
            ) : null}
          </label>

          <label className="tp-info__field tp-info__field--full">
            <span className="tp-info__label">Foto produk (1-5 foto)</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />
            <span className="tp-info__hint">
              {files.length > 0
                ? `${files.length} foto dipilih.`
                : 'Format JPG, PNG, GIF, atau WEBP. Maksimal 5 MB per foto.'}
            </span>
            {errors.images ? <span className="tp-info__error">{errors.images}</span> : null}
          </label>

          {formError ? (
            <p className="tp-info__error tp-info__field--full" role="alert">
              {formError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="tp-info__success tp-info__field--full" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="tp-info__form-actions">
            <button
              type="submit"
              className="tp-info__btn tp-info__btn--solid"
              disabled={submitting}
            >
              <StorefrontIcon />
              {submitting ? 'Mengirim...' : 'Kirim Produk'}
            </button>
            <Link className="tp-info__btn" to={`/${routes.sellerCenter}`}>
              Seller Center
            </Link>
          </div>
        </form>
      </section>

      <section className="tp-info__section">
        <h2>Produk Saya</h2>
        <p>Status produk berubah setelah admin meninjau pengajuan.</p>

        {products.length === 0 ? (
          <div className="tp-info__notice">Belum ada produk. Unggah produk pertamamu di atas.</div>
        ) : (
          <div className="tp-info__product-list">
            {products.map((product) => (
              <article key={product.seller_products_id} className="tp-info__product">
                {product.image_url ? (
                  <img
                    className="tp-info__product-image"
                    src={imageUrl(product.image_url)}
                    alt={product.products_name || 'Produk'}
                    loading="lazy"
                  />
                ) : (
                  <div className="tp-info__product-image tp-info__product-image--empty">
                    Tanpa foto
                  </div>
                )}

                <div className="tp-info__product-body">
                  <div className="tp-info__product-heading">
                    <h3>{product.products_name || `Produk #${product.products_id}`}</h3>
                    <span className={statusClass(product.status)}>{product.status_label}</span>
                  </div>
                  <p className="tp-info__product-price">{rupiah(product.price_idr)}</p>
                  <p className="tp-info__product-meta">Stok: {product.products_quantity}</p>
                  {product.reject_reason ? (
                    <p className="tp-info__error">Alasan ditolak: {product.reject_reason}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
