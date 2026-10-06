# PRD --- Migrasi Frontend osCommerce 4.1.4 ke React dengan Logika Marketplace Modern

**Versi:** 2.0\
**Status:** Draft untuk review teknis\
**Tanggal:** 3 Oktober 2026\
**Basis:** PRD migrasi osCommerce 4.1.4 (fork Trueloaded), Yii2
Advanced, Smarty, MySQL\
**Tujuan:** Memodernisasi frontend toko dengan React sambil
mempertahankan backend, database, session, dan panel admin yang sudah
ada.

> Dokumen ini mengadopsi pola alur e-commerce umum yang ditemukan pada
> marketplace seperti Shopee dan Tokopedia. Dokumen ini bukan
> spesifikasi internal kedua platform dan tidak menyatakan bahwa seluruh
> fitur atau kebijakan mereka ditiru identik. Aturan yang memerlukan
> dukungan backend, tabel, atau integrasi yang belum diverifikasi
> ditandai sebagai **perlu audit**.

------------------------------------------------------------------------

## 1. Ringkasan Eksekutif

Proyek memigrasikan frontend toko osCommerce 4.1.4 dari template Smarty
ke React menggunakan pendekatan hybrid. Backend PHP/Yii2, model domain
yang ada, database MySQL, URL manager, session pelanggan, dan admin
panel dipertahankan.

Frontend React akan berkomunikasi dengan endpoint API same-origin yang
dibangun pada controller Yii2. Integrasi wajib menjaga kompatibilitas
dengan halaman PHP lama selama dan setelah migrasi.

Target pengalaman pengguna mengikuti pola e-commerce modern: - menemukan
dan mengevaluasi produk; - mengelola varian, wishlist, dan keranjang; -
checkout dengan alamat, pengiriman, promo jika didukung, serta ringkasan
biaya; - membayar melalui metode yang tersedia, termasuk rencana
integrasi Midtrans Snap; - memantau status pesanan dan pengiriman; -
mengajukan pembatalan, retur, atau refund sesuai kebijakan toko dan
kemampuan backend; - memberi ulasan setelah memenuhi syarat; - menerima
pemberitahuan penting mengenai akun dan transaksi.

**Prinsip utama:** pertahankan data dan perilaku bisnis yang sudah
berjalan. Jangan membuat fitur baru seolah-olah tersedia jika belum
diverifikasi pada aplikasi, model, tabel, atau integrasi saat ini.

## 2. Konteks Sistem Saat Ini

Fakta dari audit awal yang menjadi dasar dokumen:

  -----------------------------------------------------------------------
  Area                                Kondisi
  ----------------------------------- -----------------------------------
  Aplikasi                            osCommerce 4.1.4, fork Trueloaded

  Framework backend                   Yii2 Advanced

  View lama                           Smarty

  Controller frontend                 Namespace `frontend\controllers`

  Model domain                        Berada di `lib/common/models/`

  Database                            MySQL, database `osc414`, 384 tabel
                                      berdasarkan audit awal

  URL                                 `TlUrlManager` dan `TlUrlRule`

  Keranjang                           `global $cart`, terkait PHP session

  Payment terpasang                   MultiSafepay, PayPal, RBS Worldpay

  Payment Midtrans Snap               Belum terpasang pada audit awal;
                                      perlu implementasi dan verifikasi

  REST API bawaan                     Belum tersedia sebagai API yang
                                      siap digunakan; stub yang ditemukan
                                      belum cukup

  Admin panel                         PHP lama, tetap di luar cakupan
                                      migrasi
  -----------------------------------------------------------------------

Angka dan kondisi di atas harus diverifikasi kembali pada branch dan
lingkungan implementasi sebelum perubahan dilakukan.

## 3. Masalah yang Ingin Diselesaikan

1.  Frontend berbasis 153 template Smarty sulit dikembangkan dan
    dirawat.
2.  Struktur page-builder dan file konfigurasi tema menyulitkan iterasi
    UI.
3.  Frontend perlu dimodernisasi tanpa kehilangan data dan tanpa rewrite
    total.
4.  Integrasi frontend baru berisiko memecah kompatibilitas session,
    keranjang, checkout, pembayaran, dan URL lama.
5.  Persyaratan bisnis transaksi belum terdokumentasi secara menyeluruh,
    terutama kondisi gagal, retry, pembatalan, retur, dan refund.

## 4. Tujuan dan Ukuran Keberhasilan

### 4.1 Tujuan

-   Memigrasikan halaman toko secara bertahap ke React.
-   Mempertahankan seluruh data produk, kategori, pelanggan, alamat, dan
    pesanan.
-   Menjaga integrasi dengan backend Yii2, model lama, dan session PHP.
-   Menjaga halaman admin lama tetap dapat mengelola produk dan pesanan.
-   Membuat perilaku transaksi dapat diuji melalui acceptance criteria
    dan pengujian end-to-end.
