import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductBreadcrumbs } from '../../components/product-detail/ProductBreadcrumbs'
import { ProductGallery } from '../../components/product-detail/ProductGallery'
import { ProductPriceBlock } from '../../components/product-detail/ProductPriceBlock'
import { ProductSpecTable } from '../../components/product-detail/ProductSpecTable'
import { ProductStockLine } from '../../components/product-detail/ProductStockLine'
import { ProductPurchaseActions } from '../../components/product-detail/ProductPurchaseActions'
import { Skeleton } from '../../components/ui/Skeleton'
import { StateMessage } from '../../components/ui/StateMessage'
import { GridIcon, QrIcon, StorefrontIcon, TagIcon } from '../../components/ui/Icon'
import { htmlToPlainText } from '../../lib/sanitize-html'
import { routerBasename } from '../../lib/app-base'
import { truncate } from '../../lib/utils'
import { useProductDetail } from '../../features/product-detail/useProductDetail'
import type { ProductDetail } from '../../types/api'
import '../../components/product-detail/product-detail.css'

/**
 * Halaman detail produk.
 *
 * Sumber data tunggal ada di features/product-detail/api.ts. Halaman ini
 * hanya mengatur urutan tampilannya.
 *
 * URL halaman adalah /product-detail?id=<products_id>. Path-nya dibuang dari
 * ReactShell::$reactPaths sebagai daftar nama, bukan pola, supaya route PHP
 * lain tetap dipegang PHP. Konsekuensinya URL SEO produk
 * (/osc414/<slug>) tetap dilayani tema PHP; lihat catatan migrasi di
 * docs/README.md soal jembatan antara kedua bentuk URL itu.
 */

/** Label pengenal produk, hanya yang punya isi. */
const IDENTIFIER_LABELS: Record<string, string> = {
  ean: 'EAN',
  isbn: 'ISBN',
  asin: 'ASIN',
  upc: 'UPC',
}

export function ProductDetailPage() {
  const [params] = useSearchParams()
  const rawId = params.get('id')
  const productsId = useMemo(() => {
    const parsed = Number(rawId)
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null
  }, [rawId])

  const { product, loading, error, notFound, reload } = useProductDetail(productsId)

  useDocumentTitle(product, loading)

  if (loading) {
    return <DetailSkeleton />
  }

  if (notFound || !product) {
    return (
      <div className="tp-detail">
        <div className="surface">
          <StateMessage
            tone="error"
            title={notFound ? 'Produk tidak ditemukan' : 'Gagal memuat produk'}
            description={
              notFound
                ? 'Produk ini sudah tidak tersedia atau tautannya salah.'
                : (error ?? 'Terjadi kesalahan saat memuat data produk.')
            }
            action={{ label: 'Muat ulang', onClick: reload }}
          />
          <BackToHomeLink />
        </div>
      </div>
    )
  }

  return (
    <div className="tp-detail">
      <ProductBreadcrumbs trail={product.breadcrumb} productName={product.name} />

      <div className="tp-detail__grid">
        <div className="tp-detail__aside">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="tp-detail__main">
          <header>
            {product.manufacturer ? (
              <p className="tp-detail__brand">{product.manufacturer.name}</p>
            ) : null}
            <h1 className="tp-detail__title">{product.name}</h1>
            {product.model ? <p className="tp-detail__model">Model {product.model}</p> : null}
          </header>

          <ProductPriceBlock price={product.price} />
          <ProductStockLine stock={product.stock} />

          <ProductPurchaseActions productsId={product.products_id} stock={product.stock} />

          <DetailFacts product={product} />

          {product.summary ? <p className="tp-detail__summary">{product.summary}</p> : null}
        </div>
      </div>

      <ProductSpecTable specifications={product.specifications} />

      <DescriptionPanel product={product} />
    </div>
  )
}

/** Fakta ringkas: kategori, model, pabrikan, dan kode pengenal. */
function DetailFacts({ product }: { product: ProductDetail }) {
  const facts: Array<{ key: string; icon: ReactNode; label: string; value: string }> = []

  if (product.category) {
    facts.push({
      key: 'category',
      icon: <GridIcon />,
      label: 'Kategori',
      value: product.category.name,
    })
  }

  if (product.model) {
    facts.push({ key: 'model', icon: <TagIcon />, label: 'Model', value: product.model })
  }

  if (product.manufacturer) {
    facts.push({
      key: 'manufacturer',
      icon: <StorefrontIcon />,
      label: 'Merek',
      value: product.manufacturer.name,
    })
  }

  for (const [name, value] of Object.entries(product.identifiers)) {
    facts.push({
      key: name,
      icon: <QrIcon />,
      label: IDENTIFIER_LABELS[name] ?? name.toUpperCase(),
      value,
    })
  }

  if (facts.length === 0) {
    return null
  }

  return (
    <ul className="tp-detail__facts">
      {facts.map((fact) => (
        <li className="tp-fact" key={fact.key}>
          {fact.icon}
          <span>{fact.label}</span>
          <b>{truncate(fact.value, 28)}</b>
        </li>
      ))}
    </ul>
  )
}

/**
 * Deskripsi panjang.
 *
 * `products_description` disimpan sebagai HTML, jadi isinya diratakan dulu
 * lewat htmlToPlainText() sebelum dirender. Jangan tembakkan string itu ke
 * dangerouslySetInnerHTML; lihat lib/sanitize-html.ts.
 */
function DescriptionPanel({ product }: { product: ProductDetail }) {
  const text = useMemo(() => htmlToPlainText(product.description), [product.description])

  if (!text) {
    return null
  }

  return (
    <section className="tp-detail__main" style={{ marginTop: 'var(--tp-gap)' }}>
      <h2 className="tp-detail__section-title">Deskripsi Produk</h2>
      <p className="tp-detail__body">{text}</p>
    </section>
  )
}

/**
 * Judul tab mengikuti nama produk.
 *
 * Dipakai supaya hasil pencarian dan tab browser tidak selalu menampilkan
 * "osStore" untuk semua produk. Ditunda sampai data ada supaya tidak
 * menuliskan judul kosong.
 */
function useDocumentTitle(product: ProductDetail | null, loading: boolean) {
  useEffect(() => {
    if (loading || !product) {
      return
    }

    document.title = `${product.name} | osStore`

    return () => {
      document.title = 'osStore'
    }
  }, [product, loading])
}

function DetailSkeleton() {
  return (
    <div className="tp-detail">
      <div className="tp-detail__grid">
        <div className="tp-detail__aside">
          <div className="surface">
            <Skeleton className="tp-detail__skeleton-media" />
          </div>
        </div>

        <div className="tp-detail__main">
          <Skeleton className="tp-detail__skeleton-row" style={{ width: '35%' }} />
          <Skeleton
            className="tp-detail__skeleton-row"
            style={{ width: '85%', height: 22, marginTop: 10 }}
          />
          <Skeleton
            className="tp-detail__skeleton-row"
            style={{ width: '45%', height: 26, marginTop: 16 }}
          />
          <Skeleton
            className="tp-detail__skeleton-row"
            style={{ width: '30%', marginTop: 14 }}
          />
        </div>
      </div>

      <p className="visually-hidden" role="status">
        Memuat detail produk
      </p>
    </div>
  )
}

/** Link balik ke beranda, dipakai di state produk gagal dimuat. */
function BackToHomeLink() {
  return (
    <p className="tp-detail__back">
      <Link to={routerBasename}>Kembali ke beranda</Link>
    </p>
  )
}