import { useState } from 'react'
import { addToCart } from '../../features/cart/cart-api'
import type { ProductStock } from '../../types/api'

type Props = {
  productsId: number
  stock: ProductStock
}

/** Batas yang sama dengan CartController::MAX_QTY, biar tidak ada yang diam-diam dipotong. */
const MAX_QTY = 99

type Pending = 'cart' | 'checkout' | null

/**
 * Jumlah dan tombol beli untuk halaman detail produk.
 *
 * Qty diinput di sini, tapi endpoint /api/cart/add juga menjepitnya ke 1..99,
 * jadi server tetap sumber kebenaran. Input ini hanya menutup kesalahan ketik.
 *
 * Kedua tombol memanggil endpoint yang sama; yang berbeda hanya tujuan setelah
 * berhasil: "Tambah ke keranjang" ke halaman keranjang, "Beli sekarang" ke
 * checkout. Navigasi dimuat ulang supaya PHP menghitung ulang harga, pajak,
 * dan badge keranjang dari session yang sama.
 */
export function ProductPurchaseActions({ productsId, stock }: Props) {
  const [qty, setQty] = useState(1)
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!stock.can_add_to_cart) {
    return null
  }

  const busy = pending !== null

  function changeQty(next: number) {
    if (!Number.isFinite(next)) {
      return
    }
    setQty(Math.min(MAX_QTY, Math.max(1, Math.trunc(next))))
    setMessage(null)
  }

  async function submit(target: Exclude<Pending, null>) {
    setPending(target)
    setMessage(null)

    try {
      const payload = await addToCart(productsId, qty)
      window.location.assign(
        target === 'checkout' ? payload.redirect.checkout : payload.redirect.cart,
      )
    } catch (error) {
      setPending(null)
      setMessage(error instanceof Error ? error.message : 'Gagal menambah ke keranjang.')
    }
  }

  return (
    <form
      className="tp-buy"
      onSubmit={(event) => {
        event.preventDefault()
        void submit('cart')
      }}
    >
      <div className="tp-buy__qty">
        <label htmlFor="tp-qty">Jumlah</label>
        <input
          id="tp-qty"
          name="qty"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QTY}
          step={1}
          value={qty}
          disabled={busy}
          onChange={(event) => changeQty(Number(event.target.value))}
        />
      </div>

      <div className="tp-buy__actions">
        <button type="submit" className="tp-buy__btn tp-buy__btn--primary" disabled={busy}>
          {pending === 'cart' ? 'Menyimpan...' : 'Tambah ke keranjang'}
        </button>
        <button
          type="button"
          className="tp-buy__btn tp-buy__btn--ghost"
          disabled={busy}
          onClick={() => void submit('checkout')}
        >
          {pending === 'checkout' ? 'Memproses...' : 'Beli sekarang'}
        </button>
      </div>

      <p className="tp-buy__message" role="status" aria-live="polite">
        {message ?? ''}
      </p>
    </form>
  )
}
