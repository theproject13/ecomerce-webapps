# Rencana Fase - Kanal ke React + Brand `ostore.com`

Status: **RANCANA. A2, FIX 1, A3, A4, A5, A6, A7 selesai 2026-10-05.**
Dibuat: 2026-10-04 | Diperbarui: 2026-10-05 setelah A2 dan A3-A7

Batch berikutnya: A8 (`product-images.ts`), A9 (A10 checklist), A10. A1 masih
menunggu keputusan owner. A11 sudah **dibatalkan** — lihat 1.1.

Smoke test: `61/61` hijau (`tests/regression/smoke-storefront.ps1`).
Acuan lain: `docs/README.md` (aturan + gate), `docs/architecture.md`, `docs/api-contracts.md`

Dokumen ini adalah acuan kerja untuk migrasi 4 kanal satellite dari PHP ke
React, pemindahan brand dari `/osc414` ke domain `ostore.com`, dan alur data
dari admin ke React.

**Seller center (buyer jadi seller) sengaja TIDAK dibahas di sini.** Diminta
ditunda; lihat `docs/PRD.md` §7 dan §5.3.

---

## 0. Ringkasan Keputusan

| Topik | Keputusan |
| --- | --- |
| Base URL | Domain `ostore.com` tanpa prefix folder `/osc414` |
| Kanal | Path tingkat atas: `/furniture`, `/watch`, `/b2b-supermarket`, `/printshop` |
| Halaman detail | **`/product-detail?id=<products_id>` (React, non-SEO).** Bukan `/<slug>` |
| Link kartu produk | Selalu ke `productPath()`, bukan `product.url` dari API. Lihat FIX 1 |
| Sifat kanal | Satu aplikasi React, 5 platform_id. Bukan 4 situs terpisah |
| Folder kanal | **Windows Junction ke root, bukan salinan.** Nol biaya disk. **Jangan dihapus.** Lihat 1.1 |
| Seller center | Ditunda, keputusan terpisah |
| Theme kanal | Punya theme sendiri yang nyata (172-239 file + varian mobile). Lihat 1.2 |
| Checkout React | **Ditunda** sampai katalog + search React selesai |
| URL SEO lama | Belum diputuskan: perlu redirect ke `/product-detail?id=` |

---

## 1. Temuan Terverifikasi

Semua di bawah ini sudah dicek langsung ke disk dan database. Nomor baris
menunjuk file di repo.
### 1.1 Keempat folder kanal adalah Windows Junction, bukan salinan

Ini koreksi terhadap temuan lama. Klaim sebelumnya bahwa keempat folder itu
"salinan penuh 646,3 MB / 62.543 file" **salah**, dan kalau dijalankan apa adanya
akan sangat berbahaya. Jadi harus dikoreksi sebelum apa pun dijalankan.

```
furniture / watch / b2b-supermarket / printshop
Attributes : Directory, ReparsePoint
Target     : C:\xampp\htdocs\osc414
Ukuran root: 831,0 MB
```

Artinya keempat folder itu **alias** ke root. Konsekuensinya:

- Tidak ada duplikasi disk. `./furniture/` dan `./` adalah file yang sama.
- Kode, theme, dan `.git` yang dilayani `/osc414/furniture/` adalah kode root.
- A5 tidak butuh rewrite Apache untuk melewati instalasi terpisah, karena tidak
  ada instalasi terpisah. React hanya perlu tahu path kanal untuk membedakan
  base URL dan memilih platform.
- `Get-ChildItem furniture -Recurse` **akan** menampilkan `furniture/watch`,
  `furniture/lib`, `furniture/themes/watch`, dan seterusnya. Itu bukan bukti
  salinan rekursif: `furniture/watch` resolve ke root, dan `root/watch` juga
  menunjuk root. Sistem file-nya berputar kembali ke root sendiri.

> **BAHAYA - JANGAN PERNAH MENJALANKAN PERINTAH HAPUS RECURSIF DI SINI.**
>
> Karena targetnya root, `Remove-Item furniture -Recurse` bukan menghapus
> folder kanal, tetapi bisa ikut menghapus isi toko utama. Perintah
> `robocopy /MIR`, `rm -rf`, dan tooling arsip atau backup yang menelusuri
> reparse point punya risiko yang sama. Yang aman: menghapus junction dengan
> `Remove-Item` **tanpa** `-Recurse`, atau `cmd /c rmdir` tanpa `/s`. Memindah
> lewat `Move-Item -Recurse` juga berisiko sama.
>
> A11 dalam versi dokumen ini sudah **DIBATALKAN** karena asumsi salinan yang
> dipunyainya tidak pernah benar. Lihat A11.

Tetap berlaku dari temuan lama:

- Semuanya memakai database yang sama: `DB_DATABASE = osc414`
- `includes/local/configure.php` komentar: *"The store URL itself is not stored here: it is auto-detected from the current request"*

**Bukti bahwa platform kanal terdeteksi dari request** (hasil A4/A5):

| URL | platformId di config | Yang menjawab |
| --- | --- | --- |
| `/osc414/` | 1 | React shell |
| `/osc414/furniture/` | 7 | React shell (`$channelPaths = ['furniture']`) |
| `/osc414/watch/` | 8 | PHP theme watch |
| `/osc414/printshop/` | 10 | PHP theme printshop |

`PLATFORM_ID` sudah benar sejak A4, dan API sudah benar sejak A7. Yang belum
benar hanya `platformName` dan `storeName` di config, karena keduanya kosong
sengaja sampai ada sumber DB tanpa risiko bootstrap (lihat A4).

**Konsekuensi:** satu aplikasi React melayani 5 platform dari satu instalasi.
Tidak ada instalasi duplikat yang perlu "digantikan" atau "diretire".

### 1.2 Tiap kanal punya theme sendiri yang nyata

Path theme yang sebenarnya adalah `<install>/themes/`, **bukan**
`lib/frontend/themes/`. Path kedua itu kosong di kelima install (0 file) dan
hanya berfungsi sebagai jebakan saat survey.

Isi `<install>/themes/` (identik di kelima install):

| theme | files | mobile |
| --- | --- | --- |
| `basic` | 656 | - |
| `furniture` | 172 | 136 (`furniture-mobile`) |
| `watch` | 194 | 190 (`watch-mobile`) |
| `printshop` | 239 | 205 (`printshop-mobile`) |
| `deals` (b2b supermarket) | 137 | 63 (`deals-mobile`) |
| `splash` (toko utama) | 105 | 7 (`splash-mobile`) |
| `css` | 1 | - |

Bukti: `/osc414/furniture/themes/furniture/icons/favicon.ico` balas 200
dengan file 364 B, sedangkan direktori
`furniture/lib/frontend/themes/furniture/` benar-benar 0 file (dicek dengan
`cmd /c dir /a`).

**Konsekuensi:** koreksi penting dari draft awal. Yang membedakan kanal
bukan cuma data dan konfigurasi - ada template PHP nyata yang perlu dipahami
sebelum diganti React, termasuk varian mobile. Migration **tidak** semurah
yang terlihat di draft pertama.
luetooth yang terlihat di draft pertama.

### 1.3 Platform terdeteksi dari DB, bukan dari folder

`includes/configure.php:140` — `OSC_DETECTED_PLATFORM_ID` dari query
`platforms` + `platforms_url`.

Isi tabel `platforms`:

| platform_id | platform_name | platform_url | default_platform_id | theme |
| --- | --- | --- | --- | --- |
| 1 | osCommerce Test Store | `localhost/osc414` | 1 | splash |
| 7 | Furniture | `localhost/osc414/furniture` | 7 | furniture |
| 8 | Watch | `localhost/osc414/watch` | 8 | watch |
| 9 | b2b supermarket | `localhost/osc414/b2b-supermarket` | **8 (SALAH)** | deals |
| 10 | Print Shop | `localhost/osc414/printshop` | **8 (SALAH)** | printshop |

`platforms_url` **kosong**. Tabel itu tidak dipakai.

`default_platform_id` salah isi untuk platform 9 dan 10 (keduanya 8). Sudah
dokumentasikan di `docs/api-contracts.md` §Known issues; SQL perbaikannya ada
di sana, belum dijalankan.

### 1.4 Core sudah platform-scoped

`lib/common/models/Products.php`:

- baris 368 — `->andOnCondition(['platform_id' => platform::currentId()])`
- baris 388 — `products_description` difilter `platform::currentId()`
- baris 413 — `getPlatformToDescription()`

`lib/common/components/ProductsContainer.php:137` memfilter deskripsi dengan
`platform::defaultId()`.

`lib/common/classes/platform.php`:

- `currentId()` (baris 173) — `PLATFORM_ID` hasil deteksi request
- `defaultId()` (baris 156) — platform dengan `is_default=1`, **selalu 1**

**Konsekuensi:** API otomatis mengikuti path tempat request masuk. Panggil
`/furniture/api/...` → `PLATFORM_ID=7`. Panggil `/api/...` → `PLATFORM_ID=1`.

### 1.5 Blocker utama: base URL React di-hardcode saat build

`lib/frontend/web/react/.env`:

```
VITE_BASE_PATH=/osc414/react-assets/
VITE_CATALOG_BASE=/osc414
```

`src/lib/api-client.ts:1`:

```ts
const CATALOG_BASE = import.meta.env.VITE_CATALOG_BASE || '/osc414'
const API_BASE = `${CATALOG_BASE}/api`
```

`src/app/App.tsx:13` — `<BrowserRouter basename={routerBasename}>`.

Semua nilai ini **terbaked saat build**. React yang dilayani di
`/osc414/furniture` akan memanggil `/osc414/api/...`, PHP resolve
`PLATFORM_ID=1`, dan data kanal yang tampil adalah data toko utama.

**Ini prasyarat pertama, bukan detail kecil.**

