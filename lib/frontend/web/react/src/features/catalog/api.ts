import { apiClient } from '../../lib/api-client'
import { STORE_NAME } from '../../lib/brand'
import { fillDemoCard } from './demo-card-data'
import type {
  ApiEnvelope,
  Category,
  DashboardItems,
  DashboardMeta,
  DashboardPayload,
  SessionState,
} from '../../types/api'

/** Endpoint kategori hanya mengirim id/status/tanggal. Nama opsional. */
type CategoryItems = {
  categories?: Array<Record<string, unknown>>
}

function normalizeCategories(raw: unknown): Category[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return (raw as Array<Record<string, unknown>>).map((row, index) => ({
    category_id: Number(row.category_id ?? index),
    name: typeof row.name === 'string' && row.name ? row.name : undefined,
    url: typeof row.url === 'string' ? row.url : null,
    image: typeof row.image === 'string' ? row.image : null,
    product_count:
      row.product_count === undefined ? undefined : Number(row.product_count ?? 0),
  }))
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const envelope = await apiClient.get<ApiEnvelope<CategoryItems>>('/catalog/categories', signal)
  return normalizeCategories(envelope.items?.categories)
}

export async function fetchDashboard(
  featuredLimit = 10,
  signal?: AbortSignal
): Promise<DashboardPayload> {
  const [envelope, categories] = await Promise.all([
    apiClient.get<ApiEnvelope<DashboardItems>>(
      `/storefront/dashboard?featured_limit=${featuredLimit}`,
      signal
    ),
    // Kategori belum jadi bagian dashboard; kalau gagal, homepage tetap jalan.
    fetchCategories(signal).catch(() => []),
  ])

  const meta = envelope.meta as unknown as DashboardMeta
  const rawFeatured = Array.isArray(envelope.items?.featured) ? envelope.items.featured : []

  return {
    channels: Array.isArray(envelope.items?.channels) ? envelope.items.channels : [],
    // Data contoh hanya mengisi field yang masih kosong. Lihat demo-card-data.ts.
    featured: rawFeatured.map(fillDemoCard),
    categories,
    meta: {
      platform_id: Number(meta?.platform_id ?? 0),
      // Memakai brand frontend, bukan nilai `store_name` dari database yang
      // masih bawaan osCommerce. Lihat lib/brand.ts.
      store_name: STORE_NAME,
      currency: String(meta?.currency ?? 'IDR'),
      channel_count: Number(meta?.channel_count ?? 0),
      featured_count: Number(meta?.featured_count ?? 0),
    },
  }
}

/**
 * Status login untuk header.
 *
 * Error sengaja ditelan: kalau endpoint session tidak terbaca, header
 * diperlakukan sebagai tamu sehingga yang tampil tombol Masuk dan Daftar.
 * Itu kondisi aman karena menu akun tidak pernah ditampilkan ke non-tamu.
 */
export async function fetchSession(signal?: AbortSignal): Promise<SessionState> {
  const GUEST: SessionState = { logged_in: false, display_name: '', initial: '' }

  try {
    const envelope = await apiClient.get<ApiEnvelope<Partial<SessionState>>>(
      '/storefront/session',
      signal
    )
    const items = envelope.items ?? {}

    return {
      logged_in: items.logged_in === true,
      display_name: typeof items.display_name === 'string' ? items.display_name : '',
      initial: typeof items.initial === 'string' ? items.initial : '',
    }
  } catch {
    return GUEST
  }
}