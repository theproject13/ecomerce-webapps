import { apiClient } from '../../lib/api-client'
import type {
  ApiEnvelope,
  CatalogCategory,
  CatalogMeta,
  CatalogPayload,
  CatalogQuery,
  Product,
} from '../../types/api'

/**
 * Daftar produk katalog dan daftar kategori filter.
 *
 * Dua hal yang sengaja tidak dilakukan di sini:
 *
 * 1. Tidak mengirim platform_id. Endpoint mengambil platform dari request
 *    lewat platform::currentId() di server. Kalau platform_id ikut dikirim,
 *    shopper bisa membaca produk kanal lain hanya dengan mengubah query.
 * 2. Tidak memakai endpoint bawaan /api/catalog/products. Endpoint itu tidak
 *    punya scoping platform, jadi katalog furniture akan menampilkan produk
 *    toko utama. Bentuk lamanya juga sengaja tidak diubah karena dipakai
 *    konsumen lain.
 */

const SORTS = ['newest', 'oldest', 'name_asc', 'name_desc', 'price_asc', 'price_desc'] as const

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

export function buildCatalogQuery(query: CatalogQuery): string {
  const params = new URLSearchParams()

  const page = Math.max(1, Math.trunc(numberOr(query.page, 1)))
  const perPage = Math.min(24, Math.max(4, Math.trunc(numberOr(query.perPage, 12))))
  const requested = query.sort
  const sort = requested && SORTS.includes(requested) ? requested : 'newest'
  const scope = query.scope === 'featured' ? 'featured' : 'all'
  const keywords = (query.keywords ?? '').trim()

  params.set('page', String(page))
  params.set('per_page', String(perPage))
  params.set('sort', sort)
  params.set('scope', scope)

  if (keywords !== '') {
    params.set('keywords', keywords)
  }

  const categoryId = Math.trunc(numberOr(query.categoryId, 0))
  if (categoryId > 0) {
    params.set('category_id', String(categoryId))
  }

  return params.toString()
}

/**
 * Field JSON dinormalisasi di sini supaya komponen tidak perlu menebak tipe.
 * Nama dan ringkasan produk dipakai apa adanya sebagai teks; React escapenya,
 * dan lib/sanitize-html.ts dipakai di halaman detail untuk HTML.
 */
function normalizeProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return (raw as Array<Record<string, unknown>>).map((row) => {
    const listPrice = row.list_price === null || row.list_price === undefined ? null : Number(row.list_price)

    return {
      products_id: numberOr(row.products_id, 0),
      name: typeof row.name === 'string' ? row.name : '',
      summary: typeof row.summary === 'string' ? row.summary : '',
      model: typeof row.model === 'string' ? row.model : '',
      price: numberOr(row.price, 0),
      // Harga coret hanya bermakna kalau nilainya lebih besar dari harga final.
      list_price: listPrice !== null && Number.isFinite(listPrice) ? listPrice : null,
      quantity: numberOr(row.quantity, 0),
      in_stock: row.in_stock === true,
      image: typeof row.image === 'string' && row.image !== '' ? row.image : null,
      url: typeof row.url === 'string' && row.url !== '' ? row.url : null,
    }
  })
}

export async function fetchCatalog(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogPayload> {
  const envelope = await apiClient.get<ApiEnvelope<Product[]>>(
    `/storefront/products?${buildCatalogQuery(query)}`,
    signal
  )

  const meta = (envelope.meta ?? {}) as unknown as Record<string, unknown>
  const totalPages = Math.max(1, numberOr(meta.total_pages, 1))

  return {
    items: normalizeProducts(envelope.items),
    meta: {
      platform_id: numberOr(meta.platform_id, 0),
      platform_name: typeof meta.platform_name === 'string' ? meta.platform_name : '',
      currency: typeof meta.currency === 'string' ? meta.currency : 'IDR',
      total_count: numberOr(meta.total_count, 0),
      page: Math.min(Math.max(1, numberOr(meta.page, 1)), totalPages),
      per_page: numberOr(meta.per_page, 12),
      total_pages: totalPages,
      sort: (SORTS.includes(meta.sort as (typeof SORTS)[number]) ? meta.sort : 'newest') as CatalogMeta['sort'],
      scope: meta.scope === 'featured' ? 'featured' : 'all',
      keywords: typeof meta.keywords === 'string' ? meta.keywords : '',
      category_id: meta.category_id === null || meta.category_id === undefined ? null : numberOr(meta.category_id, 0),
    },
  }
}

export async function fetchCatalogCategories(signal?: AbortSignal): Promise<CatalogCategory[]> {
  const envelope = await apiClient.get<ApiEnvelope<CatalogCategory[]>>('/storefront/categories', signal)

  if (!Array.isArray(envelope.items)) {
    return []
  }

  return envelope.items.filter((item) => numberOr(item?.category_id, 0) > 0)
}
