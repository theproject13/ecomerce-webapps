import { catalogUrl, channelUrl } from './api-client'

/**
 * Peta URL storefront PHP. Semua nilai di sini sudah diverifikasi terhadap
 * lib/frontend/config/main.php dan includes/filenames.php, jadi jangan
 * menebak path: pakai konstanta ini di komponen.
 */
export const routes = {
  home: '',
  featured: 'catalog/featured-products',
  search: 'catalog/all-products',
  cart: 'shopping-cart',
  login: 'account/login',
  logoff: 'account/logoff',
  register: 'account/create',
  account: 'account/edit',
  accountOverview: 'account',
  orders: 'account/history',
  addresses: 'account/address-book',
  contact: 'contact',
  furniture: 'furniture',
  watch: 'watch',
  b2b: 'b2b-supermarket',
  printshop: 'printshop',
  productDetail: 'product-detail',
} as const

/**
 * Path relatif halaman detail produk.
 *
 * Detail produk dilayani shell React dan terdaftar di
 * ReactShell::$reactPaths. URL SEO dari tema PHP (mis.
 * /osc414/epson-ecotank-et-m2120) sengaja tidak dipakai di sini: path itu
 * dilayani PHP theme, sehingga shoppers mendarat di luar React.
 *
 * Path relatif, bukan URL absolut, supaya shopper tetap berada di mount
 * kanal saat ini (/furniture/product-detail?id=40 pada masa depan).
 */
export function productPath(productsId: number): string {
  return `${routes.productDetail}?id=${productsId}`
}

export function routeUrl(path: string): string {
  return catalogUrl(path)
}

/**
 * URL untuk halaman kanal lain (furniture, watch, b2b, printshop).
 *
 * Pakai channelUrl(), bukan routeUrl(). routeUrl() menempelkan path ke
 * catalogBase, dan di kanal furniture itu sudah berisi /furniture, sehingga
 * banner hero yang menunjuk kanal furniture sendiri akan berakhir di
 * /osc414/furniture/furniture.
 *
 * Halaman kanal lain sengaja memakai channelUrl() juga. Kalau shopper di
 * /furniture clicks "Watch", tujuan yang benar adalah /osc414/watch, bukan
 * /osc414/furniture/watch yang tidak ada.
 */
export function channelRouteUrl(path: string): string {
  return channelUrl(path)
}

export function searchUrl(keywords: string): string {
  const query = new URLSearchParams({ keywords })
  return catalogUrl(`${routes.search}?${query.toString()}`)
}