### 1.6 React hanya boleh mengklaim path eksak

`lib/frontend/web/react/ReactShell.php`:

Setelah A5, daftar ini berdua dan dipisah:

- `$reactPaths` — daftar **nama route**, bukan pola dan bukan prefix kanal
- `$channelPaths` — path kanal yang diaktifkan untuk pilot (`['furniture']`)
- `isReactRequest()` menggabungkan keduanya; `isChannelPlatform()` hanya dipanggil
  setelah path dipastikan kanal aktif

Docblock di file itu sendiri (baris 32-36) menjelaskan kenapa catch-all
dilarang: akan membajak `/catalog` dan route PHP lain.

### 1.7 `.htaccess` sudah sengaja tidak hardcode `/osc414`

`lib/frontend/web/react/.htaccess` rule `^react-assets/(.*)$` relatif.
Komentar di `.htaccess` root: *".htaccess tidak boleh meng-hardcode `/osc414/`"*.

**Ini kabar baik untuk Fase B** — pindah ke domain root tidak butuh rewrite
baru.

### 1.8 Pemetaan produk ke kanal

`platforms_products`:

| platform_id | Jumlah produk |
| --- | --- |
| 1 (utama) | 75 |
| 7 Furniture | 26 |
| 8 Watch | 29 |
| 9 b2b supermarket | 8 |
| 10 Print Shop | 12 |

Total kanal = 26+29+8+12 = **75**, jadi setiap produk ada di tepat satu kanal
(plus platform 1). Tidak ada tumpang tindih.

`platforms_categories`: 19 / 7 / 5 / 5 / 5.

### 1.9 Sebar produk per kanal

```
platform 1 → /osc414/                (toko utama)
platform 7 → /osc414/furniture       (26 produk)
platform 8 → /osc414/watch           (29 produk)
platform 9 → /osc414/b2b-supermarket (8 produk)
platform 10 → /osc414/printshop      (12 produk)
```

---

## 2. Target Arsitektur

### 2.1 Peta URL

```
ostore.com/                              toko utama, platform 1
ostore.com/furniture                     Furniture, platform 7
ostore.com/watch                         Watch, platform 8
ostore.com/b2b-supermarket               b2b supermarket, platform 9
ostore.com/printshop                     Print Shop, platform 10

# halaman detail & sub-halaman ikut di bawah kanal
ostore.com/epson-ecotank-et-m2120                produk toko utama
ostore.com/furniture/epson-ecotank-et-m2120      produk furniture
ostore.com/furniture/product-detail?id=40        detail React
ostore.com/furniture/catalog                     katalog (React, tahap berikutnya)
ostore.com/furniture/shopping-cart               keranjang (PHP, fase berikutnya)
```

### 2.2 Yang React klaim dan yang tetap PHP

| URL | Pemilik | Status |
| --- | --- | --- |
| `/` dan `/<kanal>` | React shell | Target Fase A |
| `/<kanal>/product-detail?id=` | React | Sudah ada di toko utama, dis expandsikan ke kanal |
| `/<kanal>/api/*` | PHP API | Sudah ada, tinggal dipastikan dipanggil di path kanal |
| `/<kanal>/<slug>` produk SEO | PHP | Tetap PHP di Fase A |
| `/<kanal>/catalog` | PHP | Tetap PHP sampai Batch katalog selesai |
| `/<kanal>/shopping-cart`, `/checkout`, `/account` | PHP | Tetap PHP |
| `/admin/*` | PHP | Tidak disentuh |

### 2.3 Konfigurasi runtime

PHP menyuntikkan konfigurasi ke HTML shell, React membacanya saat runtime.
Tidak ada lagi base URL yang di-hardcode saat build.

```html
<script>
  window.__OSC_STOREFRONT__ = {
    "platformId": 7,
    "platformName": "Furniture",
    "catalogBase": "/furniture",
    "apiBase": "/furniture/api",
    "storeName": "Furniture"
  };
</script>
```

Fase A mengganti `VITE_CATALOG_BASE` hardcode dengan nilai ini.

---

## 3. FASE A — Kanal Dilayani React

**Target:** `ostore.com/furniture`, `/watch`, `/b2b-supermarket`, `/printshop`
dilayani shell React dengan data kanal yang benar.

**Selesai bila:** keempat kanal render React dengan produk masing-masing, dan
tidak ada route PHP yang hilang.

**Status sekarang:** pilot `furniture` sudah hijau end-to-end. Kanal `watch`,
`b2b-supermarket`, dan `printshop` masih dilayani PHP, atas permintaan owner untuk
migrasi satu kanal dulu. Menambah kanal berikutnya cukup memasukkan path-nya ke
`$channelPaths` di `ReactShell.php`; tidak ada perubahan lain yang dibutuhkan
karena config (`A4`), base URL (`A6`), dan API (`A7`) sudah platform-aware.

---

### A1. Perbaiki `default_platform_id` (PRASYARAT)

**Files:** database (bukan kode)
**Status draft pertama: SALAH.** Risikonya dikira kecil.

Kolom `default_platform_id` bukan ornamental. `platform_config.php:136-137`
membaca seluruh konfigurasi kanal dari baris `default_platform_id`:

```php
if ($this->platform['default_platform_id'] > 0) {
    $get_platform_config_r = tep_db_query(
        "SELECT configuration_key, configuration_value FROM "
        . TABLE_PLATFORMS_CONFIGURATION
        . " WHERE platform_id='" . intval($this->platform['default_platform_id']) . "'"
    );
```

Artinya **platform 9 (B2B) dan 10 (Print Shop) sekarang membaca konfigurasi
platform 8 (Watch)**, bukan miliknya sendiri. Ini sudah terverifikasi:

```
platform_id  default_platform_id  is_default_contact  is_default_address  is_default
1            1                    0                   0                   1
7            7                    0                   0                   0
8            8                    0                   0                   0
9            8   <-- salah         0                   0                   0
10           8   <-- salah         0                   0                   0
4/5/6        0                    1                   1                   0
```

#### Pre-check yang sudah dijalankan (A2, 2026-10-05)

**Address book aman.** Tiap platform punya tepat 1 baris, semua identik
(country 222 / zone 0), jadi `configure.php:239-240` tidak berubah:

| platform | baris | country/zone |
| --- | --- | --- |
| 1, 7, 8, 9, 10 | 1each | 222/0 |

**Configuration TIDAK aman.** Platform 7/8/9/10 punya 372 baris masing-masing,
dan isinya hampir sama tapi tidak identik:

| perbandingan | total key | sama | beda |
| --- | --- | --- | --- |
| Watch (8) vs B2B (9) | 372 | 367 | **5** |
| Watch (8) vs Print Shop (10) | 372 | 370 | **2** |

Key yang berbeda ( Watch -> nilai kanal):

| configuration_key | 8 -> 9 | 8 -> 10 |
| --- | --- | --- |
| `MODULE_ORDER_TOTAL_DUE_STATUS` | true -> **false** | (sama) |
| `MODULE_ORDER_TOTAL_PAID_STATUS` | true -> **false** | (sama) |
| `MODULE_ORDER_TOTAL_REFUND_STATUS` | true -> **false** | (sama) |
| `MODULE_PAYMENT_SAGE_PAY_SERVER_ORDER_STATUS_ID` | 1 -> **100006** | **berbeda** |
| `MODULE_PAYMENT_STRIPE_CHECKOUT_SECRET_KEY` | **berbeda** | **berbeda** |

Kabar baik: Stripe secret key platform 9 dan 10 **sudah terisi sendiri**
(274 dan 276 byte terenkripsi, platform 8 = 279 byte). Tidak ada key kosong,
jadi tidak akan jatuh ke akun pembayaran tak terkonfigurasi.

Artinya A1 bukan "perbaikan data kosmetik". A1 **berganti akun Stripe dan
flag perhitungan total pesanan** untuk B2B dan Print Shop.

#### Rekomendasi: jangan eksekusi A1 tanpa keputusan owner

A1 harus dipisah menjadi dua keputusan:

1. **URL/canonical** - ini yang benar-benar motivates A1 dan tidak punya
   efek samping. Tapi perhatikan: `platforms.platform_url` sudah dibaca
   langsung (`configure.php:131`), sedangkan `default_platform_id` tidak
   menentukan URL. Jadi A1 mungkin tidak diperlukan sama sekali untuk
   Fase B. Perlu konfirmasi apakah masalah URL benar-benar ada.
2. **Config/payment inheritance** - ini yang berisiko. Harus diverifikasi
   bahwa key `MODULE_ORDER_TOTAL_*_STATUS` dan Stripe key per kanal memang
   nilai yang **diharapkan** oleh owner, bukan konfigurasi sisa copy-paste.

Tanyakan ke owner sebelum menjalankan:

- Apakah B2B dan Print Shop memang harus punya akun Stripe sendiri?
- Apakah total pesanan B2B seharusnya tidak menghitung status due/paid?
- Apakah platform 9/10 *seharusnya* mewarisi konfigurasi Watch?

Kalau jawabannya "tidak tahu", A1 ditunda dan Fase B tetap bisa jalan —
`platform_url` di Fase B tidak bergantung pada `default_platform_id`.

SQL bila sudah disetujui:

```sql
-- DDL: tidak ada, hanya UPDATE. Sesuai aturan "jangan ubah skema".
SELECT platform_id, platform_name, default_platform_id
FROM platforms
WHERE default_platform_id <> 0 AND default_platform_id <> platform_id;

UPDATE platforms SET default_platform_id = platform_id
WHERE default_platform_id <> 0 AND default_platform_id <> platform_id;
```

Verifikasi:

```sql
SELECT platform_id, platform_name, default_platform_id FROM platforms;
```

Harus semua baris: `default_platform_id = platform_id`.

Rollback:

```sql
UPDATE platforms SET default_platform_id = 8 WHERE platform_id IN (9, 10);
```

