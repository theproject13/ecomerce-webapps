import { storefrontConfig } from './storefront-config'

/**
 * Nama brand storefront.
 *
 * Sumber utama adalah window.__OSC_STOREFRONT__.storeName yang disuntik
 * ReactShell.php. Nilai itu sengaja dikosongkan di A4 karena send() jalan
 * sebelum bootstrap platform selesai dan tidak boleh query database, jadi
 * untuk sekarang konstanta di bawah yang dipakai. Branding per kanal adalah
 * pekerjaan A8.
 *
 * Nilai di database masih bawaan osCommerce ("osCommerce Test Store") dan itu
 * bukan brand yang mau ditampilkan. Kalau suatu saat nama toko mau dikelola
 * dari admin, hapus konstanta ini dan pakai `meta.store_name` lagi di
 * features/catalog/api.ts.
 */
export const STORE_NAME = storefrontConfig().storeName || 'osStore'