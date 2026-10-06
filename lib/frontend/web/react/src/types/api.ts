export type ApiEnvelope<TItems> = {
  items: TItems
  meta: Record<string, unknown>
  error: null | { message: string }
}

export type Channel = {
  platform_id: number
  name: string
  url: string | null
  logo: string | null
}

/**
 * Kategori storefront.
 *
 * Endpoint kategori saat ini hanya mengirim id/status/tanggal, jadi `name`
 * belum terisi. Sifatnya opsional supaya frontend tidak perlu diubah lagi
 * kalau nanti backend mulai mengirim nama.
 */
export type Category = {
  category_id?: number
  name?: string
  url?: string | null
  image?: string | null
  product_count?: number
}

/**
 * Data produk untuk kartu.
 *
 * Semua field tampilan opsional (harga coret, diskon, rating, terjual,
 * lokasi, seller) belum tentu ada di API. Kartu merender elemennya secara
 * kondisional, jadiadding field baru cukup di backend tanpa bikin layout
 * jebol.
 */
export type Product = {
  products_id: number
  name: string
  summary?: string
  price: number
  quantity: number
  in_stock: boolean
  image: string | null
  url: string | null

  /** Harga coret. Null kalau produk tidak sedang diskon. */
  list_price?: number | null
  /**
   * Harga khusus / harga diskon. Mengikuti semantik osCommerce
   * `products_discount`: nilai harga, bukan persentase.
   */
  discount_price?: number | null
  /** Persentase diskon, misal 20 = 20%. Kalau absen, dihitung dari list_price. */
  discount_percent?: number | null

  rating?: number | null
  rating_count?: number | null
  sold?: number | null
  location?: string | null

  seller?: {
    name: string
    url?: string | null
    verified?: boolean
  } | null
}

export type FeaturedProduct = Product

export type DashboardItems = {
  channels: Channel[]
  featured: FeaturedProduct[]
}

export type DashboardMeta = {
  platform_id: number
  store_name: string
  currency: string
  channel_count: number
  featured_count: number
}

export type DashboardPayload = {
  channels: Channel[]
  featured: FeaturedProduct[]
  categories: Category[]
  meta: DashboardMeta
}

/** Hasil baca session PHP. Hanya berisi nama tampilan, bukan data kontak. */
export type SessionState = {
  logged_in: boolean
  display_name: string
  initial: string
}

/* ===== DETAIL PRODUK ===== */

/**
 * Harga detail.
 *
 * `value` adalah harga akhir yang harus dibayar, sudah termasuk pajak sesuai
 * DISPLAY_PRICE_WITH_TAX dan sudah berada di mata uang tampilan hasil core.
 * `old_value` adalah harga coret dan hanya meaningful kalau `has_special`.
 *
 * `currency` adalah kode mata uang dari core. Frontend tetap memformat dengan
 * DISPLAY_CURRENCY (lihat lib/currency.ts), jadi nilai ini informatif.
 */
export type ProductPrice = {
  value: number
  old_value: number
  has_special: boolean
  currency: string
}

export type ProductStock = {
  quantity: number
  in_stock: boolean
  /** Kode stok dari StockIndication, contoh "in-stock" atau "out-of-stock". */
  stock_code: string | null
  can_add_to_cart: boolean
}

/** Satu gambar dari tabel products_images, bukan kolom products_image. */
export type ProductImage = {
  id: number
  url: string
  thumb: string
  alt: string
  is_default: boolean
}

export type ProductSpecification = {
  name: string
  values: string[]
}

/** Referensi kategori, dipakai untuk breadcrumb dan label kategori utama. */
export type ProductCategoryRef = {
  category_id: number
  name: string
  url: string | null
}

export type ProductManufacturer = {
  manufacturers_id: number
  name: string
  url: string | null
}

/**
 * Detail produk dari api/product/detail.
 *
 * reviews, atribut/varian, related products, dan wishlist sengaja tidak ada
 * di sini karena tabelnya kosong di instalasi ini. Lihat docs/README.md.
 */
export type ProductDetail = {
  products_id: number
  name: string
  model: string
  /** Deskripsi pendek. Bisa kosong walau produk punya deskripsi panjang. */
  summary: string
  /** HTML dari products_description, lihat lib/sanitize-html.ts sebelum dirender. */
  description: string
  /** URL SEO produk dari tema PHP. */
  url: string | null
  price: ProductPrice
  stock: ProductStock
  images: ProductImage[]
  specifications: ProductSpecification[]
  category: ProductCategoryRef | null
  /** Ancestor dari kategori utama sampai kategori itu sendiri. */
  breadcrumb: ProductCategoryRef[]
  /** ean / isbn / asin / upc yang terisi. */
  identifiers: Record<string, string>
  manufacturer: ProductManufacturer | null
}

export type ProductDetailMeta = {
  platform_id: number
  currency: string
}

export type ProductDetailPayload = {
  items: ProductDetail
  meta: ProductDetailMeta
}

/* ===== KATALOG ===== */

/** Urutan hasil katalog. Nilainya dikirim apa adanya ke API. */
export type CatalogSort = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'

export type CatalogScope = 'all' | 'featured'

export type CatalogMeta = {
  platform_id: number
  platform_name: string
  currency: string
  total_count: number
  page: number
  per_page: number
  total_pages: number
  sort: CatalogSort
  scope: CatalogScope
  keywords: string
  category_id: number | null
}

/**
 * Kategori yang dipakai filter katalog.
 *
 * Berbeda dengan `Category` dari /api/catalog/categories: nama sudah terisi dan
 * product_count dihitung per kanal, jadi hanya kategori yang punya produk di
 * kanal aktif yang dikirim.
 */
export type CatalogCategory = {
  category_id: number
  parent_id: number
  name: string
  product_count: number
  url: string | null
}

export type CatalogCategoriesMeta = {
  platform_id: number
  currency: string
  total_count: number
}

export type CatalogQuery = {
  page?: number
  perPage?: number
  sort?: CatalogSort
  scope?: CatalogScope
  keywords?: string
  categoryId?: number | null
}

export type CatalogPayload = {
  items: Product[]
  meta: CatalogMeta
}