Backup nilai lama dulu:

```sql
SELECT * FROM platforms INTO OUTFILE 'C:/tmp/platforms-backup.csv';
```

**Catatan:** `docs/api-contracts.md` sudah menyebut SQL ini belum dijalankan.
Setelah dijalankan, update baris "Belum dijalankan" di file itu.

---

### A2. Siapkan build & smoke test — **SELESAI 2026-10-05**

**Files:** `lib/frontend/web/react/` (tidak ada perubahan kode)

#### Hasil baseline yang terekam

| Item | Nilai |
| --- | --- |
| `npm run typecheck` | bersih, tanpa output |
| `npm run build` | 83 modules, `index-DYdQmemz.js` 224,56 kB, `index-DdY85Yrc.css` 39,61 kB, 20,13 s |
| `smoke-storefront.ps1` | **33/33 LULUS** (bukan 34 seperti draft pertama) |
| Hash aset di build | sama persis dengan yang diuji smoke test -> build reproducible |

Seksi smoke test: 1 Homepage React, 2 Aset React, 3 Source tidak bocor,
4 Link UI, 5 Kanal satellite, 5b Route PHP lain, 6 Isolasi admin, 7 API.

**Penting — seksi 5 dan 5b sekarang jadi kontrak yang harus dibalik.**
Saat ini keduanya Assert kanal adalah PHP:

```
PASS  200 /furniture/ (PHP, bukan React)
PASS  200 /b2b-supermarket/ (PHP, bukan React)
PASS  200 /catalog/featured-products (PHP, bukan React)
PASS  200 /shopping-cart (PHP, bukan React)
```

Saat A5 selesai, assertion kanal harus berubah jadi React. Assertion
`5b` (route PHP lain) harus tetap PHP. **Jangan longgarkan assertion-nya** --
ubah hanya baris kanal, dan tambahkan cek `platformId` yang benar.

#### Baseline API per kanal (menunjukkan blocker inti)

`GET /api/storefront/dashboard?featured_limit=3`:

| Path | `meta.platform_id` | Produk featured |
| --- | --- | --- |
| `/` | 1 | Epson EcoTank ET-M2120, Country 6PCS, JACK 4 PIECE BEDROOM SUITE |
| `/furniture` | **1** | identik dengan `/` |
| `/watch` | **1** | identik dengan `/` |
| `/b2b-supermarket` | **1** | identik dengan `/` |
| `/printshop` | **1** | identik dengan `/` |

`GET /api/catalog/products` juga mengembalikan 12 produk identik untuk semua
kanal.

Ini bukti bahwa A7 wajib: tidak ada satu pun API controller yang memakai
`platform::currentId()`. Semuanya `defaultId()`, yang selalu 1.

#### Catatan arsitektur dari A2

Tidak ada satu pun API controller yang platform-aware. `PLATFORM_ID` di
`includes/configure.php:140` terdeteksi dengan benar, tapi tidak dipakai
satu pun API controller.

Konsekuensi yang lebih besar: tanpa A5, React tidak tahu path kanal, sehingga
config base URL-nya kosong dan React tidak bisa memanggil API kanal dengan benar.
A5 (ReactShell membaca path kanal) harus selesai lebih dulu, baru A7 bisa
diverifikasi. Catatan: `furniture/api/...` sudah dilayani instalasi yang sama
karena folder kanal adalah junction (lihat 1.1), jadi tidak ada bootstrap
terpisah yang menghalangi.

#### Urutan yang benar

A2 sudah hijau, jadi A3 boleh jalan. Tapi karena A5 harus mendahului A7,
urutan kerja yang benar:

```
A2 (selesai) -> A3 -> A4 -> A5 -> A6 -> A7 -> A8 -> A9 -> A10
```

A1 (SQL) **tidak** ada di jalur ini. A1 ditunda sampai owner menjawab
pertanyaan di A1.

#### Jangan lanjut kalau baseline merah

Kalau rebuild atau smoke test gagal, itu bukti ada masalah yang tidak ada
hubungannya dengan migrasi. Perbaiki dulu.

---

### FIX 1. Kartu produk harus membuka detail React — **SELESAI 2026-10-05**

Dikerjakan lebih dulu dari A3-A5 atas permintaan user, karena ini bug yang
dialami shopper dan tidak menunggu jalur kanal.

#### Akar masalah

Route React `/osc414/product-detail?id=40` sudah ada dan sudah benar. Yang
salah adalah **link-nya**: `ProductCard` dan `FlashSale` memakai
`product.url` dari API, yaitu URL SEO PHP seperti
`/osc414/epson-ecotank-et-m2120`. URL itu di luar allowlist `ReactShell`, jadi
dilayani theme PHP. Akibatnya shopper klik kartu produk dan keluar dari React.

Tidak ada bug di `ReactShell`, `router.tsx`, atau API. Yang perlu diganti hanya
sumber link di sisi React.

#### Perubahan

| File | Perubahan |
| --- | --- |
| `src/lib/routes.ts` | Tambah `routes.productDetail` dan `productPath(productsId)` |
| `src/components/product/ProductCard.tsx` | `href` selalu `catalogUrl(productPath(product.products_id))` |
| `src/components/home/FlashSale.tsx` | Berhenti memakai `product.url`; import `catalogUrl` dibuang |

`FlashSale` juga punya `<a>` membungkus `ProductCard` yang sudah `<a>`, jadi
nested anchor dihapus. `<a>` luar diganti `<div>`.

Konsekuensi yang disengaja: semua link kartu produk jadi non-SEO
`?id=<products_id>`. URL SEO lama masih dilayani PHP kalau diketik langsung.
Redirect slug -> id belum dibuat (lihat §9).

#### Hasil verifikasi

| Item | Nilai |
| --- | --- |
| `npm run typecheck` | bersih |
| `npm run build` | 83 modules, `index-CHDQT9Hc.js` 224,56 kB, `index-DdY85Yrc.css` 39,61 kB |
| `smoke-storefront.ps1` | **38/38 LULUS** (33 lama + 5 baru) |
| Link detail di homepage | 36 link, 10 produk unik (termasuk 40, 52, 54, 68) |
| Produk 40 ter-render | judul, galeri, harga `Rp 247`, stok, 9 spesifikasi, deskripsi |
| Produk 61 | kosong sesuai DB: deskripsi 0 karakter, 0 spesifikasi. Bukan bug renderer |
| `?id=999999` | halaman tidak ditemukan, tanpa detail produk |

#### Smoke test baru (seksi 8 dan 9)

`Test-Endpoint` berbasis curl tidak bisa dipakai untuk ini: shell React hanya
berisi `<div id="root"></div>`, semua `href` baru ada setelah React render.
Jadi ditambahkan fungsi `Render-React` yang memakai Chrome headless
`--dump-dom`.

- `Resolve-Chrome` mencari Chrome di `Program Files`,
  `Program Files (x86)`, dan `LOCALAPPDATA`.
- Kalau Chrome tidak ada, seksi 8-9 di-skip, bukan di-fail. Ini menjaga test
  bisa jalan di mesin tanpa Chrome.
- Aset browser disimpan di `%TEMP%/osc414-smoke`.

Seksi 8 memeriksa dua hal:

1. Ada `href=".../product-detail?id=<digits>"` di DOM hasil render.
2. **Tidak ada** link URL SEO. Ambang allowlist mirroring `ReactShell`, lalu
   setiap `href="/<slug>/..."` yang tidak ada di allowlist dianggap gagal.

Seksi 9 memeriksa detail 40 benar-benar ter-render (bukan cuma shell 200) dan
produk 999999 tidak menampilkan detail.

#### Validasi negatif (test ini punya gigi)

Assertion baru sudah dibuktikan menangkap regresi. `ProductCard.tsx` sengaja
dikembalikan ke `product.url`, di-build ulang, lalu smoke test dijalankan:

```
== 8. Kartu produk menunjuk ke React, bukan URL SEO ==
  FAIL  tidak ada link /product-detail di homepage React
  FAIL  link URL SEO PHP masih ada di homepage React:
        http://localhost/osc414/epson-ecotank-et-m2120
        http://localhost/osc414/country-6pcs-package-1xqb2xbs1xtb1xdt1xdm-462
        http://localhost/osc414/jack-4-piece-king-bedroom-suites
GAGAL: 2 dari 38 pemeriksaan
```

Setelah `ProductCard.tsx` dipulihkan: `38/38`. Jangan skip langkah validasi
negatif ini kalau assertion-nya diubah lagi.

#### Catatan

- API masih mengembalikan `product.url` (URL SEO). Field itu tidak dihapus
  karena masih dipakai theme PHP dan tidak diakhiri sesi ini. Yang penting
  React tidak memakainya untuk link.
- FIX 1 tidak menyentuh kanal. `/furniture`, `/watch`, `/b2b-supermarket`, dan
  `/printshop` masih dilayani PHP sampai A5 selesai.
- `catalogUrl()` masih hardcode `/osc414`. Untuk kanal, A6 yang mengubahnya.

---

### A3. Buat modul konfigurasi runtime — **SELESAI 2026-10-05**

**File baru:** `lib/frontend/web/react/src/lib/storefront-config.ts`

Tujuan: satu sumber kebenaran untuk base path, API base, dan platform id.

