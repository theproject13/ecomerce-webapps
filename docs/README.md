# JEMBATAN — Migrasi Frontend osCommerce 4.1.4 ke React (Hybrid)

> **Dokumen ini adalah "single source of truth" untuk sesi opencode.**
> Opencode WAJIB membaca dokumen ini sebelum menjalankan aksi apa pun.
> Tidak menyentuh `README.md` root. Admin panel (`admin/`) tidak disentuh.

Terakhir diperbarui: 2026-10-04
PRD: `docs/PRD.md`

——

## 1. Aturan Main

- **Satu batch, satu aksi.** Hanya kerjakan batch yang berstatus `AKTIF`. Jangan loncat.
- **Same-origin wajib.** Build Vite melayani Apache, bukan dev server `:5173` untuk cart/checkout.
- **Jangan ubah database.** Tidak ada `ALTER TABLE`, tidak ada kolom baru.
- **Jangan sentuh core domain.** Tidak mengedit `lib/common/models/` kecuali bug blocker yang terbukti.
- **Jangan sentuh core loader.** Tidak mengganti `TlUrlManager`, `TlUrlRule`, `TlSmarty`.
- **CSRF tetap hidup.** Tidak mengaktifkan `$enableCsrfValidation = false`.
- **Build dulu, bukan dev.** Verifikasi build React (statis) bisa dilayani Apache sebelum dianggap selesai.
- **Gate-driven.** Semua item pada checklist batch harus `OK` sebelum `TUTUP` batch.
- **Homepage designs.**Approval desain homepage bersifat eksplisit. Jangan ubah file visual homepage tanpa perintah.

——

## 2. Status Batch

| Batch | Nama | Risiko | Status | Mulai | Selesai | Catatan |
|---|---|---|---|---|---|---|
| **1** | Katalog | 🟢 rendah | `SELESAI (read-only)` | 2026-10-03 | 2026-10-03 | Homepage React + `api/storefront/dashboard`, `api/catalog/categories`. Listing/filter/search masih `PendingPage`. |
| **2** | Detail Produk | 🟡 sedang | `SELESAI (read-only)` | 2026-10-04 | 2026-10-04 | `api/product/detail` + halaman `/product-detail?id=`. Reviews/wishlist/varian tidak dikerjakan, lihat §3. |
| **4a** | CTA Keranjang | 🟠 tinggi | `SELESAI (add only)` | 2026-10-05 | 2026-10-05 | `api/cart/csrf` + `api/cart/add`; tombol "Tambah ke keranjang" dan "Beli sekarang" di halaman detail. Cart/checkout tetap PHP. |
| **3** | Akun | 🟠 tinggi | `SELESAI (login/logout/registrasi/profil/riwayat)` | 2026-10-06 | 2026-10-06 | login/logout/registrasi/profil/riwayat pesanan via `api/account/*`. Alamat & edit profil/reset password masih ditautkan ke halaman PHP (di luar cakupan). |
| **4b** | Keranjang (halaman + update/remove) | 🟠 tinggi | `SELESAI (halaman React)` | 2026-10-06 | 2026-10-06 | `/shopping-cart` jadi React di toko utama + kanal, update/remove + badge real-time + estimasi ongkir (CSRF ketat). Smoke via curl lulus; varian/required attribute belum (lihat Gate-5). |
| **5** | Checkout + payment (modul existing) | 🔴 tertinggi | `AKTIF` | 2026-10-07 | — | flow lengkap + mapping modul pembayaran existing (cod, offline, multisafepay, paypal, stripe, sagepay) |

**Aturan:** Hanya satu batch boleh `AKTIF` pada satu waktu.

> **Pencatatan status di atas tidak menandai gate sebagai lengkap.** Gate-1 dan Gate-3
> masih punya item terbuka; lihat §4 dan §7. Status batch di sini berarti "pekerjaan
> yang disepakati sudah dikerjakan", bukan "semua kriteria penerimaan terpenuhi".

——

## 3. Hasil Audit Database (2026-10-04)

Audit dijalankan langsung ke database `osc414`. Angka inilah yang menentukan kenapa Batch 2
dipangkas, dan tidak boleh diasumsikan berubah tanpa audit ulang.

| Tabel / hal | Nilai | Konsekuensi |
|---|---|---|
| `products` (aktif) | 75 | — |
| `products_description` | 600 | Deskripsi tersedia |
| `products.products_image` | **null untuk 75/75** | Kolom lama tidak dipakai. Gambar asli ada di `products_images` (164 baris, 75 default) + `products_images_description` (328). **Bug sisi homepage:** `StorefrontController` masih membaca kolom lama, itu sebabnya kartu produk memakai placeholder. |
| `reviews` | **0** | Reviews tidak bisa dibangun tanpa data. |
| `products_attributes` | **0** | Varian/atribut tidak ada. |
| `products_options` | **0** | Opsi produk tidak ada. |
| `products_xsell` | **0** | Related products tidak ada. |
| Tabel wishlist | **tidak ada** | Butuh skema baru → dilarang di batch ini. |
| `properties_to_products` | 173 | Spesifikasi bisa dibangun. |
| `categories` (aktif) | 18, dengan 78 relasi | Breadcrumb bisa dibangun. |

