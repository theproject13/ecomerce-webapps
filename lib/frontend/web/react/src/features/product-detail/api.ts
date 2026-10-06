import { ApiError, apiClient } from '../../lib/api-client'
import type {
  ApiEnvelope,
  ProductCategoryRef,
  ProductDetail,
  ProductDetailMeta,
  ProductDetailPayload,
  ProductImage,
  ProductManufacturer,
  ProductPrice,
  ProductSpecification,
  ProductStock,
} from '../../types/api'

/**
 * Client untuk api/product/detail.
 *
 * Endpoint ini read-only, jadi tidak ada CSRF dan tidak ada body POST.
 * Response dinormalisasi di sini supaya komponen tidak perlu menghadapi null
 * atau tipe yang salah dari server: field yang boleh hilang diberi nilai
 * default yang aman untuk render.
 */

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizePrice(raw: unknown): ProductPrice {
  const row = (raw ?? {}) as Record<string, unknown>

  return {
    value: asNumber(row.value),
    old_value: asNumber(row.old_value),
    // `has_special` hanya dipercaya kalau backend memang mengirim true.
    has_special: row.has_special === true,
    currency: asString(row.currency) || 'IDR',
  }
}

function normalizeStock(raw: unknown): ProductStock {
  const row = (raw ?? {}) as Record<string, unknown>
  const quantity = asNumber(row.quantity)

  return {
    quantity,
    // Kalau backend tidak mengirim in_stock, turunan dari quantity supaya
    // halaman tidak pernah menampilkan "tersedia" untuk stok nol.
    in_stock: typeof row.in_stock === 'boolean' ? row.in_stock : quantity > 0,
    stock_code: asNullableString(row.stock_code),
    can_add_to_cart:
      typeof row.can_add_to_cart === 'boolean' ? row.can_add_to_cart : quantity > 0,
  }
}

function normalizeImages(raw: unknown): ProductImage[] {
  return asArray(raw)
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>
      const url = asString(item.url)

      return {
        id: asNumber(item.id),
        url,
        thumb: asString(item.thumb) || url,
        alt: asString(item.alt),
        is_default: item.is_default === true,
      }
    })
    // Gambar tanpa URL tidak bisa dirender, buang sekalian.
    .filter((image) => image.url !== '')
}

function normalizeSpecifications(raw: unknown): ProductSpecification[] {
  return asArray(raw)
    .map((row) => {
      const item = (row ?? {}) as Record<string, unknown>
      const values = asArray(item.values)
        .map((value) => asString(value).trim())
        .filter((value) => value !== '')

      return { name: asString(item.name).trim(), values }
    })
    .filter((spec) => spec.name !== '' && spec.values.length > 0)
}

function normalizeCategoryRef(raw: unknown): ProductCategoryRef | null {
  const row = (raw ?? {}) as Record<string, unknown>
  const name = asString(row.name).trim()

  if (!name) {
    return null
  }

  return {
    category_id: asNumber(row.category_id),
    name,
    url: asNullableString(row.url),
  }
}

function normalizeManufacturer(raw: unknown): ProductManufacturer | null {
  const row = (raw ?? {}) as Record<string, unknown>
  const name = asString(row.name).trim()

  if (!name) {
    return null
  }

  return {
    manufacturers_id: asNumber(row.manufacturers_id),
    name,
    url: asNullableString(row.url),
  }
}

function normalizeIdentifiers(raw: unknown): Record<string, string> {
  const row = (raw ?? {}) as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(row)) {
    const text = asString(value).trim()
    if (text) {
      result[key] = text
    }
  }

  return result
}

function normalizeProduct(raw: unknown): ProductDetail {
  const row = (raw ?? {}) as Record<string, unknown>

  return {
    products_id: asNumber(row.products_id),
    name: asString(row.name),
    model: asString(row.model),
    summary: asString(row.summary),
    description: asString(row.description),
    url: asNullableString(row.url),
    price: normalizePrice(row.price),
    stock: normalizeStock(row.stock),
    images: normalizeImages(row.images),
    specifications: normalizeSpecifications(row.specifications),
    category: normalizeCategoryRef(row.category),
    breadcrumb: asArray(row.breadcrumb)
      .map((item) => normalizeCategoryRef(item))
      .filter((item): item is ProductCategoryRef => item !== null),
    identifiers: normalizeIdentifiers(row.identifiers),
    manufacturer: normalizeManufacturer(row.manufacturer),
  }
}

export async function fetchProductDetail(
  productsId: number,
  signal?: AbortSignal
): Promise<ProductDetailPayload> {
  const id = Math.trunc(productsId)

  if (!Number.isFinite(id) || id <= 0) {
    // Jangan panggil server dengan id yang pasti tidak ada; ini menghasilkan
    // 404 yang tidak informatif dan membuang satu round-trip.
    throw new ApiError('Produk tidak ditemukan.', 404)
  }

  const envelope = await apiClient.get<ApiEnvelope<Partial<ProductDetail>>>(
    `/product/detail?id=${id}`,
    signal
  )

  const meta = envelope.meta as unknown as ProductDetailMeta

  return {
    items: normalizeProduct(envelope.items),
    meta: {
      platform_id: asNumber(meta?.platform_id),
      currency: asString(meta?.currency) || 'IDR',
    },
  }
}