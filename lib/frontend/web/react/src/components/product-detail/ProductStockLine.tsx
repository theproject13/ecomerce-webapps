import { cn } from '../../lib/utils'
import type { ProductStock } from '../../types/api'

type Props = {
  stock: ProductStock
}

/**
 * Status ketersediaan.
 *
 * Label diambil dari `stock_code` yang dihitung helper StockIndication, jadi
 * alasan produk tidak bisa dibeli (habis, tidak tersedia di kanal, atau
 * dibatasi gudang) muncul apa adanya. Kalau `stock_code` kosong, turunkan ke
 * status sederhana dari `in_stock`.
 *
 * Jumlah stok ditampilkan sebagai informasi tambahan saja. Tombol beli
 * dirender terpisah oleh ProductPurchaseActions, yang butuh can_add_to_cart.
 */
export function ProductStockLine({ stock }: Props) {
  const label = stock.stock_code || (stock.in_stock ? 'Tersedia' : 'Stok habis')

  return (
    <div className="tp-stock">
      <span
        className={cn('tp-stock__dot', stock.in_stock ? 'is-in' : 'is-out')}
        aria-hidden="true"
      />
      <span className="tp-stock__label">{label}</span>
      {stock.in_stock && stock.quantity > 0 ? (
        <span className="tp-stock__qty">Sisa {stock.quantity}</span>
      ) : null}
    </div>
  )
}