```ts
export type StorefrontConfig = {
  platformId: number
  platformName: string
  catalogBase: string
  apiBase: string
  storeName: string
}

const FALLBACK: StorefrontConfig = {
  platformId: 1,
  platformName: '',
  catalogBase: '/',
  apiBase: '/api',
  storeName: 'osStore',
}

declare global {
  interface Window {
    __OSC_STOREFRONT__?: Partial<StorefrontConfig>
  }
}

/**
 * Nilai ini datang dari ReactShell.php lewat tag <script> di index.html.
 * Kalau tag-nya hilang (mis. shell dibuka langsung dari file), pakai default
 * supaya halaman tetap render dengan path toko utama.
 */
export function storefrontConfig(): StorefrontConfig {
  const injected = typeof window === 'undefined' ? null : window.__OSC_STOREFRONT__
  if (!injected) {
    return FALLBACK
  }

  const apiBase = normalize(injected.apiBase, '/api')
  const catalogBase = normalize(injected.catalogBase, '/')

  return {
    platformId: Number(injected.platformId ?? 1),
    platformName: String(injected.platformName ?? ''),
    catalogBase,
    apiBase,
    storeName: String(injected.storeName ?? FALLBACK.storeName),
  }
}

/** Buang slash di ekor supaya penggabungan path tidak menghasilkan `//`. */
function normalize(value: string | undefined, fallback: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }

  const trimmed = value.trim().replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}
```

**Kenapa `normalize`:** base path `/furniture/` dan `/furniture` harus
menghasilkan request yang sama. Tanpa ini `apiBase` bisa jadi `/furniture//api`.

**Verifikasi:** `npm run typecheck` lulus.

Modul ini belum dipakai siapa-siapa pada A3. A6 yang menyambungkannya ke
`api-client.ts` dan `app-base.ts`. Mandiri supaya A6 bisa diuji terpisah.

---

### A4. Suntikkan konfigurasi dari PHP — **SELESAI 2026-10-05, dengan 2 koreksi**

**File:** `lib/frontend/web/react/ReactShell.php`
**Method:** `send()` (baris 113)

Sekarang `send()` membaca `public/index.html` lalu `echo` apa adanya. Ubah
menjadi menyisipkan tag konfigurasi sebelum `</head>`.

```php
public static function send()
{
    $indexFile = __DIR__ . '/public/index.html';

    if (!is_file($indexFile)) {
        return false;
    }

    $html = file_get_contents($indexFile);

    if ($html === false || trim($html) === '') {
        return false;
    }

    $html = self::injectConfig($html);

    header('Cache-Control: no-cache, must-revalidate');
    header('Content-Type: text/html; charset=utf-8');

    echo $html;

    return true;
}

/**
 * Menyisipkan window.__OSC_STOREFRONT__ ke dalam shell.
 *
 * Nilai dihitung dari request yang sedang berjalan, bukan dari VITE_*,
 * karena base path kanal (/furniture) hanya diketahui PHP. Kalau tetap
 * hardcode di .env, React di /furniture akan memanggil /api/ dan PHP
 * resolve PLATFORM_ID=1, sehingga kanal menampilkan data toko utama.
 *
 * TIDAK BOLEH menyentuh database. Lihat "Koreksi 1" di bawah.
 *
 * JSON disisipkan lewat JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT
 * supaya nilai dari database tidak bisa menutup tag <script> lebih awal.
 */
protected static function injectConfig($html)
{
    $base = rtrim(str_replace('\\', '/', self::installBasePath()), '/');   // "/osc414"
    $current = rtrim(str_replace('\\', '/', self::requestPath()), '/');      // "/osc414/furniture"

    $relative = self::relativeChannelPath($base, $current);                 // "/furniture"

    $catalogBase = $base . $relative;

    if ($catalogBase === '') {
        $catalogBase = '/';
    }

    $config = [
        'platformId' => self::detectedPlatformId(),
        'platformName' => '',
        'catalogBase' => $catalogBase,
        'apiBase' => rtrim($catalogBase, '/') . '/api',
        'storeName' => '',
    ];

    $json = json_encode(
        $config,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );

    $tag = '<script>window.__OSC_STOREFRONT__=' . $json . ';</script>';

    // Sisipkan sebelum </head> kalau ada, kalau tidak sisipkan sebelum
    // <body> supaya tag tetap ikut terkirim.
    if (stripos($html, '</head>') !== false) {
        return preg_replace('/<\/head>/i', $tag . '</head>', $html, 1);
    }

    if (stripos($html, '<body') !== false) {
        return preg_replace('/<body([^>]*)>/i', '<body$1>' . $tag, $html, 1);
    }

    return $tag . $html;
}

/**
 * Segment kanal di bawah base install, dengan slash di depan.
 *
 * Mengembalikan '' untuk toko utama, '/furniture' untuk kanal furniture.
 * Segment di depan yang nama route React dipotong. /osc414/product-detail
 * adalah toko utama + route detail, jadi base aplikasinya /osc414, bukan
 * /osc414/product-detail. Tanpa ini shell akan memberi tahu React bahwa ia
 * di-mount satu level terlalu dalam dan setiap URL absolutnya dapat satu
 * segment tambahan.
 *
 * @return string
 */
protected static function relativeChannelPath($base, $current)
{
    if ($current === '') {
        return '';
    }

    if ($base === '') {
        $segments = explode('/', trim($current, '/'));
    } elseif (strcasecmp($current, $base) === 0) {
        return '';
    } elseif (stripos($current, $base . '/') === 0) {
        $segments = explode('/', trim(substr($current, strlen($base) + 1), '/'));
    } else {
        return '';
    }

    while ($segments !== [] && in_array(strtolower($segments[0]), self::$reactPaths, true)) {
        array_shift($segments);
    }

    return $segments === [] ? '' : '/' . implode('/', $segments);
}

/**
 * Platform dari request berjalan, tanpa menyentuh database.
 *
 * Mengembalikan 0 kalau bootstrap platform belum jalan. storefrontConfig()
 * di React memperlakukan 0 sebagai "tidak diketahui" dan jatuh ke fallback,
 * lalu API dashboard memperbaikinya setelah aplikasi berjalan.
 *
 * @return int
 */
protected static function detectedPlatformId()
{
    foreach (['OSC_DETECTED_PLATFORM_ID', 'PLATFORM_ID'] as $constant) {
        if (defined($constant) && (int)constant($constant) > 0) {
            return (int)constant($constant);
        }
    }

    return 0;
}
```

#### Koreksi 1 — `send()` tidak boleh menyentuh database

Spesifikasi draft mengarahkan `injectConfig()` memanggil
`platform::name($platformId)` dan `Yii::$app->settings->get('store_name')`.
Keduanya salah, dan hasilnya 500 di seluruh halaman:

```
HTTP/1.1 500 Internal Server Error
please contact us if you see this page
```

Penyebabnya `send()` dipanggil dari `web/index.php` **sebelum** bootstrap
platform selesai. Pada titik itu `OSC_DETECTED_PLATFORM_ID` belum
didefinisikan, jadi cabang fallback memanggil `platform::defaultId()`, yang
memakai `\common\models\Platforms::find()` — koneksi DB belum terbuka, dan
Yii melempar exception yang ditangkap `IndexController::actionError()` menjadi
pesan 500 di atas. Ini alasan yang sama dengan komentar di `isReactRequest()`:
`OSC_DETECTED_BASE_URL` juga belum ada saat itu, makanya base path diturunkan
dari filesystem.

Perbaikan: `injectConfig()` tidak boleh query apa pun. Nama platform dan nama
toko dikosongkan; React membacanya dari `/api/storefront/dashboard` yang sudah
platform-scoped dan akan benar per kanal setelah A7. Yang benar-benar penting
dan hanya bisa didapat di sini - `catalogBase` - murni dari path request.

`detectedPlatformId()` memakai `PLATFORM_ID` sebagai pengganti setelah
`OSC_DETECTED_PLATFORM_ID`; di main install hasilnya 1.

#### Koreksi 2 — `catalogBase` adalah path absolut, bukan relatif terhadap install

Rumus draft:

```php
'catalogBase' => $relative === '' ? '/' : $relative,
'apiBase' => ($relative === '' ? '' : $relative) . '/api',
```

menghasilkan `/` dan `/api`. Itu hanya benar setelah Fase B (domain root).
Saat ini toko dilayani di `/osc414`, jadi `routerBasename` harus `/osc414`.
Kalau A6 memakai nilai `/`, semua link ke halaman PHP jadi `/catalog/...` dan
menjadi 404, dan basename yang salah membuat React tidak merender sama sekali.

Rumus yang dipakai: `catalogBase = base . relative`, di mana `base` adalah
`installBasePath()` (`/osc414`, atau `''` setelah Fase B).

| Request | base | relative | catalogBase | apiBase |
| --- | --- | --- | --- | --- |
| `/osc414/` | `/osc414` | `` | `/osc414` | `/osc414/api` |
| `/osc414/product-detail?id=40` | `/osc414` | `` | `/osc414` | `/osc414/api` |
| `/osc414/furniture/` (setelah A5) | `/osc414` | `/furniture` | `/osc414/furniture` | `/osc414/furniture/api` |
| `/` (setelah Fase B) | `` | `` | `/` | `/api` |
| `/furniture/` (setelah Fase B) | `` | `/furniture` | `/furniture` | `/furniture/api` |

Case tidak diturunkan (dipakai untuk membangun URL), tapi perbandingan dengan
base memakai `stripos`/`strcasecmp` agar konsisten dengan `normalizePath()` yang
menurunkan case.

#### Verifikasi

```
$ php -l lib/frontend/web/react/ReactShell.php
No syntax errors detected

$ curl -s http://localhost/osc414/ | Select-String OSC_STOREFRONT
{"platformId":1,"platformName":"","catalogBase":"\/osc414","apiBase":"\/osc414\/api","storeName":""};

/product-detail?id=40 -> {"platformId":1,...,"catalogBase":"\/osc414","apiBase":"\/osc414\/api",...}
/register             -> {"platformId":1,...,"catalogBase":"\/osc414","apiBase":"\/osc414\/api",...}
```

Smoke test seksi 10 mengunci ini, jadi `catalogBase` tidak bisa diam-diam
berubah lagi. Setelah A5 aktif, kanal harusnya memberi
`"catalogBase":"\/osc414\/furniture"`.

