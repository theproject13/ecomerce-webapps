import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchCart } from './cart-api'
import type { CartPayload } from './cart-api'

type CartState = {
  /** Jumlah item di keranjang, untuk badge header dan bottom nav. */
  count: number
  currency: string
  loading: boolean
  /** Panggil setelah add/update/remove supaya badge ikut berubah. */
  refresh: () => void
  /** Simpan payload terakhir, supaya halaman cart tidak fetch dua kali. */
  payload: CartPayload | null
  setPayload: (payload: CartPayload) => void
}

const CartContext = createContext<CartState>({
  count: 0,
  currency: 'IDR',
  loading: false,
  refresh: () => undefined,
  payload: null,
  setPayload: () => undefined,
})

/**
 * Jumlah item keranjang untuk seluruh halaman.
 *
 * Satu provider supaya badge header, bottom nav, dan halaman cart membaca
 * angka yang sama. Diisi dari session PHP lewat GET /api/cart/index, jadi
 * badge ikut benar setelah shopper menambah atau menghapus item, dan setelah
 * navigasi ke halaman yang sama.
 *
 * Kegagalan tidak dialingatkan: badge 0 lebih baik daripada halaman error
 * hanya karena satu request tambahan gagal.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<CartPayload | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    const controller = new AbortController()
    setLoading(true)

    fetchCart()
      .then(setPayload)
      .catch(() => undefined)
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [])

  useEffect(load, [load])

  const value = useMemo<CartState>(
    () => ({
      count: payload?.meta.count ?? 0,
      currency: payload?.meta.currency ?? 'IDR',
      loading,
      refresh: load,
      payload,
      setPayload,
    }),
    [payload, loading, load]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  return useContext(CartContext)
}
