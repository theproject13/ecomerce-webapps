import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { ProductGridSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { StateMessage } from '../../components/ui/StateMessage'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
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

type CategoryNode = CatalogCategory & { children: CatalogCategory[] }

/**
 * Susun pohon kategori dari daftar datar /storefront/categories.
 *
 * Backend mengirim induk dan anak dalam satu daftar (induk ikut walau produknya
 * hanya ada di sub-kategori), urutannya sudah sort_order lalu categories_id.
 * Induk ditentukan dari parent_id: kalau induknya tidak ada di daftar (mis.
 * kategori platform lain), kategori itu diperlakukan sebagai top-level supaya
 * tidak pernah hilang dari UI.
 */
function buildCategoryTree(categories: CatalogCategory[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>()

  for (const category of categories) {
    nodes.set(category.category_id, { ...category, children: [] })
  }

  const roots: CategoryNode[] = []

  for (const category of categories) {
    const node = nodes.get(category.category_id)

    if (!node) {
      continue
    }

    const parent = category.parent_id > 0 ? nodes.get(category.parent_id) : undefined

    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
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
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

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
        </div>

        {/*
          Browse kategori: satu kartu per kategori top-level, tiap kartu
          menampilkan sub-kategorinya lalu tautan "Produk <kategori>" untuk
          seluruh isinya (termasuk turunan). Klik menulis category_id ke query
          string, sama seperti tombol sort, jadi bisa di-bookmark.
        */}
        <section className="tp-catbrowse" aria-label="Semua kategori">
          <div className="tp-catbrowse__head">
            <h2 className="tp-catbrowse__title">Semua Kategori</h2>
            {categoryId ? (
              <button
                type="button"
                className="tp-chip tp-chip--icon"
                onClick={() => patchParams({ category_id: null, page: null })}
              >
                Semua
              </button>
            ) : null}
          </div>

          {categories.length === 0 ? (
            <Skeleton className="tp-catbrowse__loading" />
          ) : (
            <div className="tp-catbrowse__grid">
              {categoryTree.map((category) => (
                <article key={category.category_id} className="tp-catcard">
                  <h3 className="tp-catcard__title">{category.name}</h3>

                  <ul className="tp-catcard__list">
                    {category.children.map((child) => (
                      <li key={child.category_id}>
                        <button
                          type="button"
                          className={`tp-catcard__link${categoryId === child.category_id ? ' is-active' : ''}`}
                          onClick={() => patchParams({ category_id: child.category_id, page: null })}
                        >
                          <span className="tp-catcard__name">{child.name}</span>
                          <span className="tp-catcard__count">{child.product_count}</span>
                        </button>
                      </li>
                    ))}

                    <li>
                      <button
                        type="button"
                        className={`tp-catcard__link tp-catcard__link--all${categoryId === category.category_id ? ' is-active' : ''}`}
                        onClick={() => patchParams({ category_id: category.category_id, page: null })}
                      >
                        <span className="tp-catcard__name">Produk {category.name}</span>
                        <span className="tp-catcard__count">{category.product_count}</span>
                      </button>
                    </li>
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

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
