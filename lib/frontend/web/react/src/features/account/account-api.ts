import { ApiError, apiUrl } from '../../lib/api-client'

/**
 * Session akun. Hanya berisi identitas tampilan dan id; email/telepon tidak
 * dibocorkan ke endpoint session untuk tamu.
 */
export type AccountSession = {
  logged_in: boolean
  customers_id: number | null
  display_name: string
  initial: string
}

/**
 * Bentuk jawaban action akun (login/register/logout).
 *
 * `field_errors` memetakan atribut model (email_address, password, captcha,
 * ...) ke satu pesan pertama supaya form React bisa menandai input yang salah
 * persis seperti yang dikenali PHP.
 */
export type AccountActionPayload = {
  ok: boolean
  items: Record<string, unknown>
  redirect: {
    account: string
    home: string
  }
  meta: {
    platform_id: number
    currency: string
  }
  error: string | null
  field_errors: Record<string, string>
}

export type AccountOverview = {
  logged_in: boolean
  customers_id: number
  firstname: string
  lastname: string
  display_name: string
  email: string
  telephone: string
  landline: string
  orders_count: number
}

export type OrderItem = {
  orders_id: number
  date_purchased: string
  date_long: string
  total: string
  status: string
  shipped_to: string
  type: string
  count: number
  url: string
}

export type OrdersPayload = {
  ok: boolean
  items: OrderItem[]
  meta: {
    platform_id: number
    currency: string
    orders_count: number
  }
  error: string | null
}

/**
 * Client akun untuk storefront React.
 *
 * Akunnya tetap milik PHP. Modul ini tidak menyimpan apa pun: ia memanggil
 * endpoint JSON yang memanggil AuthContainer/CustomerRegistration yang sama
 * dengan tema, jadi session login, validasi, dan CSRF cuma ada di satu tempat.
 *
 * Token CSRF diambil saat permintaan dikirim, bukan saat halaman dirender,
 * dengan alasan yang sama seperti features/cart (ReactShell echoing HTML
 * sebelum $application->run()).
 *
 * Alamat gambar captcha ikut disediakan di sini: toko ini mengaktifkan
 * CAPTCHA_ON_CREATE_ACCOUNT dan CAPTCHA_ON_CUSTOMER_LOGIN, jadi form login dan
 * daftar wajib mengirim registration[captcha]/login[captcha] yang divalidasi
 * terhadap /site/captcha (action yang sama dengan tema PHP).
 */

const GENERIC_ERROR = 'Permintaan gagal. Silakan coba lagi.'

/**
 * BaseApiController menambahkan BOM di depan JSON.
 * BOM itu tidak di-strip JSON.parse(), jadi harus dibuang sebelum di-parse.
 */
function parseJson(raw: string): unknown {
  const text = raw.replace(/^﻿/, '')
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
    response = await fetch(apiUrl('/account/csrf'), {
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
    throw new ApiError('Sesi akun tidak bisa disiapkan. Muat ulang halaman.', response.status)
  }

  return token
}

/**
 * Kirim satu POST form-urlencoded ke endpoint akun dan balas sebagai payload.
 *
 * Sceleton.php memutar token setiap kali POST-nya lolos validasi
 * (getCsrfToken(true)), jadi token yang diambil sebelum POST lalu dipakai lagi
 * akan ditolak. Karena itu 400 dicoba satu kali lagi dengan token baru.
 */
async function submit<T>(
  path: string,
  fields: Record<string, string>,
): Promise<T> {
  const send = async (token: string) => {
    const form = new URLSearchParams()
    for (const [name, value] of Object.entries(fields)) {
      form.set(name, value)
    }
    form.set('_csrf', token)

    try {
      return await fetch(apiUrl(path), {
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

  const payload = parseJson(await response.text()) as T | null

  if (!payload) {
    throw new ApiError(
      response.ok ? GENERIC_ERROR : `Permintaan gagal (${response.status}).`,
      response.status,
    )
  }

  return payload
}

/** Versi submit yang melempar saat payload.ok false (untuk aksi non-form). */
async function post<T extends { ok: boolean; error?: string | null }>(
  path: string,
  fields: Record<string, string>,
): Promise<T> {
  const payload = await submit<T>(path, fields)

  if (!payload.ok) {
    throw new ApiError(payload.error || GENERIC_ERROR, 0)
  }

  return payload
}

/** GET JSON ke endpoint akun. */
async function get<T>(path: string): Promise<T> {
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

  const payload = parseJson(await response.text()) as (T & { error?: string | null }) | null

  if (!payload || !response.ok) {
    throw new ApiError(
      payload?.error || `Permintaan gagal (${response.status}).`,
      response.status,
    )
  }

  return payload
}

/** Status login untuk halaman akun React. */
export async function fetchAccountSession(): Promise<AccountSession> {
  const payload = await get<{
    items: AccountSession
    meta: { platform_id: number }
    error: string | null
  }>('/account/session')

  return payload.items
}



/**
 * Login dengan alur CustomerRegistration scenario 'login'.
 *
 * Body dikirim dengan namespace `login[...]` persis seperti form tema PHP.
 * remember=1 menyalakan rememberMe (cookie berkepanjangan).
 */
  export async function login(
    fields: { email: string; password: string; remember: boolean },
  ): Promise<AccountActionPayload> {
    return submit<AccountActionPayload>('/account/login', {
      'login[email_address]': fields.email.trim(),
      'login[password]': fields.password,
      'login[remember]': fields.remember ? '1' : '0',
    })
  }

/**
 * Registrasi dengan alur CustomerRegistration scenario 'registration'.
 *
 * Body dikirim dengan namespace `registration[...]`. gdrp wajib (1) dan
 * captcha wajib sesuai konfigurasi toko; registrasi sukses langsung login,
 * sehingga header React akan menyala setelah halaman dimuat ulang.
 */
  export async function register(fields: {
    email: string
    password: string
    confirmation: string
    firstname: string
    lastname: string
    gdrp: boolean
  }): Promise<AccountActionPayload> {
    return submit<AccountActionPayload>('/account/register', {
      'registration[email_address]': fields.email.trim(),
      'registration[password]': fields.password,
      'registration[confirmation]': fields.confirmation,
      'registration[firstname]': fields.firstname.trim(),
      'registration[lastname]': fields.lastname.trim(),
      'registration[gdrp]': fields.gdrp ? '1' : '0',
    })
  }

/** Logout. Session PHP di-clear dan keranjang di-reset oleh server. */
export function logout(): Promise<AccountActionPayload> {
  return post<AccountActionPayload>('/account/logout', {})
}

/** Profil akun yang sedang login. */
export function fetchOverview(): Promise<{
  ok: boolean
  items: AccountOverview
  error: string | null
}> {
  return get<{ ok: boolean; items: AccountOverview; error: string | null }>('/account/overview')
}

/** Riwayat pesanan milik user yang sedang login. */
export function fetchOrders(): Promise<OrdersPayload> {
  return get<OrdersPayload>('/account/orders')
}