import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { fetchCategoryDetail } from './category-api'
import type { CategoryDetail } from '../../types/api'

type State = {
  category: CategoryDetail | null
  loading: boolean
  error: string
  notFound: boolean
}

/**
 * Ambil satu kategori untuk halaman landing.
 *
 * `categoryId` null (mis. ?id= hilang atau bukan angka) langsung dianggap tidak
 * ditemukan tanpa memanggil API, supaya tidak ada request yang pasti gagal.
 * `reload` dipakai tombol "Muat ulang" pada state error.
 */
export function useCategoryDetail(categoryId: number | null): State & { reload: () => void } {
  const [state, setState] = useState<State>({
    category: null,
    loading: true,
    error: '',
    notFound: false,
  })
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    if (categoryId === null) {
      setState({ category: null, loading: false, error: '', notFound: true })
      return
    }

    const controller = new AbortController()

    setState({ category: null, loading: true, error: '', notFound: false })

    fetchCategoryDetail(categoryId, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) {
          return
        }
        setState({ category: payload.items, loading: false, error: '', notFound: false })
      })
      .catch((cause: unknown) => {
        if ((cause as Error)?.name === 'AbortError') {
          return
        }

        const notFound = cause instanceof ApiError && cause.status === 404
        setState({
          category: null,
          loading: false,
          error: notFound ? '' : cause instanceof Error ? cause.message : 'Gagal memuat kategori.',
          notFound,
        })
      })

    return () => controller.abort()
  }, [categoryId, reloadKey])

  return { ...state, reload }
}