-   Meningkatkan pengalaman pencarian, katalog, keranjang, checkout, dan
    pelacakan pesanan.

### 4.2 Indikator keberhasilan

-   Tidak ada kehilangan atau duplikasi data akibat migrasi frontend.
-   Perubahan keranjang dari React dan halaman PHP lama terlihat
    konsisten.
-   Endpoint privat hanya mengembalikan data yang berhak diakses
    pelanggan terkait.
-   Nilai harga, diskon, ongkir, pajak jika berlaku, dan total
    diverifikasi di server.
-   Callback pembayaran diverifikasi dan aman terhadap notifikasi
    berulang.
-   Status pesanan tidak melompat ke status yang tidak valid.
-   URL penting lama tetap dapat diakses atau diarahkan dengan benar.
-   Tidak ada regresi kritis pada admin panel dan integrasi yang sudah
    berjalan.
-   Tidak ada error baru yang belum ditangani pada log aplikasi.

Target numerik performa, ketersediaan, dan error rate ditentukan setelah
baseline produksi diukur; jangan menetapkan angka tanpa pengukuran awal.

## 5. Ruang Lingkup

### 5.1 Termasuk

1.  Homepage dan navigasi toko.
2.  Katalog, kategori, pencarian, filter, sorting, dan pagination.
3.  Detail produk, gambar, varian/atribut jika didukung, produk terkait,
    rating/review jika tersedia.
4.  Wishlist.
5.  Registrasi, login, logout, profil, address book, dan riwayat
    pesanan.
6.  Keranjang dan estimasi pengiriman.
7.  Checkout multi-tahap sesuai perilaku `CheckoutController` yang ada.
8.  Integrasi Midtrans Snap sebagai metode pembayaran baru, setelah
    desain teknis dan sandbox disetujui.
9.  Halaman status pesanan dan pengiriman berdasarkan data/integrasi
    yang tersedia.
10. Pembatalan, retur, refund, promo/voucher, notifikasi, dan ulasan
    **hanya setelah audit mengonfirmasi dukungan data, kebijakan, dan
    backend**. Jika belum tersedia, fitur menjadi pengembangan terpisah,
    bukan asumsi migrasi.
11. Pengujian kompatibilitas frontend React dengan halaman PHP lama.
12. Aksesibilitas dasar, responsivitas, SEO, keamanan, logging, dan
    monitoring.

### 5.2 Tidak termasuk dalam migrasi inti

-   Rewrite admin panel.
-   Rewrite seluruh model domain.
-   Perubahan skema database tanpa persetujuan formal.
-   Migrasi ke Shopify, WooCommerce, atau platform lain.
-   Multi-store batch pertama sebelum keputusan ruang lingkup.
-   Implementasi sistem dompet/escrow milik platform sendiri.
-   Implementasi layanan kurir, gateway pembayaran, atau sistem chat
    baru tanpa persetujuan terpisah.
-   Menyalin kode, desain, kebijakan internal, atau implementasi
    proprietary Shopee/Tokopedia.

### 5.3 Kebijakan perubahan skema

PRD awal melarang perubahan skema database. Larangan tersebut
dipertahankan untuk migrasi inti. Namun, fitur baru seperti refund
terstruktur, audit trail, idempotency key persisten, atau pusat sengketa
mungkin membutuhkan penyimpanan tambahan. Jika audit membuktikan
kebutuhan tersebut tidak dapat dipenuhi oleh skema yang ada, tim harus
mengajukan **Change Request** terpisah dengan: - alasan bisnis dan
teknis; - tabel/kolom yang dibutuhkan; - risiko migrasi dan rollback; -
dampak ke admin panel dan laporan; - persetujuan pemilik sebelum
implementasi.

Jangan menyimpan data transaksi penting hanya di frontend untuk
menghindari perubahan skema.

## 6. Prinsip Arsitektur

### 6.1 Arsitektur target

``` text
Browser
  |
  | GET halaman toko
  v
Apache + PHP/Yii2
  |-- HTML shell / metadata / data awal aman
  |-- asset React hasil build Vite
  |
  | XHR same-origin /api/*
  v
Yii2 API controllers
  |-- autentikasi dan otorisasi
  |-- validasi request dan CSRF
  |-- memanggil model/domain yang sudah ada
  |-- memetakan response JSON
  v
Model/domain osCommerce + MySQL
  |
  +-- payment provider (Midtrans Snap dan provider lama)
  +-- shipping integration yang sudah ada
```

### 6.2 Keputusan yang mengikat

1.  **Same-origin wajib** untuk halaman yang menggunakan session,
    keranjang, checkout, atau akun.
2.  **PHP session tetap menjadi sumber sesi autentikasi dan keranjang**
    selama migrasi.
