import { apiClient } from '../../lib/api-client'
import type {
  ApiEnvelope,
  CategoryBreadcrumb,
  CategoryDetail,
  CategoryDetailChild,
  CategoryDetailMeta,
  CategoryDetailPayload,
} from '../../types/api'

/**
 * Data landing kategori.
 *
 * Endpoint /api/category/detail mengembalikan SATU kategori (deskripsi, banner,
 * anak, breadcrumb). Produknya sengaja tidak diambil di sini: halaman memakai
 * /api/storefront/products?category_id= yang sudah punya paginasi, sort, dan
 * scoping platform. Itu juga alasan kenapa bentuk payload ini tidak meniru
 * /api/home/categories (yang khusus grid homepage).
 */

function numberOr(value: unknown, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeChildren(raw: unknown): CategoryDetailChild[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return (raw as Array<Record<string, unknown>>)
    .map((row) => ({
      category_id: numberOr(row.category_id, 0),
      name: typeof row.name === 'string' ? row.name : '',
      image: typeof row.image === 'string' && row.image !== '' ? row.image : null,
    }))
    .filter((child) => child.category_id > 0)
}

function normalizeBreadcrumb(raw: unknown): CategoryBreadcrumb[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return (raw as Array<Record<string, unknown>>)
    .map((row) => ({
      category_id: numberOr(row.category_id, 0),
      name: typeof row.name === 'string' ? row.name : '',
    }))
    .filter((step) => step.category_id > 0)
}

export async function fetchCategoryDetail(
  categoryId: number,
  signal?: AbortSignal
): Promise<CategoryDetailPayload> {
  const envelope = await apiClient.get<ApiEnvelope<CategoryDetail>>(
    `/category/detail?id=${Math.trunc(categoryId)}`,
    signal
  )

  const raw = (envelope.items ?? {}) as unknown as Record<string, unknown>

  return {
    items: {
      category_id: numberOr(raw.category_id, categoryId),
      parent_id: numberOr(raw.parent_id, 0),
      name: typeof raw.name === 'string' ? raw.name : '',
      description: typeof raw.description === 'string' ? raw.description : '',
      image: typeof raw.image === 'string' && raw.image !== '' ? raw.image : null,
      children: normalizeChildren(raw.children),
      breadcrumb: normalizeBreadcrumb(raw.breadcrumb),
    },
    meta: {
      platform_id: numberOr((envelope.meta as Record<string, unknown>)?.platform_id, 0),
      language_id: numberOr((envelope.meta as Record<string, unknown>)?.language_id, 0),
      currency:
        typeof (envelope.meta as Record<string, unknown>)?.currency === 'string'
          ? String((envelope.meta as Record<string, unknown>).currency)
          : 'IDR',
    } satisfies CategoryDetailMeta,
  }
}