`php -l ReactShell.php`

---

### A5. Pilot kanal React: hanya `furniture` — **SELESAI 2026-10-05**

**File:** `lib/frontend/web/react/ReactShell.php`

#### Keputusan desain yang berubah

Rencana awal A5 adalah memakai `$reactPlatforms = [1, 7, 8, 9, 10]` dan
mengactivate keempat kanal sekaligus. Itu dibatalkan atas permintaan owner:
pilot satu kanal dulu, `furniture` saja.

Penyebab teknisnya adalah temuan di 1.1. Folder kanal ternyata Windows Junction
ke root, bukan instalasi terpisah. Artinya:

- Tidak ada rewrite Apache yang perlu dibuat. Request `/osc414/furniture/`
  sudah sampai ke instalasi yang sama; yang belum ada sebelumnya cuma
  kemampuan React untuk mengenali path kanal dan memakai `catalogBase` yang
  benar.
- Mengaktifkan keempat kanal sekaligus tidak menambah bukti. Kalau `furniture`
  gagal, kita tidak bisa tahu apakah penyebabnya logika bersama atau data
  kanal tertentu.

#### Yang diimplementasikan

Dua daftar putih terpisah, bukan satu:

```php
// Route yang boleh dilayani React, relatif terhadap base.
protected static $reactPaths = ['register', 'product-detail'];

// Path kanal yang diaktifkan untuk pilot. Kanal lain sengaja tidak masuk.
protected static $channelPaths = ['furniture'];
```

`isReactRequest()` memakai keduanya:

- Path `/` dan `/furniture/` (homepage kanal aktif) dilayani React.
- `/furniture/product-detail` dan `/furniture/register` dilayani React.
- `/furniture/catalog/...`, `/furniture/shopping-cart`, `/furniture/account/...`
  tetap PHP.
- `/watch/`, `/b2b-supermarket/`, `/printshop/` tetap PHP.

Pemisahan path kanal dari `$reactPaths` penting. Kalau nama kanal ikut masuk
allowlist route, maka `/watch/` baru dilayani React hanya setelah
`$channelPaths` diisi. Menggabungkan keduanya membuat tidak jelas apakah sebuah
path itu "route React" atau "prefix kanal".

Pengganti `isMainPlatform()` adalah `isChannelPlatform()`, yang hanya memeriksa
`platform_id > 1` setelah `isReactRequest()` memastikan path-nya memang kanal
aktif. Platform 4/5/6 tidak bisa masuk karena bukan path kanal.

```php
public static function isReactRequest()
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        return false;
    }

    if (!self::isAllowedPlatform()) {
        return false;
    }

    $base = self::normalizePath(self::installBasePath());
    $current = self::normalizePath(self::requestPath());

    // Homepage toko utama.
    if ($current === $base) {
        return true;
    }

    // Homepage kanal: path-nya sama dengan platform_url tanpa host.
    if (self::isChannelHomepage($current, $base)) {
        return true;
    }

    // Allowlisted sub path, contoh /osc414/register.
    $prefix = rtrim($base, '/') . '/';
    if (strpos($current, $prefix) !== 0) {
        return false;
    }

    $relative = rtrim(substr($current, strlen($prefix)), '/');

    return $relative !== '' && in_array($relative, self::$reactPaths, true);
}

/**
 * True kalau request ini homepage sebuah kanal.
 *
 * Kanal dikenali dari platform_url, bukan dari daftar folder di sini. Jadi
 * folder bisa diganti atau ditambah lewat admin tanpa menyentuh kode ini.
 */
protected static function isChannelHomepage($current, $base)
{
    if (!defined('OSC_DETECTED_PLATFORM_ID') || (int)OSC_DETECTED_PLATFORM_ID === 1) {
        return false;
    }

    $prefix = rtrim($base, '/') . '/';

    return strpos($current, $prefix) === 0;
}
```

**Hapus** `$reactPaths` untuk kanal. Path kanal tidak masuk daftar nama karena
bersifat dinamis — itu justru alasan `isChannelHomepage()` dipisah.

**Verifikasi pilot (hasil aktual):**

```powershell
foreach ($p in @("", "furniture", "watch", "b2b-supermarket", "printshop")) {
  $r = Invoke-WebRequest "http://localhost/osc414/$p" -UseBasicParsing
  "$p -> $($r.StatusCode) react=$($r.Content -match 'react-assets')"
}
```

Hasil yang benar untuk pilot satu kanal:

```
/   -> 200 react=True     (toko utama)
/furniture           -> 200 react=True
/watch               -> 200 react=False
/b2b-supermarket     -> 200 react=False
/printshop           -> 200 react=False
```

Tiga kanal terakhir `react=False` **adalah hasil yang benar**, bukan kegagalan.
Smoke test seksi 5 mengunci itu supaya pilot tidak diam-diam melebar.

**Catatan:** request `/osc414/furniture` tanpa trailing slash di-redirect Apache
ke `/osc414/furniture/` (DirectorySlash), lalu React yang menjawab. Pastikan
`ReactShell::send()` jalan sebelum PHP mengambil alih, dan `isReactRequest()`
dipanggil di `lib/frontend/web/index.php` (sudah ada, baris ~11).

---

### A6. Ganti base URL hardcode di sisi React

**Files:**
- `src/lib/api-client.ts`
- `src/lib/app-base.ts`
- `src/app/App.tsx`
- `src/lib/brand.ts`

#### `src/lib/api-client.ts`

```ts
import { storefrontConfig } from './storefront-config'

const config = storefrontConfig()
const CATALOG_BASE = config.catalogBase
const API_BASE = config.apiBase
```

`CATALOG_BASE` masih dipakai `catalogUrl()`. `API_BASE` sekarang berasal dari
runtime.

**Jangan** dihapus `VITE_CATALOG_BASE` sekalian. Biarkan sebagai fallback di
`storefront-config.ts` supaya build lama tidak langsung rusak.

#### `src/lib/app-base.ts`

```ts
import { storefrontConfig } from './storefront-config'

/** Base path untuk react-router. Nilainya per-platform, bukan build-time. */
export const routerBasename = import.meta.env.DEV ? '/' : storefrontConfig().catalogBase
```

Baca file ini dulu sebelum mengubah — pastikan tidak ada tempat lain yang
menghitung basename.

#### `src/app/App.tsx`

Tidak berubah bentuknya, tetap `<BrowserRouter basename={routerBasename}>`.
Nilai `routerBasename` sekarang runtime.

#### `src/lib/brand.ts`

`STORE_NAME` jadi fallback saja. Sumber utama adalah
`window.__OSC_STOREFRONT__.storeName` yang di Fase B sama dengan nama platform.

```ts
import { storefrontConfig } from './storefront-config'

/**
 * Nama brand storefront.
 *
 * Sekarang diambil dari platform yang sedang diakses, disuntikkan PHP lewat
 * window.__OSC_STOREFRONT__.storeName. Nilai konstanta di bawah hanya
 * fallback untuk shell yang dibuka tanpa PHP (mis. develop lokal).
 */
export const STORE_NAME = storefrontConfig().storeName || 'osStore'
```

**Verifikasi:**

```powershell
cd lib/frontend/web/react
npm run typecheck
npm run build
```

Lalu cek bundle tidak lagi berisi `/osc414/api` sebagai base:

```powershell
Select-String -Path "public/assets/*.js" -Pattern "osc414" | Measure-Object
```

Harus `0` kalau Fase B sudah jalan, atau hanya sisa di `product-images.ts`
(lihat A8).

---

### A7. Platform-aware di API — **SELESAI 2026-10-05**

**Files:**
- `lib/frontend/controllers/api/ProductController.php`
- `lib/frontend/controllers/api/StorefrontController.php`

#### Analisis semantik, bukan blind replace

`StorefrontController` memakai `defaultId()` di delapan tempat. Sempat hampir
semua diganti lewat find-replace, tapi dua hal perlu diputuskan dulu.

**1. `channelItems()` exclude dari daftar kanal.** Filter-nya
`platform_id <> $currentId`. Sekarang `$currentId` = 1, jadi hasilnya 7, 8, 9,
10 — kebetulan benar karena default = 1. Kalau diganti ke `currentId()` secara
mekanis, request dari `/furniture` akan mengubahnya jadi 7, dan filter `platform_id
<> 7` mengembalikan 1, 8, 9, 10. Secara semantik itu **justru benar**: switcher
kanal tidak boleh menautkan kanal yang sedang aktif ke dirinya sendiri, dan toko
utama harus tetap muncul sebagai pilihan. Jadi filter dibiarkan `<>` dengan
`currentId()`, dan docblock menjelaskan alasannya.

**2. `featuredItems()` ternyata punya dua scope, tidak satu.** Draft mengira
cukup mengganti `description.platform_id`. Setelah dibaca ulang, `featured`
hanya berisi `products_id` dan tidak pernah menyentuh `platforms_products`.
Artinya deskripsi per-platform saja tidak mencegah kebocoran: join ke
`platforms_products` juga wajib. Kedua-duanya sekarang ada.

#### Perubahan

| Pemakaian | Nilai lama | Nilai baru | Alasan |
| --- | --- | --- | --- |
| meta dashboard | `defaultId()` | `currentId()` | Menyatakan kanal yang melayani |
| meta session | `defaultId()` | `currentId()` | Sama |
| `storeName()` where | `defaultId()` | `currentId()` | Nama toko harus milik kanal aktif |
| meta channels | `defaultId()` | `currentId()` | Sama |
| `$currentId` di `channelItems()` | `defaultId()` | `currentId()` | Exclude diri sendiri, bukan exclude toko utama |
| `description.platform_id` | `defaultId()` | `currentId()` | Nama produk per kanal |
| join `platforms_products` | (tidak ada) | **baru** | Keanggotaan kanal |
| `ProductController` meta | `defaultId()` | `currentId()` | `meta` saja, bukan query |

