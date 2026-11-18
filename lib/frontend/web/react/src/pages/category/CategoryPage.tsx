import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { ProductGridSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { StateMessage } from '../../components/ui/StateMessage'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  HomeIcon,
} from '../../components/ui/Icon'
import { fetchCatalog } from '../../features/catalog/catalog-api'
import { useCategoryDetail } from '../../features/category/useCategoryDetail'
import { catalogUrl, imageUrl } from '../../lib/api-client'
import { categoryPath, routeUrl, routes } from '../../lib/routes'
import { truncate } from '../../lib/utils'
import type { CatalogSort, Product } from '../../types/api'
import './category.css'

const PER_PAGE = 12

const SORTS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga termurah' },
  { value: 'price_desc', label: 'Harga termahal' },
  { value: 'name_asc', label: 'Nama A-Z' },
  { value: 'name_desc', label: 'Nama Z-A' },
]

function readPositiveInt(value: string | null): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * Halaman landing kategori.
 *
 * URL: /category-detail?id=<categories_id> (lihat routes.ts dan
 * ReactShell::$reactPaths). Informasi kategori (deskripsi, banner, anak,
 * breadcrumb) berasal dari /api/category/detail; daftar produknya memakai
 * /api/storefront/products?category_id= yang sama dengan halaman katalog,
 * sehingga paginasi, sort, dan scoping platform konsisten.
 *
 * Semua state tampilan ada di query string supaya halaman bisa di-bookmark dan
 * di-refresh tanpa kehilangan posisi shopper.
 */
export function CategoryPage() {
  const [params, setParams] = useSearchParams()

  const categoryId = readPositiveInt(params.get('id'))
  const sort = (SORTS.some((item) => item.value === params.get('sort'))
    ? params.get('sort')
    : 'newest') as CatalogSort
  const page = readPositiveInt(params.get('page')) ?? 1

  const { category, loading, error, notFound, reload } = useCategoryDetail(categoryId)

  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')

  useEffect(() => {
    if (categoryId === null) {
      return
    }

    document.title = category?.name ? `${category.name} | osStore` : 'osStore'

    return () => {
      document.title = 'osStore'
    }
  }, [category?.name, categoryId])

  useEffect(() => {
    if (categoryId === null) {
      setItems([])
      setTotal(0)
      setTotalPages(1)
      setProductsLoading(false)
      return
    }

    const controller = new AbortController()

    setProductsLoading(true)
    setProductsError('')

    fetchCatalog({ page, perPage: PER_PAGE, sort, scope: 'all', categoryId }, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) {
          return
        }

        setItems(payload.items)
        setTotal(payload.meta.total_count)
        setTotalPages(payload.meta.total_pages)

        // Halaman di luar jangkauan dipindahkan ke halaman terakhir supaya
        // shopper tidak mendarat di daftar kosong tanpa penjelasan.
        if (payload.meta.page !== page) {
          const merged = new URLSearchParams(params)
          merged.delete('page')
          setParams(merged, { replace: true })
        }
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === 'AbortError') {
          return
        }

        setItems([])
        setTotal(0)
        setTotalPages(1)
        setProductsError(cause instanceof Error ? cause.message : 'Gagal memuat produk.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProductsLoading(false)
        }
      })

    return () => controller.abort()
  }, [categoryId, page, sort])

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

  const trail = useMemo(() => {
    if (!category) {
      return []
    }

    return category.breadcrumb
  }, [category])

  if (loading) {
    return <CategorySkeleton />
  }

  if (notFound || !category) {
    return (
      <div className="tp-page">
        <section className="tp-section">
          <StateMessage
            tone="error"
            title={notFound ? 'Kategori tidak ditemukan' : 'Gagal memuat kategori'}
            description={
              notFound
                ? 'Kategori ini tidak tersedia atau tautannya salah.'
                : (error || 'Terjadi kesalahan saat memuat kategori.')
            }
            action={{ label: 'Muat ulang', onClick: reload }}
          />
          <p className="tp-category__back-home">
            <Link to={catalogUrl(routes.home)}>Kembali ke beranda</Link>
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="tp-page">
      <section className="tp-section">
        <nav className="tp-category__crumbs" aria-label="Breadcrumb">
          <a href={catalogUrl(routes.home)} className="tp-category__crumb">
            <HomeIcon />
            Beranda
          </a>
          {trail.map((step) => (
            <span key={step.category_id} className="tp-category__crumb-sep">
              <ChevronRightIcon />
              <a href={catalogUrl(categoryPath(step.category_id))} className="tp-category__crumb">
                {step.name}
              </a>
            </span>
          ))}
        </nav>

        <div className="tp-category__hero">
          {category.image ? (
            <img
              className="tp-category__hero-img"
              src={imageUrl(category.image)}
              alt={category.name}
            />
          ) : null}
          <div className="tp-category__hero-body">
            <h1 className="tp-category__title">{category.name}</h1>
            {category.description ? (
              <p className="tp-category__desc">{truncate(category.description, 220)}</p>
            ) : null}
          </div>
        </div>

        {category.children.length > 0 ? (
          <div className="tp-category__children">
            {category.children.map((child) => (
              <a
                key={child.category_id}
                className="tp-category__child"
                href={catalogUrl(categoryPath(child.category_id))}
              >
                <span className="tp-category__child-media" aria-hidden="true">
                  {child.image ? (
                    <img src={imageUrl(child.image)} alt="" loading="lazy" />
                  ) : (
                    <GridIcon />
                  )}
                </span>
                <span className="tp-category__child-name">{child.name}</span>
              </a>
            ))}
          </div>
        ) : null}

        <div className="tp-section__header">
          <h2>Produk {category.name}</h2>
          <a href={routeUrl(routes.search)}>
            Lihat Semua
            <ChevronRightIcon />
          </a>
        </div>

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

        <p className="tp-catalog__meta">
          {productsLoading ? (
            <Skeleton className="tp-catalog__meta-line" />
          ) : (
            <>
              {total} produk
              {totalPages > 1 ? ` - halaman ${page} dari ${totalPages}` : ''}
            </>
          )}
        </p>

        {productsError ? (
          <StateMessage
            tone="error"
            title="Gagal memuat produk"
            description={productsError}
            action={{ label: 'Coba lagi', onClick: () => patchParams({ page: null }) }}
          />
        ) : null}

        {!productsError && productsLoading ? <ProductGridSkeleton count={PER_PAGE} /> : null}

        {!productsError && !productsLoading && items.length === 0 ? (
          <StateMessage
            tone="empty"
            title="Belum ada produk"
            description={`Kategori ${category.name} belum punya produk aktif.`}
          />
        ) : null}

        {!productsError && !productsLoading && items.length > 0 ? (
          <div className="tp-product-grid">
            {items.map((product) => (
              <ProductCard key={product.products_id} product={product} />
            ))}
          </div>
        ) : null}

        {!productsLoading && !productsError && totalPages > 1 ? (
          <nav className="tp-pager" aria-label="Paginasi kategori">
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

function CategorySkeleton() {
  return (
    <div className="tp-page">
      <section className="tp-section">
        <Skeleton className="tp-category__skeleton-crumbs" />
        <div className="tp-category__hero">
          <Skeleton className="tp-category__skeleton-hero" />
        </div>
        <Skeleton className="tp-category__skeleton-title" />
        <ProductGridSkeleton count={PER_PAGE} />
      </section>
    </div>
  )
}