3.  **Jangan menambahkan JWT hanya untuk frontend React** tanpa
    keputusan arsitektur terpisah.
4.  **Preload JSON hanya untuk data yang aman ditampilkan ke pengguna
    tersebut.** Jangan menyisipkan rahasia, token payment, data
    pelanggan lain, atau informasi internal.
5.  **CSRF wajib tetap aktif** untuk operasi yang mengubah state sesuai
    mekanisme aplikasi.
6.  API mengembalikan JSON konsisten dan tidak mencampurkan HTML,
    warning PHP, debug output, atau redirect login ke body JSON.
7.  Controller API tidak boleh melewati validasi domain yang dibutuhkan
    hanya demi membuat endpoint lebih mudah.
8.  Frontend tidak dipercaya sebagai sumber harga, diskon, ongkir, stok,
    hak akses, atau status pembayaran.
9.  Endpoint API baru harus eksplisit, memiliki autentikasi/otorisasi
    sesuai kebutuhan, validasi input, dan penanganan error.
10. React tidak boleh menjadi sumber kebenaran transaksi; server/domain
    tetap menjadi sumber kebenaran.

### 6.3 Response API yang disarankan

Gunakan bentuk konsisten, disesuaikan dengan konvensi proyek yang ada:

``` json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Untuk error:

``` json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Periksa kembali data yang dikirim.",
    "fields": {}
  }
}
```

Jangan membocorkan stack trace, SQL, secret, path server, atau detail
internal pada response produksi.

## 7. Peran dan Hak Akses

  -----------------------------------------------------------------------
  Peran                               Akses utama
  ----------------------------------- -----------------------------------
  Pengunjung                          Melihat katalog, mencari produk,
                                      melihat detail, menggunakan fitur
                                      publik

  Pelanggan login                     Mengelola profil/alamat, wishlist,
                                      keranjang, checkout, pesanan
                                      sendiri, dan tindakan yang
                                      diizinkan

  Penjual/operator toko               Menggunakan kemampuan pengelolaan
                                      yang telah tersedia pada admin
                                      panel lama

  Admin                               Tetap menggunakan admin panel lama;
                                      tidak dimigrasikan pada batch ini

  Payment provider                    Mengirim notifikasi
                                      server-to-server yang harus
                                      diverifikasi

  Sistem pengiriman                   Menyediakan data ongkir/status
                                      melalui integrasi yang telah
                                      dikonfigurasi
  -----------------------------------------------------------------------

Jangan menganggap adanya akun penjual mandiri atau dashboard
multi-seller. Arsitektur saat ini adalah toko osCommerce; model
multi-vendor harus diputuskan terpisah.

## 8. Kebutuhan Fungsional dan Acceptance Criteria

### Batch 0 --- Audit, kontrak API, dan baseline

**Tujuan:** mengurangi risiko sebelum endpoint atau UI baru dibuat.

Persyaratan: - Inventarisasi route, controller, model, tabel,
event/hook, session, dan perilaku checkout yang benar-benar dipakai. -
Dokumentasikan tujuh tahap checkout yang disebut pada sistem lama
berdasarkan kode aktual. - Uji dampak constructor `Sceleton`,
`Restriction::verifyAddress()`, dan hook `frontend/sceleton/construct`
pada endpoint JSON. - Tentukan routing `/api/*` tanpa tertelan
`TlUrlRule`. - Catat perilaku URL lama, SEO metadata, canonical, dan
redirect. - Buat baseline pengujian katalog, login, cart, checkout,
payment lama, dan admin. - Buat kontrak request/response API serta
daftar error.

**Acceptance criteria:** - Setiap endpoint yang direncanakan memiliki
controller/model sumber yang sudah diidentifikasi. - Tidak ada endpoint
yang dibuat berdasarkan asumsi satuan timestamp, relasi model, atau
struktur tabel yang belum diverifikasi. - Route API dapat merespons JSON
bersih pada kondisi berhasil maupun gagal. - Ada rencana rollback dan
daftar smoke test untuk setiap batch.

### Batch 1 --- Homepage, katalog, dan pencarian

Cakupan: - Homepage, navigasi, kategori, daftar produk, pencarian,
filter, sorting, pagination. - Data awal dapat di-preload dari PHP jika
aman dan bermanfaat. - URL produk/kategori lama tetap berfungsi melalui
React route atau redirect yang teruji.

Acceptance criteria: - Data produk, harga tampilan, gambar, kategori,
dan ketersediaan sesuai dengan sistem lama. - Filter dan sorting dapat
digabung tanpa menghasilkan hasil yang salah. - Pagination memiliki
batas page size dan penanganan halaman kosong. - Query pencarian
memvalidasi input dan tidak membentuk SQL melalui string concatenation
yang tidak aman. - Empty state, loading state, dan error state
tersedia. - Endpoint read-only tidak mengubah session cart atau state
pesanan. - SEO title, description, canonical, status HTTP, dan indeksasi
diuji pada halaman yang dimigrasikan. - Performa diukur pada data
representatif; tidak ada target numerik yang ditetapkan tanpa baseline.

### Batch 2 --- Detail produk

Cakupan: - Detail produk, gambar/galeri, atribut/varian jika didukung,
stok/ketersediaan, related products, review/rating jika tersedia,
wishlist.

Acceptance criteria: - ID/slug produk tidak valid menghasilkan 404 atau
response yang sesuai, bukan error server. - Harga, atribut, dan status
stok yang ditampilkan berasal dari server. - Perubahan varian
memperbarui harga/stok hanya jika model lama mendukungnya. - Gambar
menggunakan mekanisme/image controller yang kompatibel dengan sistem
lama. - Rating dan jumlah review cocok dengan data sumber. - Review
tidak dapat dibuat oleh pelanggan yang tidak memenuhi syarat, jika
aturan tersebut didukung. - Tambah/hapus wishlist memerlukan autentikasi
dan hanya mengubah wishlist milik pengguna terkait. - Request berulang
tidak menghasilkan data wishlist duplikat jika model mendukung
constraint atau operasi idempoten.

### Batch 3 --- Akun dan alamat

Cakupan: - Registrasi, login, logout, profil, address book, riwayat
pesanan, wishlist. - Session PHP lama dipertahankan.

Acceptance criteria: - Password tidak pernah dikirim kembali dalam
response atau dicatat ke log. - Endpoint profil dan alamat memverifikasi
pemilik data di sisi server. - Riwayat pesanan hanya menampilkan pesanan
pelanggan yang sedang login. - Logout mengakhiri sesi sesuai perilaku
backend. - Session cookie memakai konfigurasi keamanan yang sesuai
dengan HTTPS dan deployment. - CSRF divalidasi untuk operasi yang
mengubah state. - Login gagal memberikan pesan yang tidak membocorkan
apakah akun tertentu terdaftar, jika kebijakan keamanan aplikasi
mengharuskannya. - Redirect setelah login hanya menuju tujuan yang
diizinkan; cegah open redirect. - Rate limiting/penanganan percobaan
login dilakukan melalui kemampuan yang tersedia atau diajukan sebagai
peningkatan terpisah.

### Batch 4 --- Keranjang dan estimasi pengiriman

Cakupan: - Tambah item, ubah kuantitas, hapus item, pilih item untuk
checkout jika didukung, ringkasan keranjang, estimasi ongkir. - React
dan halaman PHP lama berbagi state keranjang melalui PHP session.

Acceptance criteria: - Item yang ditambahkan dari React terbaca oleh
halaman PHP lama, dan sebaliknya. - Harga item, atribut, dan jumlah
dihitung ulang/divalidasi server. - Kuantitas nol, negatif, pecahan yang
tidak sah, atau melebihi batas ditolak. - Stok divalidasi saat
menambah/mengubah keranjang dan divalidasi ulang saat checkout. - Produk
tidak tersedia atau berubah harga ditandai jelas sebelum checkout. -
Badge jumlah keranjang konsisten setelah aksi berhasil dan setelah
refresh. - Request berulang tidak menggandakan item atau operasi secara
tidak sengaja. - Jika memakai idempotency key, validasi dan penyimpanan
key harus dilakukan di server; jangan hanya mengandalkan debounce
frontend. - Estimasi ongkir memakai `ShippingOptions` atau integrasi
yang telah diverifikasi. - Kegagalan menghitung ongkir tidak boleh
menghasilkan total final palsu. - Perubahan keranjang bersamaan
ditangani dengan validasi ulang dan pesan konflik yang jelas.

### Batch 5 --- Checkout

Cakupan: - Checkout multi-step sesuai urutan dan aturan
`CheckoutController` aktual. - Alamat pengiriman, metode pengiriman,
biaya, ringkasan, data pembeli, dan konfirmasi pesanan. - Promo/voucher
hanya ditampilkan jika sistem memiliki dukungan terverifikasi.

Acceptance criteria: - Checkout hanya dapat dilakukan oleh pengguna yang
memenuhi aturan autentikasi aplikasi. - Server memvalidasi ulang produk,
atribut, harga, stok, alamat, metode pengiriman, diskon, pajak jika
berlaku, dan total. - Browser tidak dapat menentukan nilai final dengan
mengirim ulang total yang telah dimodifikasi. - Alamat wajib lengkap dan
dapat digunakan untuk metode pengiriman yang dipilih. - Total akhir
memiliki rincian subtotal, diskon, ongkir, pajak/biaya lain jika
berlaku, dan total pembayaran. - Harga atau stok yang berubah sejak item
masuk keranjang ditampilkan kepada pelanggan dan perlu dikonfirmasi
sesuai aturan bisnis. - Pesanan tidak dibuat dua kali karena
double-click, retry jaringan, atau refresh. - Kegagalan pada salah satu
tahap tidak meninggalkan pesanan setengah jadi tanpa status yang dapat
dipulihkan. - Data pribadi tidak dikirim ke log atau response yang tidak
berkepentingan. - Pengguna mendapat ringkasan pesanan sebelum
mengonfirmasi pembayaran.

### Batch 6 --- Pembayaran dan Midtrans Snap

Cakupan: - Integrasi Midtrans Snap melalui server. - Pertahankan payment
provider lama yang masih digunakan. - Sandbox end-to-end sebelum
aktivasi produksi.

Acceptance criteria: - Token/parameter transaksi dibuat melalui backend
dengan secret yang tidak pernah masuk ke bundle React. - Nilai transaksi
yang dikirim ke provider dihitung dan diverifikasi server. - Endpoint
notification/callback memverifikasi signature sesuai dokumentasi resmi
provider dan memvalidasi order reference serta nominal. - Status
pembayaran tidak boleh ditandai berhasil hanya karena browser diarahkan
ke halaman sukses. - Notifikasi duplikat aman diproses berulang tanpa
menggandakan efek. - Status tertunda, berhasil, gagal, dibatalkan, dan
kedaluwarsa dipetakan ke status internal yang terdokumentasi. -
Notifikasi terlambat atau tidak berurutan tidak boleh menurunkan status
final secara tidak sah. - Kegagalan komunikasi dengan provider memiliki
mekanisme retry/reconciliation yang aman. - Jangan menganggap pembayaran
sukses sebagai bukti barang telah dikirim. - Uji sandbox mencakup
sukses, gagal, pending, expired, callback duplikat, signature tidak
valid, nominal tidak cocok, dan timeout. - Go-live mensyaratkan
persetujuan pemilik, konfigurasi secret produksi, monitoring, serta
prosedur rekonsiliasi. - Transaksi produksi nyata hanya dilakukan dalam
rencana uji yang disetujui pemilik dan sesuai prosedur finansial; bukan
sebagai syarat otomatis tanpa otorisasi.

### Batch 7 --- Pemenuhan pesanan dan pelacakan

Cakupan: - Halaman detail pesanan dan timeline status. - Status
pengiriman dari integrasi yang sudah tersedia. - Pengiriman nomor resi
dan estimasi tiba jika sumber data mendukungnya.

Acceptance criteria: - Status ditampilkan berdasarkan sumber data
server, bukan state lokal React. - Nomor resi, kurir, dan event tracking
hanya ditampilkan bila tersedia. - Status pengiriman yang terlambat,
gagal, atau tidak diketahui memiliki tampilan yang jelas. - Pengguna
hanya melihat detail pesanan miliknya. - Perubahan status tercatat
dengan timestamp dan sumber perubahan jika sistem mendukung audit
trail. - Tidak mengarang status tracking jika integrasi kurir tidak
memberikan data. - Perubahan status pesanan mengikuti state transition
yang sah.

### Batch 8 --- Pembatalan, retur, refund, dan komplain

**Status: perlu audit kemampuan backend, kebijakan toko, dan payment
provider sebelum dikomit sebagai fitur migrasi.**

Persyaratan yang harus ditentukan: - Kondisi pembatalan yang
diperbolehkan: belum dibayar, sudah dibayar tetapi belum diproses, sudah
dikirim, atau kondisi lain. - Siapa yang dapat mengajukan dan menyetujui
pembatalan. - Alasan pembatalan dan batas waktu. - Apakah retur barang
diwajibkan atau refund tanpa retur diperbolehkan untuk kondisi
tertentu. - Bukti yang dibutuhkan, batas waktu pengajuan, dan cara
komunikasi. - Penanganan refund penuh/sebagian, biaya pengiriman,
promo/voucher, dan metode pengembalian dana. - Status pengajuan, SLA
respons, eskalasi, dan penyelesaian sengketa. - Dampak terhadap stok,
pesanan, pembayaran, dan laporan.

Acceptance criteria minimum jika fitur disetujui: - Setiap pengajuan
mempunyai ID dan status yang dapat dilacak. - Hanya pihak berwenang
dapat menyetujui/menolak pengajuan. - Refund tidak dapat melebihi
nominal yang dapat dikembalikan dan tidak boleh diproses dua kali. -
Refund provider dan status internal direkonsiliasi. - Stok hanya
dikembalikan sesuai kebijakan dan titik proses yang ditentukan. - Bukti
dan alasan divalidasi serta dibatasi aksesnya. - Pengguna mendapat
pemberitahuan atas perubahan status. - Konflik pembeli-penjual/operator
memiliki proses peninjauan yang terdokumentasi. - Kebijakan dan tenggat
waktu tidak boleh di-hardcode berdasarkan asumsi; harus disetujui
pemilik dan disesuaikan dengan aturan yang berlaku.

### Batch 9 --- Promo/voucher, notifikasi, dan review

**Status: audit terlebih dahulu; tidak semua fitur diasumsikan ada dalam
skema saat ini.**

#### Promo/voucher

-   Validasi periode aktif, minimum transaksi, produk/kategori yang
    memenuhi syarat, batas penggunaan, kombinasi promo, dan kuota jika
    didukung.
-   Semua perhitungan dilakukan server-side.
-   Aturan penggunaan ulang dan pengembalian voucher setelah
    pembatalan/refund harus ditetapkan oleh pemilik.
-   Perubahan nilai promo sebelum pembayaran harus divalidasi ulang.

#### Notifikasi

-   Trigger untuk pesanan dibuat, pembayaran terkonfirmasi, pesanan
    diproses/dikirim, pembatalan, dan hasil refund jika fitur tersedia.
-   Notifikasi tidak boleh menyertakan data sensitif yang tidak
    diperlukan.
-   Kegagalan email/notifikasi tidak boleh membatalkan transaksi yang
    telah berhasil.
-   Retry notifikasi tidak boleh menggandakan transaksi bisnis.

#### Review

-   Tentukan apakah review hanya bisa diberikan untuk item yang
    benar-benar dibeli dan memenuhi status yang disyaratkan.
-   Validasi rating, panjang teks, konten, spam, dan kepemilikan
    pesanan.
-   Edit/hapus/moderasi mengikuti kebijakan toko.
-   Jangan menampilkan jumlah/rating yang berbeda dari sumber data
    resmi.

### Batch 10 --- SEO, aksesibilitas, observabilitas, dan stabilisasi

Acceptance criteria: - URL lama dipetakan dan diuji; redirect tidak
membentuk loop. - Metadata, canonical, robots, sitemap, structured data
jika didukung, dan status HTTP diperiksa. - Navigasi keyboard, label
input, fokus dialog, kontras, dan pesan error dapat digunakan. - Log
memuat request ID, endpoint, status, dan durasi tanpa password, token,
secret, atau data pembayaran sensitif. - Ada monitoring untuk error API,
kegagalan checkout, callback payment, dan ketidaksesuaian status. - Ada
prosedur rollback build frontend. - Uji regresi dilakukan pada Chrome
dan ukuran layar utama yang disepakati. - Admin lama tetap dapat login,
mengubah produk, dan melihat pesanan. - Tidak ada perubahan yang tidak
disetujui pada model domain, database, atau URL manager.

## 9. State Machine Pesanan dan Pembayaran

Status persis harus dipetakan ke enum/kolom yang benar-benar dipakai
osCommerce. Diagram berikut adalah model konseptual, bukan klaim bahwa
status tersebut sudah tersedia di database.

``` text
Cart
  |
  v
Checkout Validation
  |-- validation failed --> kembali ke keranjang/checkout
  |
  v
Order Created / Awaiting Payment
  |-- payment failed/expired --> Failed/Cancelled sesuai aturan
  |-- payment pending -------> Awaiting Confirmation
  |-- payment success -------> Paid
                                |
                                v
                            Processing
                                |
                                v
                             Shipped
                                |
                                v
                            Delivered
                                |
                                v
                            Completed
```

Alur pengecualian yang perlu dimodelkan secara terpisah: - pembatalan
sebelum pemrosesan; - pembatalan setelah pembayaran; - penjual tidak
dapat memenuhi pesanan; - pengiriman gagal atau paket hilang; -
pengajuan retur/refund; - refund sebagian/penuh; - sengketa yang sedang
ditinjau.

Aturan transisi: 1. Setiap transisi memiliki status awal, status tujuan,
aktor yang diizinkan, prasyarat, dan efek samping. 2. Status pembayaran
dan status pemenuhan pesanan adalah dua konsep berbeda. 3. Perubahan
status dilakukan server-side. 4. Callback provider harus idempoten. 5.
Status final tidak boleh ditimpa oleh event lama tanpa aturan
rekonsiliasi eksplisit. 6. Perubahan status harus dapat ditelusuri
melalui log/audit trail yang tersedia atau diajukan sebagai peningkatan.

## 10. Kontrak API dan Keamanan

Setiap endpoint harus memiliki dokumentasi: - method dan path; -
autentikasi dan otorisasi; - CSRF requirement; - request schema dan
validasi; - response schema; - status HTTP dan error code; - efek
samping; - idempotensi dan retry behavior; - rate limit jika relevan; -
log/monitoring; - sumber model/tabel.

Checklist keamanan: - validasi input di server; - parameterized
query/ORM aman; - otorisasi per resource, bukan hanya menyembunyikan
tombol; - CSRF pada request yang mengubah state; - session cookie aman
pada HTTPS; - output encoding untuk mencegah XSS; - perlindungan
terhadap IDOR pada alamat, wishlist, dan pesanan; - secret payment hanya
di server; - verifikasi signature callback; - validasi nominal dan order
reference; - redaksi data sensitif di log; - pembatasan ukuran dan tipe
file bukti jika upload retur diimplementasikan; - error response tidak
membocorkan detail internal.

## 11. Data dan Kompatibilitas

-   Database yang ada menjadi sumber data utama.
-   Tidak ada penghapusan atau transformasi massal data untuk kebutuhan
    frontend.
-   Jangan menebak relasi, satuan timestamp, status pesanan, atau format
    atribut.
-   Lakukan mapping eksplisit antara struktur domain lama dan response
    API.
-   Perubahan yang dilakukan admin PHP harus tercermin di frontend
    setelah reload atau mekanisme cache yang disepakati.
-   React tidak boleh menyimpan salinan state bisnis yang menjadi tidak
    konsisten dengan server.
-   Cache katalog boleh digunakan setelah strategi invalidasi
    ditentukan; jangan menerapkan cache yang menampilkan harga atau stok
    usang pada saat checkout.
-   Migrasi batch harus backward-compatible sejauh mungkin dan memiliki
    rollback.

## 12. Pengujian Wajib

### Unit dan integrasi

-   validasi request;
-   otorisasi resource;
-   kalkulasi total;
-   stok dan kuantitas;
-   transisi status;
-   pemetaan callback payment;
-   idempotensi;
-   CSRF;
-   response error.

### End-to-end

-   pengunjung mencari produk dan melihat detail;
-   pelanggan login, menambah keranjang, lalu membuka halaman PHP lama;
-   pelanggan mengubah alamat dan ongkir;
-   stok berubah sebelum checkout;
-   harga berubah sebelum pembayaran;
-   pembayaran sukses, pending, gagal, dan kedaluwarsa;
-   callback payment duplikat dan callback signature invalid;
-   request checkout diulang akibat timeout;
-   pengguna mencoba membuka pesanan pelanggan lain;
-   admin mengubah produk/pesanan setelah frontend React digunakan;
-   URL lama, refresh halaman, back/forward browser, dan deep link;
-   pembatalan/refund hanya jika fitur tersebut telah disetujui dan
    diimplementasikan.

### Kriteria rilis

-   tidak ada bug kritis/tinggi yang belum memiliki mitigasi dan
    persetujuan risiko;
-   semua acceptance criteria batch terkait lulus;
-   smoke test checkout dan payment lulus pada lingkungan yang sesuai;
-   backup dan rollback telah diuji;
-   log dan monitoring tersedia;
-   pemilik menyetujui aktivasi produksi.

## 13. Deployment dan Rollback

-   Build Vite disajikan oleh Apache pada origin yang sama dengan PHP.
-   Jangan gunakan Vite dev server untuk alur cart, akun, checkout, atau
    pembayaran.
-   Deploy per batch dengan feature flag atau mekanisme route switch
    jika memungkinkan.
-   Siapkan backup artefak frontend sebelumnya.
-   Jika terjadi regresi transaksi, alihkan route terkait kembali ke
    halaman PHP lama selama kompatibilitasnya masih tersedia.
-   Jangan melakukan rollback dengan menghapus data pesanan atau
    mengubah skema database secara tidak terencana.
-   Setelah deploy, jalankan smoke test dan pantau log, checkout,
    callback, serta laporan error.

## 14. Guardrails

Tanpa persetujuan tertulis: - jangan mengubah skema database; - jangan
mengedit `lib/common/models/` kecuali bug blocker yang terbukti; -
jangan mengganti `TlUrlManager`, `TlUrlRule`, atau `TlSmarty`; - jangan
menonaktifkan CSRF; - jangan mengekspos secret payment ke frontend; -
jangan menggunakan Vite dev server untuk transaksi yang bergantung pada
session; - jangan menjalankan `composer install` atau
`composer update`; - jangan menimpa README root; - jangan mengubah admin
panel; - jangan menghapus atau mengubah data produksi untuk keperluan
pengujian; - jangan mengaktifkan Midtrans produksi sebelum pengujian
sandbox, konfigurasi secret, monitoring, dan persetujuan pemilik
selesai.

## 15. Pertanyaan Terbuka dan Keputusan yang Diperlukan

  --------------------------------------------------------------------------------
  ID                      Pertanyaan                       Pemblokir
  ----------------------- -------------------------------- -----------------------
  Q1                      Apakah constructor `Sceleton`    Batch 0--1
                          dan hook menghasilkan            
                          output/redirect yang mengganggu  
                          JSON?                            

  Q2                      Bagaimana route `/api/*`         Batch 0--1
                          didaftarkan tanpa tertelan       
                          `TlUrlRule`?                     

  Q3                      Apakah                           Batch 0--1
                          `Restriction::verifyAddress()`   
                          dapat mengarahkan request API?   

  Q4                      Apakah empat toko tambahan       Semua batch
                          termasuk batch pertama?          

  Q5                      Apa satuan timestamp dan format  Batch 1--2
                          atribut produk pada model        
                          aktual?                          

  Q6                      Apa urutan tujuh tahap checkout  Batch 5
                          aktual dan efek samping tiap     
                          tahap?                           

  Q7                      Apa pemetaan status order dan    Batch 5--7
                          payment lama?                    

  Q8                      Apakah schema saat ini mendukung Batch terkait
                          idempotensi, audit trail,        
                          refund, promo, dan review?       

  Q9                      Bagaimana Midtrans token,        Batch 6
                          notification, status mapping,    
                          dan reconciliation dirancang     
                          sesuai dokumentasi resmi?        

  Q10                     Integrasi shipping mana yang     Batch 4 dan 7
                          aktif dan dapat menyediakan      
                          tracking?                        

  Q11                     Apa kebijakan resmi pembatalan,  Batch 8--9
                          retur, refund, voucher, dan      
                          komplain toko?                   

  Q12                     Apakah perlu Change Request      Sebelum fitur baru yang
                          untuk perubahan skema atau tabel memerlukannya
                          pendukung?                       

  Q13                     Bagaimana strategi rollback      Sebelum rilis
                          route React ke PHP untuk tiap    
                          batch?                           
  --------------------------------------------------------------------------------

## 16. Definition of Done

Sebuah batch dianggap selesai jika: 1. Seluruh acceptance criteria batch
telah diuji dan disetujui. 2. `docs/README.md` mencatat status dan
tanggal penyelesaian. 3. Perubahan database/model/URL manager sesuai
guardrails dan persetujuan. 4. Admin panel lama tetap berfungsi. 5. URL
dan SEO halaman yang dimigrasikan telah diuji. 6. Tidak ada error baru
yang belum ditangani pada log runtime. 7. Uji regresi lintas halaman PHP
dan React lulus. 8. Dokumentasi API, keputusan arsitektur, dan cara
rollback diperbarui. 9. Tidak ada secret atau data pribadi sensitif yang
masuk ke bundle/log. 10. Pemilik menyetujui rilis batch.

## 17. Rencana Implementasi

Urutan yang disarankan: 1. Batch 0 --- audit dan baseline. 2. Batch 1
--- katalog dan pencarian. 3. Batch 2 --- detail produk. 4. Batch 3 ---
akun. 5. Batch 4 --- keranjang. 6. Batch 5 --- checkout. 7. Batch 6 ---
Midtrans Snap dan rekonsiliasi. 8. Batch 7 --- status pesanan dan
pengiriman. 9. Batch 8--9 --- retur/refund, promo, notifikasi, review
setelah audit dan persetujuan ruang lingkup. 10. Batch 10 ---
stabilisasi dan rilis.

Urutan tersebut mengutamakan kompatibilitas dan keselamatan transaksi.
Batch 8--9 tidak otomatis masuk rilis migrasi inti bila membutuhkan
perubahan skema atau kebijakan bisnis baru.

## 18. Referensi dan Batasan

-   PRD awal migrasi osCommerce 4.1.4 ke React (Hybrid), bertanggal 3
    Oktober 2026.
-   Dokumentasi resmi Midtrans Snap dan notifikasi server-to-server
    wajib digunakan saat implementasi; verifikasi signature, status
    transaksi, dan nominal mengikuti dokumentasi versi yang berlaku.
-   Pusat Bantuan Shopee Indonesia menunjukkan bahwa pembatalan,
    retur/refund, pelacakan, serta perlakuan voucher memiliki aturan dan
    kondisi masing-masing. Aturan spesifik Shopee tidak boleh otomatis
    disalin ke toko ini; kebijakan toko sendiri harus ditentukan.
-   Fitur, kebijakan, dan pengalaman Tokopedia/Shopee dapat berubah. PRD
    ini menggunakan keduanya sebagai referensi pola e-commerce umum,
    bukan jaminan kesamaan fitur, aturan, maupun implementasi internal.

------------------------------------------------------------------------

**Catatan keputusan:** PRD ini memperluas kebutuhan bisnis agar lebih
lengkap seperti marketplace modern, tetapi tetap mempertahankan
keputusan arsitektur hybrid pada dokumen awal. Setiap fitur baru yang
tidak didukung oleh sistem saat ini harus melalui audit dan persetujuan
perubahan ruang lingkup sebelum dikembangkan.
