import type { Product } from '../../types/api'
import { roundPrice } from '../../lib/pricing'
import { pickProductImage } from './product-images'

/**
 * ============================================================================
 * DATA CONTOH UNTUK KARTU PRODUK  --  MATI SEBAGAI FILE INI DIHAPUS
 * ============================================================================
 *
 * Backend saat ini belum mengirim harga coret, diskon, rating, jumlah terjual,
 * lokasi, dan nama seller. Tanpa data itu kartu terlihat ramping dan tidak
 * mewakili desain yang diinginkan.
 *
 * Isi file ini adalah DATA PALSU yang sengaja dan jelas ditandai, supaya
 * tampilan kartu bisa lengkap sekarang. Angkanya BUKAN data bisnis asli dan
 * tidak boleh dipakai untuk keputusan apa pun.
 *
 * Cara menyalakan/tematikan:
 *   - `USE_DEMO_CARD_DATA = true`  -> kartu memakai data contoh
 *   - `USE_DEMO_CARD_DATA = false` -> kartu hanya menampilkan data asli
 *
 * Yang diisi akan hilang dengan sendirinya begitu backend mulai mengirim
 * `discount_price`, `rating`, `sold`, `location`, atau `seller`, karena
 * `fillDemoCard` hanya mengisi field yang masih kosong.
 *
 * Cara menghapus file ini dengan aman:
 *   1. backend sudah mengirim semua field di atas
 *   2. set USE_DEMO_CARD_DATA = false
 *   3. hapus panggilan fillDemoCard() di features/catalog/api.ts
 *   4. hapus file ini
 */
export const USE_DEMO_CARD_DATA = true

const CITIES = [
  'Jakarta',
  'Bandung',
  'Surabaya',
  'Medan',
  'Makassar',
  'Semarang',
  'Denpasar',
  'Palembang',
  'Yogyakarta',
  'Balikpapan',
] as const

const SELLER_SUFFIX = ['Official Store', 'Mart', 'Grosir', 'Karya', 'Sentosa', 'Utama'] as const

/**
 * PRNG deterministik (LCG). Sengaja bukan Math.random() supaya angkanya
 * stabil: produk yang sama selalu dapat rating, terjual, dan kota yang sama
 * di setiap render. Kalau random, kartu akan berkedip ganti-ganti tiap re-render.
 */
function hash(seed: number): number {
  const x = Math.abs(Math.trunc(seed)) % 2147483647
  return ((x === 0 ? 12345 : x) * 16807) % 2147483647
}

function pick<T>(seed: number, values: readonly T[]): T {
  return values[hash(seed) % values.length]
}

function between(seed: number, min: number, max: number): number {
  return min + (hash(seed) % (max - min + 1))
}

function missing(value: unknown): boolean {
  return value === undefined || value === null
}

/**
 * Isi field kartu yang masih kosong dengan data contoh.
 *
 * Hanya mengisi yang kosong, jadi data asli dari backend selalu menang.
 */
export function fillDemoCard(product: Product): Product {
  if (!USE_DEMO_CARD_DATA) {
    return product
  }

  const seed = product.products_id
  const filled: Product = { ...product }

// Gambar produk. API sama sekali tidak mengirim `products_image`, jadi kartu
  // akan kosong. Fallback memakai aset banner kanal yang sudah ada, dipilih
  // berdasarkan isi nama produk. Placeholder, bukan foto produk yang benar.
  if (missing(product.image)) {
    filled.image = pickProductImage(product.name, product.products_id)
  }

  // Harga coret + diskon. Multiplier 1,2x - 1,7x supaya persentasenya
  // bervariasi dan selalu di atas nol. roundPrice menjaga supaya harga coret
  // tetap bulat dan tetap lebih besar dari harga jual.
  if (missing(product.list_price) && missing(product.discount_price)) {
    const multiplier = 1.2 + (hash(seed) % 50) / 100
    const listPrice = roundPrice(product.price * multiplier)

    if (listPrice > product.price) {
      filled.list_price = listPrice
    }
  }

  if (missing(product.rating)) {
    // 4,0 - 5,0
    filled.rating = Math.round((4 + (hash(seed) % 11) / 10) * 10) / 10
  }

  if (missing(product.rating_count)) {
    filled.rating_count = between(seed + 1, 12, 940)
  }

  if (missing(product.sold)) {
    filled.sold = between(seed + 2, 8, 3200)
  }

  if (missing(product.location)) {
    filled.location = pick(seed + 3, CITIES)
  }

  if (missing(product.seller)) {
    filled.seller = {
      name: `${pick(seed + 4, CITIES)} ${pick(seed + 5, SELLER_SUFFIX)}`,
      url: null,
      verified: hash(seed + 6) % 3 !== 0,
    }
  }

  return filled
}