**Currency.** `Currencies::systemCurrencyCode()` mengembalikan `GBP`, dan `USE_MARKET_PRICES`
bernilai `False` sehingga core tidak melakukan konversi. Jadi `products_price` dibaca apa
adanya dalam mata uang toko. `src/lib/currency.ts` sengaja menimpanya dengan `DISPLAY_CURRENCY = 'IDR'`
(hanya format, tanpa konversi) — keputusan yang sudah ada sebelumnya, **bukan** diperkenalkan Batch 2.
Akibatnya storefront menampilkan "Rp247" untuk nominal GBP 247.41. Konversi nyata harus lewat
konfigurasi currency di admin / tabel kurs, **bukan** sisi klien. Perlu keputusan owner.

——

## 4. Gate Checklist

### GATE-1 (pra-Batch 1 — validasi lingkungan)

- [x] `docs/PRD.md` dibaca & dipahami
- [x] Skill `php-oscommerce`, `php-yii2-rest-api`, `osc414-react-migration` ter-load
- [x] Struktur `lib/frontend/components/{TlUrlManager,TlUrlRule}.php` benar
- [x] `Sceleton.php` ditemukan; CSRF behavior diperiksa
- [x] Hook `frontend/sceleton/construct` tidak memblokir JSON (Q1)
- [x] `Restriction::verifyAddress()` diuji empiris ke route `/api/*` (Q3)
- [x] Aturan URL `/api/*` vs `TlUrlRule` sudah ada di `config/main.php` (Q2)
- [x] Cakupan 4 toko tambahan diputuskan (Q4)
- [x] Field price diverifikasi lewat helper core, bukan asumsi (Q5)

### GATE-2 (Batch 1 — katalog)

- [x] Endpoint read-only: `/api/storefront/dashboard`, `/api/catalog/categories`
- [x] React mount di shell, storefront homepage melayani React
- [ ] Pagination/filter/sorting berfungsi — **belum**, listing masih `PendingPage`
- [ ] URL lama tetap valid
- [x] Admin panel tidak rusak
- [x] Tidak ada perubahan database/models
- [ ] Log runtime bersih
- [ ] Semua acceptance criteria Batch 1 terpenuhi

### GATE-3 (Batch 2 — detail, scope read-only)

- [x] Endpoint detail produk read-only: `GET /api/product/detail?id=<products_id>`
- [x] 404 untuk produk tidak ada, id non-angka, dan produk nonaktif
- [x] Harga dihitung server-side lewat `Product::getPiceDetails()`, bukan kolom mentah
- [x] Stok lewat `Product::get_products_stock()` + `StockIndication`
- [x] Galeri dari `products_images` via `Images::getImageList()`
- [x] Spesifikasi dari `properties_to_products` + `generate_properties_tree()`
- [x] Breadcrumb dari rantai kategori ancestor
- [x] Halaman React `/product-detail?id=` + komponen, styling pakai token yang ada
- [x] Typecheck + build Vite sukses, dilayani Apache
- [x] Render terverifikasi headless: produk normal, produk diskon, dan 404
- [x] Homepage tidak berubah (18 kartu, hero, banner, channel entries masih utuh)
- [x] Batas hybrid utuh: URL SEO produk & kategori tetap dilayani PHP
- [ ] Reviews — **tidak dikerjakan**, tabel kosong (§3)
- [ ] Wishlist (write) + CSRF — **tidak dikerjakan**, tidak ada tabel (§3)
- [ ] Atribut/varian — **tidak dikerjakan**, tabel kosong (§3)
- [ ] `<link rel="canonical">` — **tidak dikerjakan**, harus	server-side agar konsisten dengan URL SEO PHP
- [ ] related products — **tidak dikerjakan**, `products_xsell` kosong

### GATE-4 (Batch 3 — akun)

- [x] Session PHP tetap berlaku (same-origin) — login/register/logout lewat `api/account/*` memakai session yang sama; `api/account/session` membaca status login
- [x] Riwayat pesanan hanya milik user — `actionOrders` memfilter `customers_id` dari session, bukan input klien; guest → `401`
- [x] CSRF pada POST — token dari `GET /api/account/csrf`, validasi Yii tetap aktif
- [x] Redirect login benar — guest overview/orders → `401` + `redirect.login`; sukses → `redirect.account`; logout → `redirect.home`
- [x] Konstanta bahasa form dimuat di konteks API — `Translation::init('checkout/login','account/create','account/login')`; sebelumnya login gagal memicu `Undefined constant ...TEXT_LOGIN_ERROR` (500), kini `ok=false` + `field_errors`

