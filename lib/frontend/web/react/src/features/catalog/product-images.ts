/**
 * Pool gambar produk.
 *
 * Kenapa bukan foto produk:
 * API storefront tidak mengirim `products_image` sama sekali (seluruh 75
 * produk bernilai null), jadi kartu akan kosong. Yang benar-benar tersedia
 * hanya aset banner milik tiap channel, dan itu sudah dipakai untuk carousel
 * di atas. Jadi gambar kartu memakai aset yang sama, dipilih sesuai isi nama
 * produk supaya tidak terlihat acak.
 *
 * PENTING: ini placeholder, bukan foto produk yang benar. Begitu backend
 * mulai mengirim `products_image`, `pickProductImage` tidak lagi dipakai
 * karena pemanggilnya hanya jalan saat `product.image` masih kosong.
 */
import { catalogUrl } from '../../lib/api-client'

/**
 * Aset banner dilayani PHP di <catalogBase>/images/banners/..., bukan di base
 * path React (/osc414/react-assets/).
 *
 * Prefix kanal SENGAJA tidak ikut. Argumen `channel` cuma sebagai label pool.
 * Alasannya: `furniture/`, `watch/`, dan seterusnya adalah Windows Junction ke
 * root, jadi `furniture/images/banners/x` dan `images/banners/x` menunjuk file
 * yang sama persis. Menempelkan nama kanal di URL hanya menambah satu segmen
 * yang tidak melakukan apa-apa, dan yang lebih berbahaya, di kanal furniture
 * `catalogBase` sudah berisi `/furniture` sehingga hasilnya
 * `/osc414/furniture/furniture/...`.
 *
 * Base-nya diambil dari runtime config (ReactShell.php), bukan konstanta Vite,
 * supaya ikut berubah saat path kanal berubah. Lihat docs/migrasi-kanal-react.md
 * A8.
 */
function channelAsset(_channel: string, path: string): string {
  return catalogUrl(`images/banners/${path}`)
}

/** Perabot dan interior. */
const FURNITURE = [
  channelAsset('furniture', '111/bedroom-silverstrike.webp'),
  channelAsset('furniture', '111/dining-triple.webp'),
  channelAsset('furniture', '113/bedroom-triple.webp'),
  channelAsset('furniture', '112/lounge-triple.webp'),
  channelAsset('furniture', '113/lounge-chelsea.webp'),
]

/** Jam tangan dan aksesori. */
const WATCH = [
  channelAsset('watch', '141/watch1.webp'),
  channelAsset('watch', '142/watch2.webp'),
  channelAsset('watch', '142/tracker.webp'),
  channelAsset('watch', '143/topImg.webp'),
]

/**
 * Printer, toner, dan consumable dipakai bersama semua channel karena
 * produk Epson ada di katalog.
 */
const PRINTER = [
  channelAsset('printshop', '122/auto-duplex.webp'),
  channelAsset('printshop', '120/auto-two-side.webp'),
  channelAsset('printshop', '128/printer-cons.webp'),
  channelAsset('printshop', '129/toners.webp'),
]

/** Saklar dan kemasan. */
const B2B = [
  channelAsset('b2b-supermarket', '130/main-banner.webp'),
  channelAsset('b2b-supermarket', '124/banner-middle.webp'),
  channelAsset('b2b-supermarket', '138/smartBannerTop.webp'),
  channelAsset('b2b-supermarket', '139/middleBanner.webp'),
  channelAsset('b2b-supermarket', '140/bottomBanner.webp'),
]

const ALL = [...FURNITURE, ...WATCH, ...PRINTER, ...B2B]

/**
 * Kata kunci ke pool gambar. Dicek berurutan, yang pertama cocok dipakai.
 * */
const RULES: Array<{ pool: string[]; match: RegExp }> = [
  {
    pool: PRINTER,
    match: /(printer|epson|toner|cartridge|ink|scanner|copier|duplex)/i,
  },
  {
    pool: WATCH,
    match: /(watch|jam tangan|chrono|strap)/i,
  },
  {
    pool: FURNITURE,
    match: /(bedroom|dining|lounge|sofa|table|chair|kabinet|furniture|kamar|\bbed\b)/i,
  },
  {
    pool: B2B,
    match: /(pack|supermarket|grosir|box|pcs|set|sambel|santan|minyak|beras)/i,
  },
]

/** Hash string jadi integer non-negatif supaya pemilihan gambar stabil. */
function hash(value: string | number): number {
  let result = 0
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    result = (result << 5) - result + text.charCodeAt(index)
    result |= 0
  }
  return Math.abs(result)
}

export function pickProductImage(name: string, seed: number): string {
  for (const rule of RULES) {
    if (rule.match.test(name || '')) {
      return rule.pool[hash(seed) % rule.pool.length]
    }
  }

  return ALL[hash(seed) % ALL.length]
}