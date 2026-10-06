/**
 * Mata uang tampilan.
 *
 * Default toko memakai Rupiah, jadi nilai di sini overriding currency yang
 * dikirim API storefront.
 *
 * PENTING: ini hanya mengubah FORMAT tampilan, bukan nilai harga. Tidak ada
 * konversi kurs yang terjadi. Angka yang tampil sama persis dengan angka di
 * database, hanya label dan pemformatannya yang memakai Rupiah.
 *
 * Kalau yang benar-benar dibutuhkan adalah konversi GBP ke IDR, itu harus
 * lewat konfigurasi currency storefront di admin (atau tabel kurs), bukan di
 * sisi klien.
 */
export const DISPLAY_CURRENCY = 'IDR'

export const CURRENCY_LOCALE = 'id-ID'