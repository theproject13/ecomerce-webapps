import { cn, formatCurrency } from '../../lib/utils'
import type { ProductPrice } from '../../types/api'

type Props = {
  price: ProductPrice
}

/**
 * Blok harga.
 *
 * Format memakai formatCurrency() yang sudah dipakai kartu produk, jadi
 * storefront konsisten. `price.currency` dari backend sengaja tidak dipakai
 * untuk format; lihat lib/currency.ts soal kenapa.
 *
 * Harga coret hanya ditampilkan kalau `has_special` benar-benar true. Nilai
 * `old_value` yang lebih kecil dari `value` berarti datacore tidak konsisten,
 * jadi dalam kasus itu harga coret disembunyikan daripada menampilkan angka
 * yang menipu.
 */
export function ProductPriceBlock({ price }: Props) {
  const showOldPrice = price.has_special && price.old_value > price.value
  const saving = showOldPrice ? price.old_value - price.value : 0
  const savingPercent = showOldPrice && price.old_value > 0
    ? Math.round((saving / price.old_value) * 100)
    : 0

  return (
    <div className="tp-price-block">
      <div className="tp-price-block__main">
        <span className={cn('tp-price-block__value', showOldPrice && 'is-discounted')}>
          {formatCurrency(price.value)}
        </span>

        {showOldPrice ? (
          <span className="tp-price-block__old">{formatCurrency(price.old_value)}</span>
        ) : null}

        {savingPercent > 0 ? (
          <span className="tp-price-block__badge">-{savingPercent}%</span>
        ) : null}
      </div>
    </div>
  )
}