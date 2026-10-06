import { useEffect, useState } from 'react'
import { fetchDashboard } from './api'
import type { DashboardPayload } from '../../types/api'

export type DashboardState = {
  data: DashboardPayload | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useDashboard(featuredLimit = 10): DashboardState {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setLoading(true)
    setError(null)

    fetchDashboard(featuredLimit, controller.signal)
      .then((payload) => {
        if (!active) {
          return
        }
        setData(payload)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active || (cause as Error)?.name === 'AbortError') {
          return
        }
        setError((cause as Error)?.message ?? 'Gagal memuat data.')
        setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [featuredLimit, nonce])

  return {
    data,
    loading,
    error,
    reload: () => setNonce((value) => value + 1),
  }
}