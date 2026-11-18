import { ApiError, apiUrl } from '../../lib/api-client'

/**
 * Input form pengajuan toko. Nama field dipertahankan camelCase untuk React,
 * lalu dipetakan ke snake_case saat dikirim ke PHP.
 */
export type SellerApplicationInput = {
  storeName: string
  category: string
  customCategory: string
  description: string
  contactName: string
  contactPhone: string
  streetAddress: string
  city: string
  postcode: string
}

export type SellerApplyResponse = {
  ok: boolean
  items: {
    applications_id?: number
    status?: number
  }
  error: string | null
  field_errors?: Record<string, string>
}

export type SellerStoreResponse = {
  ok: boolean
  items: {
    store: {
      stores_id: number
      store_name: string
      suppliers_id: number
    } | null
    application: {
      applications_id: number
      store_name: string
      status: number
      status_label: string
    } | null
  }
  error: string | null
}

export type SellerCategory = {
  category_id: number
  parent_id: number
  name: string
  depth: number
}

export type SellerCategoryResponse = {
  ok: boolean
  items: SellerCategory[]
  error: string | null
}

export type SellerProduct = {
  seller_products_id: number
  products_id: number
  status: number
  status_label: string
  reject_reason: string | null
  date_added: string
  products_name: string | null
  price_idr: number
  products_quantity: number
  image_url: string | null
}

export type SellerProductResponse = {
  ok: boolean
  items: SellerProduct[]
  error: string | null
}

export type SellerProductInput = {
  productName: string
  categoryId: number
  price: string
  quantity: string
  description: string
}

export type SellerCreateProductResponse = {
  ok: boolean
  items: {
    products_id?: number
    status?: number
  }
  error: string | null
  field_errors?: Record<string, string>
  details?: Record<string, unknown>
}

const GENERIC_ERROR = 'Pengajuan toko gagal. Silakan coba lagi.'
const GENERIC_PRODUCT_ERROR = 'Produk gagal dikirim. Silakan coba lagi.'

/**
 * BaseApiController menambahkan BOM di depan JSON. Buang sebelum JSON.parse().
 */
function parseJson(raw: string): unknown {
  const text = raw.replace(/^\uFEFF/, '')
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

async function csrfToken(): Promise<string> {
  let response: Response
  try {
    response = await fetch(apiUrl('/seller/csrf'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as { csrfToken?: string } | null
  const token = payload?.csrfToken

  if (!response.ok || !token) {
    throw new ApiError('Sesi tidak bisa disiapkan. Muat ulang halaman.', response.status)
  }

  return token
}

/**
 * Kirim pengajuan toko sebagai form-urlencoded.
 *
 * Token CSRF diambil saat submit (bukan saat render), sama seperti
 * features/account, karena ReactShell meng-echo HTML sebelum Yii berjalan.
 * Sceleton memutar token setelah POST valid, jadi 400 dicoba sekali lagi
 * dengan token baru.
 */
export async function submitSellerApplication(
  input: SellerApplicationInput,
): Promise<SellerApplyResponse> {
  const fields: Record<string, string> = {
    store_name: input.storeName,
    category: input.category,
    custom_category: input.customCategory,
    description: input.description,
    contact_name: input.contactName,
    contact_phone: input.contactPhone,
    street_address: input.streetAddress,
    city: input.city,
    postcode: input.postcode,
  }

  const send = async (token: string) => {
    const form = new URLSearchParams()
    for (const [name, value] of Object.entries(fields)) {
      form.set(name, value)
    }
    form.set('_csrf', token)

    try {
      return await fetch(apiUrl('/seller/apply'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        credentials: 'same-origin',
        body: form.toString(),
      })
    } catch {
      throw new ApiError('Tidak dapat terhubung ke server.', 0)
    }
  }

  let response = await send(await csrfToken())

  if (response.status === 400) {
    response = await send(await csrfToken())
  }

  const payload = parseJson(await response.text()) as SellerApplyResponse | null

  if (!payload) {
    throw new ApiError(
      response.ok ? GENERIC_ERROR : `Pengajuan gagal (${response.status}).`,
      response.status,
    )
  }

  return payload
}

async function fetchJson<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as
    | (T & { ok?: boolean; error?: string | null })
    | null

  if (!response.ok || !payload || payload.ok === false) {
    throw new ApiError(
      payload?.error || `Permintaan gagal (${response.status}).`,
      response.status,
    )
  }

  return payload as T
}

export function fetchSellerStore(): Promise<SellerStoreResponse> {
  return fetchJson<SellerStoreResponse>('/seller/store')
}

export function fetchSellerCategories(): Promise<SellerCategoryResponse> {
  return fetchJson<SellerCategoryResponse>('/seller/categories')
}

export function fetchSellerProducts(): Promise<SellerProductResponse> {
  return fetchJson<SellerProductResponse>('/seller/products')
}

export async function createSellerProduct(
  input: SellerProductInput,
  files: File[],
): Promise<SellerCreateProductResponse> {
  const send = async (token: string) => {
    const form = new FormData()
    form.set('product_name', input.productName)
    form.set('category_id', String(input.categoryId))
    form.set('price', input.price)
    form.set('quantity', input.quantity)
    form.set('description', input.description)
    form.set('_csrf', token)
    for (const file of files) {
      form.append('images', file)
    }

    try {
      return await fetch(apiUrl('/seller/create-product'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        body: form,
      })
    } catch {
      throw new ApiError('Tidak dapat terhubung ke server.', 0)
    }
  }

  let response = await send(await csrfToken())

  if (response.status === 400) {
    response = await send(await csrfToken())
  }

  const payload = parseJson(await response.text()) as SellerCreateProductResponse | null

  if (!payload) {
    throw new ApiError(
      response.ok ? GENERIC_PRODUCT_ERROR : `Produk gagal dikirim (${response.status}).`,
      response.status,
    )
  }

  return payload
}