Kedelapan pemakaian `defaultId()` sudah habis; sisa kemunculannya hanya di
komentar. Helper tunggal `platformId()` dipakai supaya tidak ada yang menulis
`defaultId()` lagi di file ini.

`ProductController.php:77` berada di dalam array `meta`, bukan query, jadi
aman diganti. Query produknya sendiri memuat produk lewat container resmi,
yang sudah mengikuti platform aktif.

**Jangan** mengganti `platform::defaultId()` di `ProductsContainer.php:137`.
Itu atribusi nama produk ke platform utama dan sudah benar perilakunya.

#### Hasil verifikasi

```
toko utama       platform_id=1   nama='osCommerce Test Store'  produk: 40,52,54
furniture        platform_id=7   nama='Furniture'              produk: 52,54,68
watch            platform_id=8   nama='Watch'                  produk: 9,13,16
b2b-supermarket  platform_id=9   nama='b2b supermarket'        produk: 33,32,35
printshop        platform_id=10  nama='Print Shop'             produk: 40,39,42
```

Jumlah produk featured dengan limit 24: toko utama 23, furniture 6, watch 6,
b2b 5, printshop 6.

Daftar kanal dari tiap path (nilai meta sengaja tidak dihitung):

```
/                    -> 7,8,9,10
/furniture           -> 1,8,9,10
/watch               -> 1,7,9,10
/b2b-supermarket     -> 1,7,8,10
/printshop           -> 1,7,8,9
```

#### Dua jebakan verifikasi yang sudah ditemukan

**BOM-HTML bikin `ConvertFrom-Json` gagal.** Respons API diawali UTF-8 BOM.
PowerShell 5.1 melempar `Unexpected character encountered while parsing value`.
Solusi yang dipakai di dokumen ini: `WebClient` dengan `Encoding = UTF8`.

**`"platform_id"` pertama di body bukan milik `meta`.** `dashboard` menaruh
`meta` di akhir JSON, sedangkan setiap entri `channels` punya `platform_id`
sendiri di dalam `items`. Regex naif akan membaca 7 untuk `/` dan menganggap
API-nya salah padahal sudah benar. Smoke test sekarang memisahkan blok meta
dengan helper `Get-ApiMetaPlatformId` dan `Get-ApiArrayBlock`.

Smoke seksi 12 mengunci semua ini. Validasi negatif sudah dilakukan: dengan
`platformId()` dikembalikan ke `defaultId()`, 4 dari 5 assertion `platform_id`
gagal — jadi test benar-benar menangkap regresi, bukan sekadar selalu hijau.

Cek tambahan: `GET /api/storefront/channels` harus tetap mengembalikan
4 kanal (7, 8, 9, 10) **dari setiap path**. Kalau hanya muncul saat
`/` yang diakses, baris 120 belum ditulis benar.

---

### A8. Branding dan banner per kanal di React

**Files:**
- `src/components/home/ChannelEntries.tsx`
- `src/features/catalog/product-images.ts`
- `src/features/channels/channelMeta.ts`

#### ChannelEntries

Kanal masih read-only di DB, jadi `usableChannels()` akan mengembalikan 4 kanal
dari `meta.platform_id = 1`. Di kanal, daftar itu tidak relevan — shopper sudah
berada di kanal tersebut. Tambahkan:

```ts
import { storefrontConfig } from '../../lib/storefront-config'

const config = storefrontConfig()

// Di halaman kanal, tampilkan kanal lain sebagai navigasi, bukan "kamu sedang di sini".
const isChannelView = config.platformId !== 1
```

#### product-images.ts (PENTING)

File ini hardcode prefix kanal:

```ts
const CHANNEL_ROOT = import.meta.env.VITE_CATALOG_BASE || '/osc414'
function channelAsset(channel: string, path: string): string {
  return `${CHANNEL_ROOT}/${channel}/images/banners/${path}`
}
```

Setelah Fase A, banner untuk kanal harus diambil dari path kanal itu sendiri.
Folder kanal tidak pernah dihapus (lihat 1.1 dan A11), jadi file banner tetap
ada di `furniture/images/banners/` dan tidak perlu dipindahkan. Yang perlu
hanyaEnsure `catalogUrl()` dipakai agar path-nya ikut prefix kanal.

Untuk sekarang, ubah supaya memakai `catalogUrl()`:

```ts
import { catalogUrl } from '../../lib/api-client'

function channelAsset(channel: string, path: string): string {
  return catalogUrl(`${channel}/images/banners/${path}`)
}
```

`catalogUrl()` sudah membuat path root-relative dengan benar, dan tidak hardcode
`/osc414`.

**Verifikasi:**

```powershell
Select-String -Path "src/features/catalog/product-images.ts" -Pattern "VITE_CATALOG_BASE"
```

Harus kosong.

---

### A9. Route React per kanal

**File:** `src/app/router.tsx`

**Koreksi draft pertama:** draft ini mengusulkan menambah route `/catalog`
dan `/search`. Keduanya **sudah ada** di `router.tsx`:

| Baris | Route |
| --- | --- |
| 27 | `/` → `HomePage` |
| 28 | `/catalog` → `PendingPage` |
| 32 | `/product-detail` → `ProductDetailPage` |
| 33 | `/search` → `PendingPage` |
| 34-40 | `/wishlist`, `/account`, `/addresses`, `/cart`, `/checkout`, `/orders`, `/order-detail` → `PendingPage` |
| 44 | `/register` → `RegisterPage` |
| 45 | `/login` → `PendingPage` |
| 47 | `*` → redirect ke `routerBasename` |

Jadi A9 **tidak menambah route apa pun**. Karena router memakai
`basename = catalogBase`, semua route itu otomatis jadi
`/furniture/product-detail`, `/furniture/catalog`, dan seterusnya tanpa
perubahan kode.

**Masalah nyata yang harus ditangani di A9: baris 47.**
`<Route path="*" element={<Navigate to={routerBasename} replace />} />`
membelokkan URL yang tidak dikenal ke homepage. Untuk React di kanal, ini
bermasalah: `/furniture/catalog/product/123` yang tidak dikenal akan
dibalik ke `/furniture/` sehingga shopper kehilangan konteks dan tidak pernah
mendapat 404. Pertimbangkan apakah baris 47 perlu dibatasi per platform.

Satu hal yang perlu diperiksa tapi belum saya lakukan: apakah
`PendingPage` untuk `/catalog` dan `/cart` menghasilkan link ke URL PHP
melalui `catalogUrl()` (absolute) atau relative. Kalau relative, di bawah
basename kanal link-nya bisa salah. Cek `PendingPage` di
`router.tsx:9-20` dan `src/lib/api-client.ts` (`catalogUrl`) sebelum A5.

**Verifikasi:**

```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
& $chrome --headless=new --disable-gpu --virtual-time-budget=15000 `
  --dump-dom "http://localhost/osc414/furniture/product-detail?id=40"
```

Detail produk harus milik furniture, bukan toko utama.

---

### A10. Verifikasi komprehensif Fase A

**Jalankan smoke test yang sudah ada:**

```powershell
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
```

Baseline A2 harus tetap hijau. Kalau test menyebut "empat kanal hidup" dengan
cara memeriksa `react=False`, test itu perlu diperbarui — sekarang kanal
diharapkan `react=True`. **Perbarui test, jangan longgarkan assertion-nya.**

**Daftar periksa manual Fase A:**

| # | Periksa | Cara | Harapan |
| --- | --- | --- | --- |
| 1 | `/` dilayani React | curl | `react-assets` di HTML |
| 2 | `/furniture` React | curl | `react-assets`, `platformId:7` |
| 3 | `/watch` React | curl | `platformId:8` |
| 4 | `/b2b-supermarket` React | curl | `platformId:9` |
| 5 | `/printshop` React | curl | `platformId:10` |
| 6 | API kanal platform-scope | curl | `meta.platform_id` sesuai |
| 7 | Produk kanal berbeda | SQL vs API | furniture ≠ toko utama |
| 8 | Route PHP tidak hilang | curl | `/catalog`, `/shopping-cart` bukan React |
| 9 | Admin tidak rusak | browser | login admin, buka produk |
| 10 | Source React 403 | curl | `/lib/frontend/web/react/src` Forbidden |
| 11 | Aset 200 | curl | JS/CSS React |
| 12 | Homepage utama utuh | headless | 18 kartu, hero, banner |
| 13 | Build deterministik | `npm run build` | 2x build → hash sama |

**Rollback Fase A:**

Semua perubahan Fase A ada di 2 file PHP dan ~6 file TypeScript. Rollback:

```powershell
git checkout lib/frontend/web/react/ReactShell.php
git checkout lib/frontend/controllers/api/
npm run build
```

A1 (SQL) tidak di-rollback oleh git. Kalau A7 sampai A9 gagal, biarkan A1
tetap — `default_platform_id` yang benar tidak merusak apa pun.

---

### A11. DIBATALKAN - folder kanal bukan folder duplikat

**STATUS: BATAL. JANGAN DIJALANKAN.**

Task ini lahir dari asumsi bahwa `furniture/`, `watch/`, `b2b-supermarket/`,
dan `printshop/` adalah salinan penuh yang perlu "diretire". Asumsi itu salah:
keempatnya Windows Junction yang menunjuk `C:\xampp\htdocs\osc414` (lihat 1.1).

Konsekuensi kalau A11 dijalankan:

- Yang dipindah adalah **alias**, bukan data. Secara harfiah 0 byte dibebaskan,
  bertentangan dengan klaim "menghapus 2,6 GB".
- Keempat URL kanal ikut mati: `/osc414/furniture`, `/osc414/watch`,
  `/osc414/b2b-supermarket`, dan `/osc414/printshop` akan 404 karena tidak ada
  lagi junction yang mengarahkan Apache ke instalasi.
- Tidak ada gunanya: tidak ada duplikasi yang perlu dihemat.

Kalau nanti memang perlu menghapus junction (misalnya karena alias membingungkan
saat dipindah ke server Linux), itu **bukan** A11 dan harus punya task sendiri,
dengan dua syarat:

1. Dilarang memakai `-Recurse` atau `/s`. Hanya hapus reparse point-nya.
2. Dipastikan React sudah melayani ke-4 kanal pada path tanpa prefix folder.

Perintah yang aman, bila nanti benar-benar dibutuhkan:

```powershell
foreach ($d in @("furniture", "watch", "b2b-supermarket", "printshop")) {
  # Junction dihapus tanpa -Recurse. Isi root tidak tersentuh.
  cmd /c rmdir "C:\xampp\htdocs\osc414\$d"
}
```

Sebelum menjalankan, pastikan ulang dengan `Get-Item $d -Force` bahwa
`Attributes` memuat `ReparsePoint` dan `Target` menunjuk root. Kalau tidak,
berhenti: itu berarti directory aslinya ada di tempat lain dan butuh
investigasi terpisah.

---

## 4. FASE B — Brand dan Domain `ostore.com`

**Target:** URL tidak lagi berisi `/osc414`; brand adalah `ostore.com`.

**Selesai bila:** `http://ostore.com/` dan `http://ostore.com/furniture`
menjawab dengan React, dan tidak ada URL breakage.