### GATE-5 (Batch 4 — keranjang)

Bagian yang sudah selesai (4a, add only):

- [x] Add konsisten PHP <-> React: `POST /api/cart/add` menulis ke `shopping_cart`
      yang sama, terbukti produk muncul di `/shopping-cart` PHP
- [x] CSRF pada POST, token dari `GET /api/cart/csrf` (bukan dari runtime config)
- [x] `405` untuk GET, `422` untuk produk rusak
- [x] Tombol "Tambah ke keranjang" dan "Beli sekarang" di halaman detail React
- [x] Tidak ada regresi Batch 1-3: smoke `100/100`

Selesai 4b (2026-10-06, diverifikasi smoke via curl):

- [x] Update qty dan remove di halaman `/shopping-cart` — `POST /api/cart/update` (uprid + qty) dan `POST /api/cart/remove` (uprid); terverifikasi count 2→1→5→0
- [x] Badge header real-time — `CartContext` + `useCart().refresh()`; CTA detail memanggil refresh sebelum navigasi
- [x] Estimasi ongkir berfungsi — `GET/POST /api/cart/estimate` membungkus `OrderManager`; guest: country+post_code, login: sendto; POST `estimate[shipping]` memilih metode; `totals`/`shipping_quotes`/`selected` dari server
- [x] Tidak duplikasi item saat qty ditambah berkali-kali — `add_cart` core memanggil `update_quantity` (set qty, bukan tambah), baris tetap satu (uprid=61: 2→1→5); konsisten dengan theme PHP
- [ ] Atribut/varian untuk produk yang punya required attribute — belum dikerjakan

### GATE-6 (Batch 5 — checkout + payment)

- [ ] Urutan checkout sama dengan `CheckoutController`
- [ ] Mapping modul payment existing (cod, offline, multisafepay, paypal_partner, stripe_checkout, sage_pay_server)
- [ ] Callback payment terverifikasi
- [ ] Transaksi sandbox sukses
- [ ] Transaksi produksi OK (1x) — **hanya setelah gate lengkap**

——

## 5. Urutan Eksekusi Perintah (untuk opencode)

Opencode HARUS mengikuti urutan ini.

1. **LOAD** skill: `php-oscommerce`, `php-yii2-rest-api`, `osc414-react-migration`
2. **BACA** `docs/PRD.md` dan `docs/README.md`
3. **VALIDASI** gate yang relevan untuk batch berjalan
4. **BUAT** base API controller di `lib/frontend/controllers/api/` (ikuti pola `Sceleton`, bukan disable CSRF)
5. **KERJAKAN** hanya batch yang disepakati
6. **UJI** lokal (Apache) — bukan hanya `php -l`
7. **UPDATE** kartu batch dan checklist gate secara eksplisit
8. **BERHENTI** dan lapor. Jangan lanjut batch berikutnya tanpa perintah

——

## 6. Pertanyaan Terbuka (Q1-Q6)

