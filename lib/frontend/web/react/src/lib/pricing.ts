import type { Product } from '../types/api'

/**
 * Logika harga & diskon.
 *
 * Semua perhitungan harga dikumpulkan di satu file supaya tidak tersebar di
 * komponen, dan gampang diuji. Fungsinya pure: input sama -> output sama.
 */

export type ResolvedDiscount = {
  /** Harga yang benar-benar dibayar. */
  finalPrice: number
  /** Harga sebelum diskon, sudah di-round. Null kalau tidak ada diskon. */
  listPrice: number | null
  /** Persentase diskon 1..95. Null kalau tidak ada diskon. */
  percent: number | null
  hasDiscount: boolean
}

/**
 * Batas atas diskon. Di atas ini berarti data salah (misal field diskon
 * ketuker dengan harga), bukan promo, jadi tidak ditampilkan sebagai diskon.
 */
const MAX_DISCOUNT_PERCENT = 95

/** langkah pembulatan Rupiah supaya harga terlihat rapi (149.900 -> 150.000). */
const PRICE_STEP = 100

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/** Bulatkan ke ribuan terdekat untuk tampilan Rupiah. */
export function roundPrice(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(value / PRICE_STEP) * PRICE_STEP)
}

/**
 * Tentukan harga coret dan persentase diskon.
 *
 * Sumber harga coret, berurutan prioritas:
 *   1. `discount_price` — mengikuti semantik osCommerce `products_discount`,
 *      yaitu harga khusus (bukan persen).
 *   2. `list_price` — harga sebelum diskon kalau backend sudah menghitungnya.
 *
 * Persentase dihitung dari selisih kedua harga. Kalau backend sudah mengirim
 * `discount_percent`, angka itu dipakai langsung (dibatasi MAX).
 *
 * Syarat supaya diskon ditampilkan: ada harga coret yang benar-benar lebih
 * besar dari harga jual, dan persentasenya masuk 1..95. Kalau tidak, kartu
 * hanya menampilkan harga biasa supaya tidak menampilkan diskon palsu.
 */
export function resolveDiscount(product: Product): ResolvedDiscount {
  const finalPrice = roundPrice(Number(product.price) || 0)

  const candidate =
    [product.discount_price, product.list_price].find(
      (value) => isPositiveNumber(value) && value > product.price
    ) ?? null

  const listPrice = candidate === null ? null : roundPrice(candidate)

  let percent: number | null = null

  if (isPositiveNumber(product.discount_percent)) {
    percent = Math.round(product.discount_percent)
  } else if (listPrice !== null && listPrice > finalPrice) {
    percent = Math.round(((listPrice - finalPrice) / listPrice) * 100)
  }

  if (percent !== null && (percent <= 0 || percent > MAX_DISCOUNT_PERCENT)) {
    percent = null
  }

  const hasDiscount = percent !== null && listPrice !== null

  return {
    finalPrice,
    listPrice: hasDiscount ? listPrice : null,
    percent: hasDiscount ? percent : null,
    hasDiscount,
  }
}

/**
 * Label jumlah terjual. Ambil dari data asli kalau ada, kalau tidak null
 * supaya pemanggil bisa menyembunyikan elemennya.
 */
export function soldLabel(sold: number | null | undefined): string | null {
  if (!isPositiveNumber(sold)) {
    return null
  }

  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Math.round(sold))
}