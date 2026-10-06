/**
 * Sumber tunggal untuk nilai path yang dipakai router React.
 *
 * basename router HARUS sama dengan tempat aplikasi benar-benar dilayani.
 * Kalau tidak, React Router tidak merender apa pun dan hasilnya layar putih
 * dengan warning "is not able to match the URL" di console.
 *
 * Tiga lingkungan itu berbeda:
 *  - development: Vite melayani aplikasi dari root-nya sendiri ("/"), dan
 *    request /osc414/* diteruskan ke Apache lewat proxy. Jadi basename "/".
 *  - production toko utama: shell disajikan PHP dari path instalasi
 *    ("/osc414/"), jadi basename "/osc414".
 *  - production kanal: shell disajikan untuk /osc414/furniture, jadi basename
 *    "/osc414/furniture".
 *
 * Dua kasus production itu tidak bisa dibedakan dari satu build, jadi basename
 * diambil dari ReactShell.php lewat window.__OSC_STOREFRONT__.catalogBase.
 * Nilai itu dihitung dari request yang sedang berjalan.
 *
 * Di development nilai konstanta VITE_CATALOG_BASE tetap dipakai untuk membuat
 * URL absolut tujuan navigasi ke halaman PHP (catalog, cart, account, kanal).
 * URL itu absolute supaya di development tetap mendarat di Apache, bukan di
 * Vite.
 */
import { storefrontConfig } from './storefront-config'

export const routerBasename = import.meta.env.DEV ? '/' : storefrontConfig().catalogBase