---

### B1. Tentukan bentuk deployment

Tiga pilihan. **Perlu keputusan sebelum mulai.**

| Opsi | Cara | URL | Risiko |
| --- | --- | --- | --- |
| **B-1** | vhost Apache dengan `DocumentRoot C:/xampp/htdocs/osc414` | `ostore.com/furniture` | Rendah. Folder install tetap di disk, hanya request mapping berubah |
| **B-2** | Pindahkan install ke `C:/xampp/htdocs/` | `ostore.com/furniture` | Sedang. Semua path absolut harus dicek ulang |
| **B-3** | Hosting + domain sungguhan | `ostore.com/furniture` | Tinggi. SSL, hosting, DNS, email |

**Rekomendasi: B-1.** Paling kecil risiko, tidak perlu pindah file, dan
`.htaccess` sudah relatif semua.

Untuk localhost, B-1 berarti `ostore.com` di-map ke `127.0.0.1` di
`C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1  ostore.com
127.0.0.1  www.ostore.com
127.0.0.1  admin.ostore.com
```

---

### B2. Set vhost

**File:** `C:\xampp\apache\conf\extra\httpd-vhosts.conf`

```apache
<VirtualHost *:80>
    ServerName ostore.com
    ServerAlias www.ostore.com
    DocumentRoot "C:/xampp/htdocs/osc414"

    <Directory "C:/xampp/htdocs/osc414">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

<VirtualHost *:80>
    ServerName admin.ostore.com
    DocumentRoot "C:/xampp/htdocs/osc414"

    <Directory "C:/xampp/htdocs/osc414">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Restart Apache. Cek `httpd-vhosts.conf` yang sekarang lebih dulu — `docs/architecture.md`
menyebutnya sudah dipakai untuk isolasi admin. Jangan menimpa, tambahkan.

**Verifikasi:** `http://ostore.com/` menjawab.

---

### B3. Ubah `platforms.platform_url`

**Ini data, bukan skema.** Tidak ada ALTER TABLE.

```sql
-- Cek dulu
SELECT platform_id, platform_name, platform_url FROM platforms;

UPDATE platforms SET platform_url = 'ostore.com'          WHERE platform_id = 1;
UPDATE platforms SET platform_url = 'ostore.com/furniture' WHERE platform_id = 7;
UPDATE platforms SET platform_url = 'ostore.com/watch'     WHERE platform_id = 8;
UPDATE platforms SET platform_url = 'ostore.com/b2b-supermarket' WHERE platform_id = 9;
UPDATE platforms SET platform_url = 'ostore.com/printshop' WHERE platform_id = 10;
```

`platforms_url` tetap kosong. Kalau nanti butuh multi-domain per platform,
baris di tabel itu yang diisi — tapi itu fitur lain.

**Verifikasi:** buka kanal di browser, cek link produk yang dihasilkan
sekarang tanpa `/osc414`.

**Rollback:**

```sql
UPDATE platforms SET platform_url = 'localhost/osc414' WHERE platform_id = 1;
UPDATE platforms SET platform_url = 'localhost/osc414/furniture' WHERE platform_id = 7;
-- dst
```

---

### B4. Build ulang React tanpa prefix folder

**File:** `lib/frontend/web/react/.env`

```
VITE_BASE_PATH=/react-assets/
VITE_CATALOG_BASE=
VITE_DEV_PROXY_TARGET=http://ostore.com
```

`VITE_CATALOG_BASE` dikosongkan karena base path kini datang dari runtime
(A3). Nilai build-time hanya fallback.

```powershell
cd lib/frontend/web/react
npm run build
```

**Verifikasi:** tidak ada `osc414` di bundle.

```powershell
Select-String -Path "public/assets/*.js" -Pattern "osc414" | Measure-Object
```

---

### B5. Cek cookie path dan same-origin

**PENTING.** `includes/configure.php:194`:

```php
defined('HTTP_COOKIE_PATH') or define('HTTP_COOKIE_PATH', $parsed['path']);
```

`$parsed['path']` diturunkan dari `platform_url`. Setelah B3, path jadi `/`
untuk toko utama dan `/furniture` untuk kanal. Ini menggeser `csrfToken` dan
session cookie.

Risiko: shopper di kanal tidak mengirim cookie toko utama, dan sebaliknya.

**Verifikasi:**

1. Login di `ostore.com/`
2. Buka `ostore.com/furniture/`
3. Cek `DevTools > Application > Cookies` — `csrfToken` dan `tlSID1` ada
4. Tambah produk ke cart dari kanal, pastikan PHP menerima session

Kalau cookie tidak terbawa lintas path, jangan diubah di kode React. Yang perlu
diputuskan: session shared antar kanal atau terpisah per kanal. Saat ini
`application_top.php:219` sudah memakai `tep_session_name('tlSID'.PLATFORM_ID)`,
jadi **sudah terpisah per platform**. Pastikan itu yang diinginkan.

---

### B6. Aset banner kanal (TIDAK PERLU PINDAH ASET)

Task ini pernah bergantung pada A11. Karena folder kanal tidak pernah dihapus,
file banner tetap ada di `furniture/images/banners/` dan tidak ada yang perlu
dipindahkan.

Satu-satunya perubahan yang dibutuhkan adalah `product-images.ts` harus memakai
`catalogUrl()` supaya path-nya ikut prefix kanal. Itu sudah dikerjakan di A6.

Kalau nanti domain dilepas dari `/osc414` dan URL kanal jadi `/furniture`, path
yang sama tetap benar karena `catalogBase` ikut berubah.

---

### B7. Verifikasi Fase B

| # | Periksa | Harapan |
| --- | --- | --- |
| 1 | `ostore.com/` | 200, React |
| 2 | `ostore.com/furniture` | 200, React, `platformId:7` |
| 3 | Link produk di kanal | `/furniture/<slug>`, tanpa `osc414` |
| 4 | Breadcrumb | URL kategori tanpa `osc414` |
| 5 | Gambar produk | `/images/products/...` 200 |
| 6 | Banner kanal | 200 |
| 7 | `robots.txt` + sitemap | host benar |
| 8 | Admin `admin.ostore.com` | login normal |
| 9 | Search engine console | Bukan punya kita, tapi cek tidak ada 404 massal |

Semua URL lama (`localhost/osc414/...`) **akan mati**. Kalau SEO sudah
berjalan, tambahkan redirect di `.htaccess`:

```apache
RedirectMatch 301 ^/osc414/(.*)$ http://ostore.com/$1
```

Tambahkan setelah semua Fase B hijau, bukan sebelumnya — kalau belum, you'll
redirect ke host yang belum siap.

---

## 5. FASE C — Alur Data Admin ke React

**Target:** produk yang ditambah dari admin muncul di React tanpa langkah
tambahan.

**Realita:** ini sudah ~90% jalan hari ini. Admin menulis ke DB, React baca
lewat API. Yang belum dijamin ada 2 hal.

---

### C1. Pastikan produk baru ter-attach ke platform

**Risiko utama:** admin menambah produk, tapi tidak mengisi
`platforms_products`. Produk tidak muncul di kanal mana pun kecuali toko utama.

```sql
-- Produk aktif yang tidak punya channel
SELECT p.products_id, pd.products_name
FROM products p
JOIN products_description pd ON pd.products_id = p.products_id AND pd.language_id = 1
WHERE p.products_status = 1
  AND NOT EXISTS (
    SELECT 1 FROM platforms_products pp
    WHERE pp.products_id = p.products_id AND pp.platform_id <> 1
  );
```

Kalau query ini mengembalikan baris, produk itu tidak tampil di kanal. Harus
diatasi dari sisi admin (form produk harus punya pemilih platform), bukan dari
React.

**Belum ada form admin picker platform yang terverifikasi.** Ini perlu
ditemukan dulu di `admin/includes/modules/products/`.

**Verifikasi C1:** tambah 1 produk uji dari admin, isi platform Furniture,
build ulang React (`npm run build`), cek muncul di `/furniture` dan tidak
muncul di `/watch`.

---

### C2. Strategi revalidasi

React sekarang membaca API langsung, tidak ada cache layer. Artinya setiap
page load membaca DB.

Tidak ada yang perlu diubah selama volume rendah. Kalau nanti lambat:

