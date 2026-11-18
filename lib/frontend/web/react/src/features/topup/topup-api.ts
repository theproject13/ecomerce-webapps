import { ApiError, apiUrl } from '../../lib/api-client'

/**
 * Satu permintaan top-up yang tersimpan.
 *
 * Nilainya dikembalikan server apa adanya (harga/nominal tidak dihitung ulang
 * di browser). Hanya `service`, `phone_number`, dan `amount` yang dikirim.
 */
export type TopupOrder = {
  topup_orders_id: number
  service: string
  phone_number: string
  amount: number
  status: number
}

export type TopupPayload = {
  ok: boolean
  items: TopupOrder | null
  error: string | null
}

type CsrfPayload = {
  ok: boolean
  csrfToken: string
}

/**
 * Token CSRF diambil dari /api/topup/csrf saat tombol ditekan, bukan saat
 * render. Alasannya sama dengan keranjang (lihat features/cart/cart-api.ts):
 * ReactShell menyuntik config sebelum $application->run(), sehingga token di
 * config tidak cocok dengan cookie _csrf yang dibaca Yii pada POST berikutnya.
 * Endpoint csrf berjalan di lifecycle Yii normal, jadi token dan cookie-nya
 * berasal dari request yang sama.
 */
const GENERIC_ERROR = 'Permintaan gagal. Silakan coba lagi.'

/**
 * BaseApiController menambahkan BOM di depan JSON. Di browser Response.text()
 * biasanya sudah membuangnya, tetapi pembersihan ini membuat parsing tetap
 * benar kalau tidak.
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
    response = await fetch(apiUrl('/topup/csrf'), {
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
    throw new ApiError('Sesi tidak bisa disiapkan. Muat ulang halaman.', response.status)
  }

  return token
}

/**
 * Kirim permintaan top-up.
 *
 * Mengirim form-urlencoded (bukan JSON) supaya Yii membaca parameternya lewat
 * getBodyParam() sama seperti form tema PHP. 400 dicoba sekali lagi dengan
 * token baru: Sceleton memutar token setiap POST yang lolos validasi, jadi 400
 * berarti token basi, bukan kegagalan permintaan.
 */
export async function submitTopup(fields: {
  service: string
  phoneNumber: string
  amount: string
}): Promise<TopupPayload> {
  const send = async (token: string) => {
    const form = new URLSearchParams()
    form.set('service', fields.service)
    form.set('phone_number', fields.phoneNumber)
    form.set('amount', fields.amount)
    form.set('_csrf', token)

    try {
      return await fetch(apiUrl('/topup/submit'), {
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

  const payload = parseJson(await response.text()) as TopupPayload | null

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
