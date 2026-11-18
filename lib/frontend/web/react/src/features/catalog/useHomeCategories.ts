import { useEffect, useState } from 'react'
import { fetchHomeCategories } from './api'
import type { HomeCategory } from '../../types/api'

/**
 * Kategori grid "Kategori Populer" untuk homepage.
 *
 * Dipanggil hanya dari komponen homepage, jadi request tambahan ini tidak
 * ikut terbawa ke halaman lain (keranjang, detail produk, akun). Kalau gagal,
 * komponen memakai daftar fallback statis supaya desain yang sudah disetujui
 * tidak pernah kosong.
 */
export function useHomeCategories(): {
  categories: HomeCategory[]
  loading: boolean
} {
  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setLoading(true)

    fetchHomeCategories(controller.signal)
      .then((rows) => {
        if (!active) {
          return
        }
        setCategories(rows)
        setLoading(false)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setCategories([])
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return { categories, loading }
}
