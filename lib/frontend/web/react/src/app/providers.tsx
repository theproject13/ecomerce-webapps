import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORE_NAME } from '../lib/brand'
import { fetchSession } from '../features/catalog/api'
import { useDashboard } from '../features/catalog/useDashboard'
import type {
  Category,
  Channel,
  DashboardMeta,
  FeaturedProduct,
  SessionState,
} from '../types/api'

type StorefrontState = {
  loading: boolean
  error: string | null
  reload: () => void
  meta: DashboardMeta
  channels: Channel[]
  categories: Category[]
  featured: FeaturedProduct[]
  session: SessionState
}

const GUEST_SESSION: SessionState = {
  logged_in: false,
  display_name: '',
  initial: '',
}

const FALLBACK_META: DashboardMeta = {
  platform_id: 0,
  store_name: STORE_NAME,
  currency: 'IDR',
  channel_count: 0,
  featured_count: 0,
}

const StorefrontContext = createContext<StorefrontState>({
  loading: true,
  error: null,
  reload: () => undefined,
  meta: FALLBACK_META,
  channels: [],
  categories: [],
  featured: [],
  session: GUEST_SESSION,
})

export function StorefrontProvider({
  children,
  featuredLimit = 10,
}: {
  children: ReactNode
  featuredLimit?: number
}) {
  const { data, loading, error, reload } = useDashboard(featuredLimit)
  const [session, setSession] = useState<SessionState>(GUEST_SESSION)

  // Status login dibaca terpisah dari dashboard karena hanya header yang
  // memakainya. Perubahan login lewat PHP tidak akan terlihat tanpa reload,
  // dan itu wajar: halaman ini dirender ulang saat navigasi.
  useEffect(() => {
    const controller = new AbortController()

    fetchSession(controller.signal)
      .then(setSession)
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  const value = useMemo<StorefrontState>(
    () => ({
      loading,
      error,
      reload,
      meta: data?.meta ?? FALLBACK_META,
      channels: data?.channels ?? [],
      categories: data?.categories ?? [],
      featured: data?.featured ?? [],
      session,
    }),
    [data, loading, error, reload, session]
  )

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>
}

export function useStorefront(): StorefrontState {
  return useContext(StorefrontContext)
}