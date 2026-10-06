import { storefrontConfig } from './storefront-config'

/**
 * Base path diambil dari runtime, bukan dari build.
 *
 * ReactShell.php menyuntik window.__OSC_STOREFRONT__ di setiap shell, dengan
 * catalogBase dihitung dari path request yang sedang dilayani. Build React
 * hanya satu untuk kelima platform, jadi base path tidak bisa berasal dari
 * import.meta.env: kanal /furniture dan toko utama /osc414 butuh base berbeda.
 *
 * Di development Vite melayani aplikasi dari root-nya sendiri dan tidak ada
 * tag PHP, jadi storefrontConfig() jatuh ke FALLBACK. Karena itu konstanta
 * VITE_CATALOG_BASE tetap dipakai sebagai sumber nilai fallback.
 */
function buildTimeCatalogBase(): string {
  return import.meta.env.VITE_CATALOG_BASE || '/osc414'
}

const CONFIG = storefrontConfig()

const CATALOG_BASE = CONFIG.catalogBase === '/' ? buildTimeCatalogBase() : CONFIG.catalogBase
const API_BASE = CONFIG.apiBase === '/api' ? `${CATALOG_BASE}/api` : CONFIG.apiBase

// installBase mengikuti base toko, bukan mount kanal. Kalau config tidak
// menyuntiknya (shell lama, atau fallback dev), turunkan dari catalogBase dengan
// membuang segmen kanal terakhir.
const INSTALL_BASE =
  CONFIG.installBase !== '/'
    ? CONFIG.installBase
    : CATALOG_BASE.replace(/\/[^/]+$/, '') || '/'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * URL untuk halaman yang hidup di luar mount kanal saat ini.
 *
 * Dipakai untuk link antar kanal (banner hero, daftar kanal). Bedanya dengan
 * catalogUrl(): yang ini relatif ke installBase, yaitu root toko tanpa segmen
 * kanal. Di kanal furniture, catalogUrl('furniture') akan menghasilkan
 * /osc414/furniture/furniture karena catalogBase sudah berisi /furniture.
 * channelUrl('furniture') menghasilkan /osc414/furniture yang benar.
 *
 * Halaman dalam kanal yang sama (product-detail, register) tetap harus lewat
 * catalogUrl() supaya shopper tidak keluar dari mount React-nya.
 */
export function channelUrl(path: string): string {
  const base = INSTALL_BASE === '/' ? '' : INSTALL_BASE
  const clean = path.replace(/^\/+/, '')

  if (clean === '') {
    return base === '' ? '/' : base
  }

  return `${base}/${clean}`
}

/**
 * URL API untuk pemanggilan di luar request() di atas.
 *
 * Base-nya sama dengan yang dipakai request(), jadi pemanggil tidak perlu
 * menyalin logika penentuan kanal. Dipakai features/cart, yang butuh
 * mengirim body form-urlencoded dan token CSRF miliknya sendiri.
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export function catalogUrl(path: string): string {
  if (!path) {
    return `${CATALOG_BASE}/`
  }

  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${CATALOG_BASE}/${path.replace(/^\/+/, '')}`
}

/**
 * URL untuk `<img src>`.
 *
 * catalogUrl() tidak bisa dipakai langsung untuk gambar banner karena
 * assetUrl() di produksi mengembalikan path root-relative
 * (/osc414/react-assets/img/...), bukan URL absolut. Kalau diteruskan ke
 * catalogUrl(), prefix /osc414 akan ditambahkan dua kali dan gambar rusak.
 */
export function imageUrl(path?: string | null): string {
  if (!path) {
    return ''
  }

  if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
    return path
  }

  return catalogUrl(path)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = readCsrfToken()
  if (token) {
    headers['X-CSRF-Token'] = token
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    if ((cause as Error)?.name === 'AbortError') {
      throw cause
    }
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const raw = await response.text()
  let payload: unknown = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ||
      `Permintaan gagal (${response.status}).`
    throw new ApiError(message, response.status)
  }

  return payload as T
}

export function readCsrfToken(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
  if (meta?.content) {
    return meta.content
  }

  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}