import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { ProductGridSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { StateMessage } from '../../components/ui/StateMessage'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  GridIcon,
  SearchIcon,
} from '../../components/ui/Icon'
import { fetchCatalog, fetchCatalogCategories } from '../../features/catalog/catalog-api'
import { channelRouteUrl, routes } from '../../lib/routes'
import type { CatalogCategory, CatalogScope, CatalogSort, Product } from '../../types/api'
import './catalog.css'

const PER_PAGE = 12

const SORTS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga termurah' },
  { value: 'price_desc', label: 'Harga termahal' },
  { value: 'name_asc', label: 'Nama A-Z' },
  { value: 'name_desc', label: 'Nama Z-A' },
]

type Props = {
  /** Route catalog/featured-products memaksa scope featured. */
  defaultScope?: CatalogScope
}

function readPositiveInt(value: string | null): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Halaman katalog kanal.
 *
 * Bedanya dari homepage: sumbernya /api/storefront/products, yaitu seluruh
 * keanggotaan kanal dari platforms_products, bukan hanya produk featured.
 * Karena itu platform_id tidak pernah dikirim dari klien; server mengambilnya
 * sendiri dari request lewat platform::currentId().
 *
 * Semua state filter ada di query string supaya halaman bisa di-bookmark,
 * dibagikan, dan di-refresh tanpa kehilangan posisi shopper. URL kanal
 * (/furniture/catalog/all-products) tetap sama dengan URL tema PHP, jadi
 * redirect tidak diperlukan.
 */
export function CatalogPage({ defaultScope = 'all' }: Props) {
  const [params, setParams] = useSearchParams()

  const scope: CatalogScope = params.get('scope') === 'featured' ? 'featured' : defaultScope
  const sort = (SORTS.some((item) => item.value === params.get('sort'))
    ? params.get('sort')
    : 'newest') as CatalogSort
  const categoryId = readPositiveInt(params.get('category_id'))
  const keywords = params.get('keywords') ?? ''
  const page = readPositiveInt(params.get('page')) ?? 1

  const [draftKeywords, setDraftKeywords] = useState(keywords)
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<CatalogCategory[]>([])

  /**
   * Ubah filter dan set Params. Nilai null menghapus parameter supaya URL
   * tidak menumpuk ?category_id=&sort=null.
   */
  const patchParams = (next: Record<string, string | number | null>) => {
    const merged = new URLSearchParams(params)

    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') {
        merged.delete(key)
      } else {
        merged.set(key, String(value))
      }
    }

    setParams(merged, { replace: true })
  }

  // Kategori hanya bergantung pada platform, jadi diambil sekali.
  useEffect(() => {
    const controller = new AbortController()

    fetchCatalogCategories(controller.signal)
      .then(setCategories)
      .catch(() => setCategories([]))

    return () => controller.abort()
  }, [])

  useEffect(() => {
    setDraftKeywords(keywords)
  }, [keywords])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError('')

    fetchCatalog({ page, perPage: PER_PAGE, sort, scope, keywords, categoryId }, controller.signal)
      .then((payload) => {
        setItems(payload.items)
        setTotal(payload.meta.total_count)
        setTotalPages(payload.meta.total_pages)

        // Halaman di luar jangkauan dipindahkan ke halaman terakhir supaya
        // shopper tidak mendarat di daftar kosong tanpa penjelasan.
        if (payload.meta.page !== page) {
          patchParams({ page: payload.meta.page })
        }
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === 'AbortError') {
          return
        }

        setItems([])
        setTotal(0)
        setTotalPages(1)
        setError(cause instanceof Error ? cause.message : 'Gagal memuat katalog.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [page, sort, scope, keywords, categoryId])

  const title = useMemo(() => {
    if (keywords !== '') {
      return `Hasil pencarian "${keywords}"`
    }

    return scope === 'featured' ? 'Produk Pilihan' : 'Semua Produk'
  }, [keywords, scope])

  const selectedCategory = categories.find((item) => item.category_id === categoryId)

  return (
    <div className="tp-page">
      <section className="tp-section">
        <div className="tp-section__header">
          <h1 className="tp-catalog__title">{title}</h1>
          <a href={channelRouteUrl(routes.search)}>
            Kanal utama
            <ChevronRightIcon />
          </a>
        </div>

        {/*
          Kolom cari memakai parameter keywords, nama yang sama dengan tema PHP.
          Submit menulis ke query string, bukan ke state lokal, supaya hasil
          pencarian bisa dibagikan lewat link.
        */}
        <form
          className="tp-catalog__search"
          onSubmit={(event) => {
            event.preventDefault()
            patchParams({ keywords: draftKeywords.trim(), page: null })
          }}
        >
          <input
            type="search"
            value={draftKeywords}
            onChange={(event) => setDraftKeywords(event.target.value)}
            placeholder="Cari produk di kanal ini"
            aria-label="Cari produk"
            maxLength={100}
          />
          <button type="submit" aria-label="Cari">
            <SearchIcon />
          </button>
        </form>

        <div className="tp-filter-bar">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`tp-chip${sort === option.value ? ' tp-chip--active' : ''}`}
              onClick={() => patchParams({ sort: option.value, page: null })}
            >
              {option.label}
            </button>
          ))}

          <span className="tp-filter-bar__spacer" />

          <label className="tp-chip tp-chip--icon">
            <FilterIcon />
            <select
              value={categoryId ?? ''}
              onChange={(event) => {
                const value = event.target.value

                patchParams({ category_id: value === '' ? null : value, page: null })
              }}
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {categories.map((item) => (
                <option key={item.category_id} value={item.category_id}>
                  {item.name} ({item.product_count})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="tp-catalog__meta">
          {loading ? (
            <Skeleton className="tp-catalog__meta-line" />
          ) : (
            <>
              {total} produk
              {selectedCategory ? ` di ${selectedCategory.name}` : ''}
              {totalPages > 1 ? ` - halaman ${page} dari ${totalPages}` : ''}
            </>
          )}
        </p>

        {error ? (
          <StateMessage
            tone="error"
            title="Gagal memuat katalog"
            description={error}
            action={{ label: 'Coba lagi', onClick: () => patchParams({ page: null }) }}
          />
        ) : null}

        {!error && loading ? <ProductGridSkeleton count={PER_PAGE} /> : null}

        {!error && !loading && items.length === 0 ? (
          <StateMessage
            tone="empty"
            title="Belum ada produk"
            description={
              keywords !== ''
                ? `Tidak ada produk yang cocok dengan "${keywords}" di kanal ini.`
                : 'Kanal ini belum punya produk aktif.'
            }
          />
        ) : null}

        {!error && !loading && items.length > 0 ? (
          <div className="tp-product-grid">
            {items.map((product) => (
              <ProductCard key={product.products_id} product={product} />
            ))}
          </div>
        ) : null}

        {!loading && !error && totalPages > 1 ? (
          <nav className="tp-pager" aria-label="Paginasi katalog">
            <button
              type="button"
              className="tp-chip tp-chip--icon"
              disabled={page <= 1}
              onClick={() => patchParams({ page: page - 1 })}
            >
              <ChevronLeftIcon />
              Sebelumnya
            </button>

            <span className="tp-pager__page">
              <GridIcon />
              {page} / {totalPages}
            </span>

            <button
              type="button"
              className="tp-chip tp-chip--icon"
              disabled={page >= totalPages}
              onClick={() => patchParams({ page: page + 1 })}
            >
              Berikutnya
              <ChevronRightIcon />
            </button>
          </nav>
        ) : null}
      </section>

      <div className="tp-spacer-bottom" />
    </div>
  )
}