| Opsi | Trade-off |
| --- | --- |
| ETag / `If-None-Match` | Murah, tapi URL PHP sudah headers cache vary |
| Cache di `apiClient` dengan TTL pendek | Gotcha: data admin jadi terlambat terlihat |
| Revalidasi on-focus di React | Cocok untuk dashboard, tidak untuk listing |

**Rekomendasi: tidak ada dulu.** Ukur dulu. Jangan menambah cache sebelum ada
bukti masalah - cache yang salah segar lebih buruk dari lambat.

---

## 6. FASE D — Seller Center (DITUNDA)

Diminta ditunda. Dicatat di sini supaya tidak hilang.

**Kondisi faktual (sudah diverifikasi 2026-10-04):**

| Yang dicek | Hasil |
| --- | --- |
| Tabel `sellers` / `vendors` / `marketplace` | **Tidak ada** |
| `products.vendor_id` | Kolom ada, **0 di semua 75 baris**. Stub |
| `paypal_seller_info` | 12 baris. Data onboarding PayPal, bukan akun seller |
| `manufacturers` | 23 baris, 41 produk. Entitas terdekat, tapi ini "merek" |

**PRD sudah melarang asumsi ini.** `docs/PRD.md` §7 (baris 294-296):
*"Jangan menganggap adanya akun penjual mandiri atau dashboard multi-seller.
Arsitektur saat ini adalah toko osCommerce; model multi-vendor harus diputuskan
terpisah."*

§5.3 (baris 170-183) melarang perubahan skema tanpa persetujuan formal.

Artinya "furniture buyer jadi seller" bukan pekerjaan React. Itu domain baru:
skema seller, alur persetujuan, kepemilikan produk per seller, komisi, payout,
moderasi.

---

## 7. Checklist Verifikasi Konsolidasi

Jalankan setelah semua fase selesai.

```powershell
# 1. Build
cd lib/frontend/web/react
npm run typecheck
npm run build

# 2. Smoke test
cd C:\xampp\htdocs\osc414
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1

# 3. Kelima platform
foreach ($p in @("", "furniture", "watch", "b2b-supermarket", "printshop")) {
  $r = Invoke-WebRequest "http://ostore.com/$p" -UseBasicParsing -TimeoutSec 30
  $pid = if ($r.Content -match '"platformId":(\d+)') { $Matches[1] } else { '?' }
  "$p -> $($r.StatusCode) platform=$pid react=$($r.Content -match 'react-assets')"
}

# 4. API platform-scoped
foreach ($p in @("", "furniture", "watch", "b2b-supermarket", "printshop")) {
  $r = Invoke-WebRequest "http://ostore.com/$p/api/storefront/dashboard?featured_limit=1" -UseBasicParsing
  $j = ($r.Content -replace '^\uFEFF','') | ConvertFrom-Json
  "$p -> platform_id=$($j.meta.platform_id)"
}

# 5. Route PHP masih hidup
foreach ($p in @("catalog", "shopping-cart", "account/login")) {
  $r = Invoke-WebRequest "http://ostore.com/$p" -UseBasicParsing -TimeoutSec 30
  "$p -> $($r.StatusCode) react=$($r.Content -match 'react-assets')"
}

# 6. Render headless
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
& $chrome --headless=new --disable-gpu --virtual-time-budget=15000 `
  --dump-dom "http://ostore.com/furniture/product-detail?id=40"

# 7. Link kartu produk (ini sudah otomatis di smoke test seksi 8)
& $chrome --headless=new --disable-gpu --virtual-time-budget=25000 --dump-dom `
  "http://ostore.com/" | Select-String -Pattern 'href="[^"]*/product-detail\?id=' -AllMatches
```

---

## 8. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Junction kanal terhapus | Keempat URL kanal 404 | A11 sudah BATAL. Kalau perlu hapus, tanpa `-Recurse`, dan hanya setelah B1 selesai |
| Cookie path bergeser | Session putus antar kanal | B5. `tlSID<platform_id>` sudah terpisah, konfirmasi itu pilihan yang benar |
| `default_platform_id` salah | Kanal 9/10 baca config & akun Stripe milik Watch | **A1 ditunda** sampai owner jawab. Lihat A1 |
| A1 menukar akun Stripe | Checkout B2B/Print Shop pindah ke akun berbeda | Jangan jalankan tanpa keputusan owner. Pre-check sudah di A1 |
| Kanal salah baca data toko utama | Tampilkan produk yang salah | **A7 sudah selesai.** Smoke seksi 12 mengunci `platform_id` per kanal dan daftar produk yang berbeda |
| Route PHP ikut dibajak React | Halaman rusak total | A5 pakai dua allowlist, bukan catch-all. Smoke seksi 5b |
| `product-images.ts` masih hardcode | Banner rusak | A8 |
| Banner kanal tidak ditemukan | Gambar 404 | A11 sudah BATAL, jadi aset tidak hilang. B6 hanya soal path `catalogUrl()` |
| Platform 4/5/6 ikut dilayani React | Market place ikut tampil di storefront publik | A5 — path-nya bukan kanal aktif, jadi tidak masuk `$channelPaths` |
| Admin rusak | Tidak bisa tambah produk | A10 no. 9. Admin tidak boleh masuk allowlist React |

---

## 9. Yang Belum Diputuskan

Perlu keputusan sebelum B1 dan A1.

1. **A1 / config dan payment kanal** - blocker dari pre-check A2. Owner harus
   menjawab: apakah B2B dan Print Shop memang punya akun Stripe sendiri?
   Apakah total pesanan B2B seharusnya tidak menghitung status due/paid?
   Apakah platform 9/10 *seharusnya* mewarisi konfigurasi Watch?
2. **Bentuk deployment** - B-1 (vhost), B-2 (pindah folder), atau B-3 (hosting)?
3. **Nama kanal di URL** - `furniture` atau `furnitur`? User menulis "furnitur"
   sekali, DB dan kode memakai `furniture`. Perlu konsisten.
4. **Session antar kanal** - shared atau terpisah? Saat ini sudah terpisah
   (`tlSID<platform_id>` di `application_top.php:219`). Owner bisa jadi ingin
   satu login untuk semua kanal.
5. **Template kanal** - kanal punya theme PHP sendiri yang nyata (lihat 1.2).
   Halaman React memakai theme itu lagi, atau theme di-retire bertahap?
6. **Mulai dari mana** - Fase A saja dulu, atau A + B sekali jalan?
7. **Redirect URL SEO lama** - FIX 1 membuat link kartu produk jadi
   `?id=<products_id>`. URL `/<slug>` yang sudah terindex dan sudah dibagikan
   masih dilayani PHP kalau diakses langsung. Perlu redirect slug -> id di
   PHP, atau biarkan?
8. **Katalog + search React** - kedua route-nya sekarang `PendingPage`. Ini
   batch berikutnya setelah A3-A7. Perlu diputuskan apakah catalog/search
   masuk Fase A atau Fase baru.
9. **Cart/checkout React** - sudah disepakati ditunda sampai katalog + search
   selesai. Controller cart PHP masih hidup dan tidak boleh dibongkar.

---

## 10. Catatan untuk Sesi Berikutnya

Rujukan wajib: `docs/README.md` (aturan + gate), dokumen ini, dan
`docs/api-contracts.md`.

### Koreksi terhadap draft dokumen ini sendiri

Draft 2026-10-04 mengandung klaim yang salah, sudah diperbaiki di versi ini.
Kalau ada sesi yang membaca draft lama, abaikan tabel ini:

| Klaim lama | Kenyataan |
| --- | --- |
| Template kanal kosong, migration murah | Kanal punya theme nyata 172-239 file + mobile (1.2) |
| `default_platform_id` hanya soal URL | Ia mengatur config dan akun Stripe kanal (A1) |
| Smoke test punya 34 checks | 33 check saat draft, **38 check setelah FIX 1** |
| `isReactRequest()` di baris 47 | Baris 52-81 |
| `isMainPlatform()` di baris 85 | Baris 90-97 |
| `send()` di baris 108 | Baris 113 |
| A9 perlu tambah route `/catalog` dan `/search` | Sudah ada di `router.tsx:28,33` |
| `app-base.ts` boleh membuang cabang DEV | Cabang `import.meta.env.DEV` wajib dipertahankan (A6) |
| A7 hanya ubah `meta.platform_id` | 8 pemakaian `defaultId()`, 4 di dalam query (A7) |
| A1 aman, cukup UPDATE | Perlu keputusan owner lebih dulu (A1) |
| Detail produk sudah aman, cuma perlu URL kanal | Yang rusak justru link kartu produk, bukan route-nya. Lihat FIX 1 |
| Smoke test berbasis curl cukup untuk link kartu | Shell React cuma punya `<div id="root">`. Butuh Chrome headless. Lihat FIX 1 |
| Smoke test punya 34 checks | 33 saat draft, **41 setelah A4** (33 + 5 FIX 1 + 3 A4) |
| `injectConfig()` boleh query DB untuk nama toko | `send()` jalan sebelum bootstrap selesai; DB belum terbuka -> 500. Lihat Koreksi 1 A4 |
| `catalogBase` dihitung relatif terhadap base install | Harus path absolut web (`/osc414`), karena router basename memakainya. Lihat Koreksi 2 A4 |
| `/osc414/product-detail` -> `catalogBase /osc414/product-detail` | Route React dipotong dari base; base-nya `/osc414`. Lihat A4 |

### Koreksi terhadap `docs/api-contracts.md`

*"Gambar produk ada di `products.products_image`. Tabel `products_images` tidak
punya kolom `image`."* Pernyataan itu tidak tepat. Batch 2 sudah memakai
`Images::getImageList()` yang membaca `products_images` +
`products_images_description` dan berhasil mengembalikan URL gambar nyata
untuk produk 40. Batch 2 juga membuktikan `products.products_image` null untuk
75/75 produk. Dokumentasi itu perlu diperbarui.