| Kode | Pertanyaan | Target | Status |
|---|---|---|---|
| **Q1** | Apakah hook `frontend/sceleton/construct` menghasilkan output saat request JSON? | Batch 1 | `SUDAH_DIJAWAB` — Ya. Untuk route `/api/*` diuji empiris: endpoint storefront dan categories sama-sama balas 200 `application/json`, jadi hook tidak merusak respons di environment ini. |
| **Q2** | Aturan URL `/api/*`: eksplisit sebelum `TlUrlRule`? | Batch 1 | `SUDAH_DIJAWAB` — WAJIB sebelum `TlUrlRule`. Sudah ada di `lib/frontend/config/main.php`. |
| **Q3** | `Restriction::verifyAddress()` boleh dilewati untuk `/api/*`? | Batch 1 | `SUDAH_DIJAWAB` — Tidak perlu diubah. Dipanggil tanpa syarat di `Sceleton`, tapi endpoint existing tetap 200, jadi dalam environment ini tidak memblokir. **Jangan ubah `Sceleton` tanpa persetujuan.** |
| **Q4** | 4 toko tambahan ikut dimigrasikan? | Batch 1 | `SUDAH_DIJAWAB` — DITUNDA. `ReactShell::isMainPlatform()` juga menolak platform selain id 1. |
| **Q5** | Format harga produk — field mana yang dipakai? | Batch 1 | `SUDAH_DIJAWAB` — Harga **tidak boleh** dibaca dari `products_price`. `ProductsContainer` sudah menjalankan `get_products_price()` yang menghasilkan `Price::getInstance()->getProductPrice()`, dan `Product::getPiceDetails()` menerapkan pajak + diskon. Verified: produk 61 `products_price` 49 dengan special 35 → `value` 35, `old_value` 49. |
| **Q6** | Midtrans Snap: token dari server atau client-side? | Batch 5 | `DITUNDA` |
| **Q7** | Kurs GBP ke IDR: konversi di backend atau di klien? | Batch 2 | `TERBUKA` - Rekaman GBP tampil sebagai "Rp247" karena `USE_MARKET_PRICES=False` dan `DISPLAY_CURRENCY` disetel IDR. Perlu keputusan owner: set currency toko di admin, atau ubah `DISPLAY_CURRENCY`. |
| **Q7** | Kurs GBP ke IDR: konversi di backend atau di klien? | Batch 2 | `TERBUKA` - Rekaman GBP tampil sebagai "Rp247" karena `USE_MARKET_PRICES=False` dan `DISPLAY_CURRENCY='IDR'`. Perlu keputusan owner: set currency toko di admin, atau ubah `DISPLAY_CURRENCY`. |
| **Q9** | Deskripsi produk: teks bersih atau HTML tersanitasi? | Batch 2 | `TERBUKA` — Batch 2 meratakan `products_description` jadi teks (`lib/sanitize-html.ts`) karena tidak ada pustaka sanitizer dan `dangerouslySetInnerHTML` tidak aman. Formatting-rich butuh DOMPurify. |

——

## 7. Utang Technical yang Tertunda

| Item | Lokasi | Dampak |
|---|---|---|
| Gambar produk null di homepage | `api/StorefrontController.php` | Kartu produk di homepage memakai placeholder banner, bukan foto produk. Sengaja **tidak** disentuh: memperbaiki `image` akan mengubah tampilan homepage yang sudah disetujui. |
| `container` / `section` undefined | tidak ada di CSS mana pun | Dipakai `ErrorBoundary` dan `PendingPage`, jadi dua halaman itu tanpa max-width/padding. |
| Deskripsi produk diratakan | `src/lib/sanitize-html.ts` | `<strong>`, `<ul>`, `<a>` berubah jadi teks. Lihat Q9. |
| Halaman PHP produk kosong | tema | `/osc414/<slug>` merespons 200 tapi tanpa konten. |

——

## 8. Struktur File Penting

| Path | Kegunaan |
|---|---|
| `lib/frontend/controllers/Sceleton.php` | Base controller — **baca, jangan ubah** |
| `lib/frontend/controllers/ApiController.php` | Stub API lama — **tidak dipakai** |
| `lib/frontend/controllers/api/BaseApiController.php` | Base API (JSON envelope) |
| `lib/frontend/controllers/api/StorefrontController.php` | Feed homepage — **batch 1, jangan ubah tanpa persetujuan** |
| `lib/frontend/controllers/api/ProductController.php` | Detail produk read-only (Batch 2) |
| `lib/frontend/controllers/api/CartController.php` | `cart/csrf` + `cart/add` (Batch 4a) |
| `lib/frontend/components/TlUrlManager.php` | URL manager — **baca, jangan ubah** |
| `lib/frontend/components/TlUrlRule.php` | URL rule — **baca, jangan ubah** |
| `lib/frontend/web/react/ReactShell.php` | Allowlist path React (nama, bukan pola) |
| `lib/common/models/*.php` | Model domain — **hanya baca** |
| `lib/common/helpers/Product.php` | `getPiceDetails()`, `get_products_stock()`, `get_product_path()` |
| `lib/common/classes/Images.php` | URL & galeri produk |
| `lib/frontend/themes/basic/*.tpl` | Template Smarty lama — **referensi** |
| `themes/*/` | Theme root — **referensi struktur** |
| `ext/modules/payment/` | Modul payment eksisting — **referensi** |
| `includes/local/configure.php` | Konfigurasi DB — **baca** |

——

## 9. Perintah Cepat untuk Sesi Berikutnya

```text
Kamu adalah opencode yang menjalankan migrasi ini.
Pertama, load skill: php-oscommerce, php-yii2-rest-api, osc414-react-migration.
Kedua, baca docs/PRD.md dan docs/README.md.
Ketiga, baca tabel status batch di section 2 dan neraca utang teknis di section 7.
Keempat, kerjakan hanya batch yang diminta. Jangan memperlebar scope sendiri.
Kelima, verifikasi lewat HTTP (Apache), bukan hanya php -l atau tsc.
Keenam, update status batch dan checklist gate secara eksplisit, lalu BERHENTI.
```
