import { useEffect, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { fetchProductDetail } from './api'
import type { ProductDetail, ProductDetailMeta } from '../../types/api'

export type ProductDetailState = {
  product: ProductDetail | null
  meta: ProductDetailMeta | null
  loading: boolean
  error: string | null
  /** True kalau produknya memang ada tapi datanya tidak bisa dimuat. */
  notFound: boolean
  reload: () => void
}

/**
 * Satu produk untuk halaman detail.
 *
 * Pollanya sama dengan useDashboard: AbortController dipakai supaya pindah
 * halaman tidak menimpa state dengan response lama, dan komponen yang
 * di-unmount tidak melakukan update setelah request selesai.
 */
export function useProductDetail(productsId: number | null): ProductDetailState {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [meta, setMeta] = useState<ProductDetailMeta | null>(null)
  const [loading, setLoading] = useState(Boolean(productsId))
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!productsId) {
      setProduct(null)
      setMeta(null)
      setLoading(false)
      setError(null)
      setNotFound(true)
      return
    }

    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError(null)
    setNotFound(false)

    fetchProductDetail(productsId, controller.signal)
      .then((payload) => {
        if (!active) {
          return
        }
        setProduct(payload.items)
        setMeta(payload.meta)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active || (cause as Error)?.name === 'AbortError') {
          return
        }

        const status = cause instanceof ApiError ? cause.status : 0
        setProduct(null)
        setMeta(null)
        setNotFound(status === 404)
        setError((cause as Error)?.message ?? 'Gagal memuat produk.')
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [productsId, nonce])

  return {
    product,
    meta,
    loading,
    error,
    notFound,
    reload: () => setNonce((value) => value + 1),
  }
}