import { catalogUrl, imageUrl } from '../../lib/api-client'
import { productPath } from '../../lib/routes'
import { resolveDiscount, soldLabel } from '../../lib/pricing'
import { formatCompactNumber, formatCurrency, initials, truncate } from '../../lib/utils'
import type { Product } from '../../types/api'
import { ChevronRightIcon, MapPinIcon, StarIcon, StoreLogo } from '../ui/Icon'
import './product.css'

type Props = {
  product: Product
  variant?: 'grid' | 'scroll'
}

/**
 * Kartu produk.
 *
 * Perhitungan diskon, harga coret, dan label terjual semuanya di
 * lib/pricing.ts, bukan di sini. Komponen ini cuma merender.
 *
 * Field opsional (harga coret, rating, terjual, lokasi, seller) masih kosong
 * dari backend, dan sementara diisi data contoh di
 * features/catalog/demo-card-data.ts. Begitu backend mengirim data asli, file
 * contoh itu bisa dimatikan tanpa menyentuh komponen ini.
 */
export function ProductCard({ product, variant = 'grid' }: Props) {
  // Selalu ke halaman detail React, bukan product.url dari API. product.url
  // berisi URL SEO yang dilayani PHP theme, sehingga klik kartu mendarat di
  // luar React.
  const href = catalogUrl(productPath(product.products_id))

  const outOfStock = !product.in_stock || product.quantity <= 0
  const discount = resolveDiscount(product)
  const sold = soldLabel(product.sold)
  const hasDiscount = discount.hasDiscount

  return (
    <article className={`tp-card tp-card--${variant}${hasDiscount ? ' tp-card--sale' : ''}`}>
      <a className="tp-card__link" href={href} aria-label={product.name}>
        <div className="tp-card__media">
          {product.image ? (
            <img src={imageUrl(product.image)} alt={product.name} loading="lazy" />
          ) : (
            <span className="tp-card__placeholder" aria-hidden="true">
              {initials(product.name)}
            </span>
          )}

          <div className="tp-card__badges">
            {hasDiscount ? (
              <span className="tp-card__badge tp-card__badge--discount">{discount.percent}%</span>
            ) : null}
            {outOfStock ? (
              <span className="tp-card__badge tp-card__badge--muted">Habis</span>
            ) : null}
          </div>

          {hasDiscount ? (
            <span className="tp-card__ribbon" aria-hidden="true">
              Diskon
            </span>
          ) : null}
        </div>

        <div className="tp-card__body">
          <h3 className="tp-card__name" title={product.name}>
            {truncate(product.name, 60)}
          </h3>

          <div className="tp-card__price">
            <span className="tp-card__price-now">{formatCurrency(discount.finalPrice)}</span>
            {hasDiscount && discount.listPrice ? (
              <span className="tp-card__price-was">{formatCurrency(discount.listPrice)}</span>
            ) : null}
          </div>

          <div className="tp-card__meta">
            {product.rating != null ? (
              <span className="tp-card__rating">
                <StarIcon />
                <b>{product.rating.toFixed(1)}</b>
              </span>
            ) : null}

            {product.rating_count ? (
              <span className="tp-card__muted">({formatCompactNumber(product.rating_count)})</span>
            ) : null}

            {sold ? <span className="tp-card__muted">{sold} terjual</span> : null}
          </div>

          {product.location ? (
            <div className="tp-card__row tp-card__row--muted">
              <MapPinIcon />
              <span>{product.location}</span>
            </div>
          ) : null}

          <div className="tp-card__row">
            <span className="tp-card__stock">Stok {formatCompactNumber(product.quantity)}</span>
            {product.in_stock && !outOfStock ? (
              <span className="tp-card__stock tp-card__stock--ok">Tersedia</span>
            ) : null}
          </div>

          {product.seller ? (
            <span className="tp-card__seller">
              <StoreLogo className="tp-card__seller-logo" />
              <span className="tp-card__seller-name">{truncate(product.seller.name, 22)}</span>
              {product.seller.verified ? (
                <span className="tp-card__verified" title="Toko terverifikasi">
                  <ChevronRightIcon />
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      </a>
    </article>
  )
}