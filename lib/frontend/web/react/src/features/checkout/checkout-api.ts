import { ApiError, apiUrl } from '../../lib/api-client'

/**
 * Tipe checkout React.
 *
 * Bentuknya mengikuti /api/checkout/summary di
 * lib/frontend/controllers/api/CheckoutController.php. Harga, ongkir, pajak,
 * dan total dikirim server apa adanya; React tidak menghitung ulang.
 */
export type CheckoutAddress = {
  address_book_id: number
  label: string
}

export type CheckoutMethod = {
  code: string
  title: string
  cost_f: string
  no_cost: boolean
  selected: boolean
}

export type CheckoutQuote = {
  module: string
  title: string
  methods: CheckoutMethod[]
}

export type CheckoutPaymentMethod = {
  code: string
  title: string
  /** true = gateway online, belum didukung checkout React (ditolak 409 saat place). */
  online: boolean
  checked: boolean
}

export type CheckoutTotal = {
  code: string
  title: string
  text: string
}

export type CheckoutState = {
  is_logged_customer: boolean
  addresses: CheckoutAddress[]
  sendto: number
  billto: number
  shipping: {
    required: boolean
    quotes: CheckoutQuote[]
    selected: string | null
  }
  payment: {
    methods: CheckoutPaymentMethod[]
    selected: string | null
  }
  totals: CheckoutTotal[]
  currency: string
}

export type CheckoutPayload = {
  ok: boolean
  state: CheckoutState | null
  order_id: number | null
  redirect: {
    cart: string
    php_checkout: string
    login: string
    [key: string]: string
  }
  meta: {
    platform_id: number
    currency: string
  }
  error: string | null
}

export type CheckoutSelection = {
  sendto?: number
  billto?: number
  shipping?: string
  payment?: string
}

const GENERIC_ERROR = 'Permintaan gagal. Silakan coba lagi.'

/**
 * BaseApiController menulis JSON dengan BOM. JSON.parse menolak BOM, jadi
 * dibuang dulu sebelum diurai. Sama seperti features/cart dan features/account.
 */
function parseJson(raw: string): unknown {
  const clean = raw.replace(/^\uFEFF/, '')
  if (!clean) {
    return null
  }

  try {
    return JSON.parse(clean)
  } catch {
    return null
  }
}

/**
 * Token CSRF dari lifecycle Yii normal.
 *
 * /api/cart/csrf dipakai ulang: token CSRF milik session, bukan milik
 * controller, jadi nilainya sah untuk POST ke /api/checkout/*.
 */
async function csrfToken(): Promise<string> {
  let response: Response
  try {
    response = await fetch(apiUrl('/cart/csrf'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as { csrfToken?: string } | null
  if (!payload?.csrfToken) {
    throw new ApiError('Sesi checkout tidak bisa disiapkan.', response.status)
  }

  return payload.csrfToken
}

/**
 * Kirim POST form-urlencoded ke /api/checkout/*.
 *
 * Token di-retry sekali: ReactShell dan Sceleton menerbitkan token baru pada
 * POST yang lolos validasi, sehingga "The form is expired" cukup diulang
 * dengan token dari cookie terbaru.
 *
 * Payload yang `ok:false` TIDAK dilempar, karena actionPlace memakai 409 + field
 * redirect.php_checkout untuk mengarahkan modul pembayaran online kembali ke
 * checkout PHP. Pemanggil yang memutuskan.
 */
async function postCheckout(path: string, fields: CheckoutSelection | Record<string, string>) {
  const body = new URLSearchParams()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      body.set(key, String(value))
    }
  })
  body.set('_csrf', await csrfToken())

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      credentials: 'same-origin',
      body,
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as CheckoutPayload | null
  if (!payload) {
    throw new ApiError(GENERIC_ERROR, response.status)
  }

  return { status: response.status, payload }
}

/** GET /api/checkout/summary. 401 = pengunjung, dilempar sebagai ApiError. */
export async function fetchCheckoutSummary(): Promise<CheckoutPayload> {
  let response: Response
  try {
    response = await fetch(apiUrl('/checkout/summary'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as CheckoutPayload | null
  if (!payload) {
    throw new ApiError(GENERIC_ERROR, response.status)
  }
  if (!response.ok) {
    throw new ApiError(payload.error ?? GENERIC_ERROR, response.status)
  }

  return payload
}

/** POST /api/checkout/select: pilih alamat/ongkir/bayar, state dikirim balik. */
export async function selectCheckout(selection: CheckoutSelection): Promise<CheckoutPayload> {
  const { payload } = await postCheckout('/checkout/select', selection)
  return payload
}

/**
 * POST /api/checkout/place: simpan pesanan.
 *
 * Status HTTP dikembalikan bersama payload karena 409 berarti modul pembayaran
 * online: pemanggil harus mengalihkan ke redirect.php_checkout alih-alih
 * menampilkan error biasa.
 */
export async function placeOrder(
  selection: CheckoutSelection,
): Promise<{ status: number; payload: CheckoutPayload }> {
  return postCheckout('/checkout/place', selection)
}