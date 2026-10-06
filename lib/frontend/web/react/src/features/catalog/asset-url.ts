/**
 * URL untuk aset statis di folder `static/`.
 *
 * Dev:  BASE_URL = "/"        -> /img/banner-furniture.svg
 * Prod: BASE_URL = "/osc414/react-assets/"
 *
 * Wajib lewat helper ini, bukan path absolut, karena base path produksi
 * berbeda dengan dev.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  return `${base}${normalized}`
}