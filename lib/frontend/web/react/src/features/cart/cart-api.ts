import { ApiError, apiUrl } from '../../lib/api-client'

/** Satu baris keranjang. Harga dikirim apa adanya dari server, tidak dihitung ulang di sini. */
export type CartLine = {
  uprid: string
  products_id: number
  name: string
  image: string
  qty: number
  price: number
  final_price: number
}

export type CartPayload = {
  ok: boolean
  items: CartLine[]
  meta: {
    platform_id: number
    currency: string
    count: number
    is_empty: boolean
  }
  redirect: {
    cart: string
    checkout: string
  }
  error: string | null
}

type CsrfPayload = {
  ok: boolean
  csrfToken: string
}

/**
 * Client keranjang untuk storefront React.
 *
 * Keranjangnya tetap milik PHP. Modul ini tidak menyimpan apa pun: ia memanggil
 * endpoint JSON yang memanggil objek shopping_cart yang sama dengan tema, jadi
 * session, harga, pajak, dan cek stok cuma ada di satu tempat.
 *
 * Token CSRF diambil saat tombol ditekan, bukan saat halaman dirender.
 * ReactShell echoing HTML sebelum $application->run(), sehingga token yang
 * disuntikkan ke config tidak konsisten dengan cookie _csrf yang dibaca Yii
 * pada POST berikutnya dan selalu ditolak "The form is expired".
 * /api/cart/csrf berjalan di lifecycle Yii normal, jadi token dan cookie-nya
 * berasal dari request yang sama. Konsekuensinya pengunjung yang tidak
 * menekan tombol tidak pernah membayar request tambahan.
 */

/** Halaman yang tampil kalau Yii menolak atau jawabannya bukan JSON. */
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
    response = await fetch(apiUrl('/cart/csrf'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as CsrfPayload | null
  const token = payload?.csrfToken

  if (!response.ok || !token) {
    throw new ApiError('Sesi keranjang tidak bisa disiapkan. Muat ulang halaman.', response.status)
  }

  return token
}

/**
 * Kirim satu POST form-urlencoded ke endpoint cart dan balas sebagai CartPayload.
 *
 * Sceleton.php memutar token setiap kali POST-nya lolos validasi
 * (getCsrfToken(true)), jadi token yang diambil sebelum POST lalu dipakai lagi
 * akan ditolak. Karena itu 400 dicoba satu kali lagi dengan token baru: itu
 * bentuk token yang sudah basi, bukan kegagalan add cart.
 */
async function post(path: string, fields: Record<string, string>): Promise<CartPayload> {
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

  const payload = parseJson(await response.text()) as CartPayload | null

  if (!payload) {
    throw new ApiError(
      response.ok ? GENERIC_ERROR : `Permintaan gagal (${response.status}).`,
      response.status,
    )
  }

  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.error || GENERIC_ERROR, response.status)
  }

  return payload
}

/**
 * Isi keranjang untuk halaman React.
 *
 * Dipakai juga untuk refresh badge di header, jadi harus cukup ringan: server
 * sudah mengembalikan hanya baris yang perlu ditampilkan.
 */
export async function fetchCart(): Promise<CartPayload> {
  let response: Response
  try {
    response = await fetch(apiUrl('/cart/index'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0)
  }

  const payload = parseJson(await response.text()) as CartPayload | null

  if (!payload || !response.ok) {
    throw new ApiError(
      payload?.error || `Permintaan gagal (${response.status}).`,
      response.status,
    )
  }

  return payload
}

/**
 * Tambah produk ke keranjang.
 *
 * Kirim form-urlencoded, bukan JSON, supaya Yii membaca products_id dan
 * atribut lewat getBodyParam() persis seperti form dari tema PHP.
 */
export function addToCart(productsId: number, qty: number): Promise<CartPayload> {
  return post('/cart/add', { products_id: String(productsId), qty: String(qty) })
}

/**
 * Ubah qty satu baris.
 *
 * Kuncinya uprid, bukan products_id: satu produk bisa punya beberapa baris
 * kalau atribut bedakan, dan server perlu tahu baris mana yang diubah.
 */
export function updateCartLine(uprid: string, qty: number): Promise<CartPayload> {
  return post('/cart/update', { uprid, qty: String(qty) })
}

/** Hapus satu baris, dengan alasan yang sama seperti updateCartLine(). */
export function removeCartLine(uprid: string): Promise<CartPayload> {
  return post('/cart/remove', { uprid })
}
