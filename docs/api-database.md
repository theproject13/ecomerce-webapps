# API dan Database

Cara kerja komunikasi React → API Yii2 → database, cara mengujinya, dan cara
mendiagnosis 404/500/data kosong.

Kontrak **field-level** tiap endpoint ada di
[api-contracts.md](api-contracts.md); dokumen ini fokus pada alur, pengujian,
dan diagnosis.

## 1. Arsitektur komunikasi

```
Browser (React)  ──same origin──►  Apache (port 80)  ──►  Yii2 /osc414/api/...
       │                                                        │
       └── cookie session PHP ikut (credentials: 'same-origin') └──► MySQL (osc414)
```

- React di-*serve* Apache dari `/osc414/`; API dilayani origin yang **sama**.
  Karena itu cookie session PHP ikut terkirim tanpa konfigurasi CORS.
- `api-client.ts` memakai `credentials: 'same-origin'` (bukan `include`),
  sehingga cookie tidak pernah dikirim ke origin lain.
- Endpoint berada di `/osc414/api/` dan dipetakan oleh rule di
  `lib/frontend/config/main.php`: `api/<controller>/<action>`, dengan
  controller di `lib/frontend/controllers/api/`. Lihat
  [architecture.md](architecture.md#backend).

## 2. Endpoint yang tersedia

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/storefront/dashboard` | GET | Satu paket untuk homepage: kanal + produk featured |
| `/api/storefront/channels` | GET | Daftar kanal |
| `/api/storefront/featured` | GET | Produk unggulan (`limit` 1-48) |
| `/api/storefront/products` | GET | Katalog kanal (`scope`, `page`, `per_page`, `category_id`, `keywords`, `sort`) |
| `/api/storefront/categories` | GET | Kategori kanal |
| `/api/storefront/session` | GET | Status login untuk header |
| `/api/cart/csrf` | GET | Ambil token CSRF + pasang cookie `_csrf` |
| `/api/cart/add` | POST | Tambah ke `shopping_cart` PHP (form-urlencoded) |
| `/api/account/*` | GET/POST | Login, registrasi, riwayat (Batch 3) |
| `/api/catalog/products` | GET | **Bawaan lama** (fields minimal) |
| `/api/catalog/categories` | GET | **Bawaan lama** |

`<folder>` = nama folder instalasi (contoh `osc414`). Bentuk respons dan
parameter lengkap: [api-contracts.md](api-contracts.md).

Bentuk respons `StorefrontController`:

```json
{ "items": {}, "meta": {}, "error": null }
```

`error` bernilai `null` saat sukses. `CatalogController` bawaan memakai bentuk
lama `items` + `total_count`.

## 3. Cara menguji endpoint

Buka langsung di browser (ganti `osc414` bila perlu):

```
http://localhost/osc414/api/storefront/dashboard
http://localhost/osc414/api/storefront/products?page=1&per_page=12&sort=newest&scope=all
http://localhost/osc414/api/storefront/channels
http://localhost/osc414/api/account/session
```

Atau lewat PowerShell:

```powershell
Invoke-WebRequest "http://localhost/osc414/api/storefront/dashboard" -UseBasicParsing | Select-Object StatusCode, Content
```

## 4. Cek respons dan data database

**Respons API:** JSON dengan daftar kanal/produk = API + DB konek.

**Data di database** (nama DB `osc414`):

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.customers;"
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.platforms;"
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.platforms_products;"
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.featured;"
```

Bila tabel-tabel inti berisi tetapi API mengembalikan nol, dump kemungkinan
belum lengkap atau nama DB berbeda dari yang dibaca
`includes/local/configure.php`.

## 5. Diagnosis masalah

| Yang muncul | Artinya & solusi |
|---|---|
| JSON `{"items":{...},"error":null}` berisi kanal/produk | DB + API konek. Kalau UI masih error, masalahnya di cara buka/build frontend. |
| `Unable to connect to database server!` atau HTTP 500 | MySQL belum jalan, atau dump belum di-import ke DB `osc414`. Lihat [installation.md](installation.md#4-buat-database-dan-import-dump). |
| HTTP 404 pada `/api/...` | (a) folder store bukan `osc414` tetapi `includes/local/configure.php` masih `osc414`; (b) `mod_rewrite`/`AllowOverride All` mati; (c) memakai dev server `:5173` padahal Apache (proxy) tidak jalan. |
| `"total_count":0` padahal data ada | Dump belum lengkap / nama DB beda. Cek tabel di langkah 4. |
| Login selalu "No match for E-Mail Address and/or Password" | Tabel `customers` kosong (dump belum masuk) atau email/password salah. |
| `POST /api/cart/add` 400 "form is expired" | Token CSRF diambil bukan dari `/api/cart/csrf`. Client harus mengambil token dari endpoint itu. Lihat [api-contracts.md](api-contracts.md). |

Log yang berguna:

- `lib/frontend/runtime/logs/app.log`
- `C:\xampp\apache\logs\error.log`

## Tidak dapat diverifikasi dari kode (perlu konfirmasi)

- Perilaku kanal tambahan (`furniture`, `watch`, `b2b-supermarket`, `printshop`)
  hanya terbukti *gitignored*; folder fisiknya tidak ada di repository sehingga
  endpoint kanalnya 404 sampai folder disalin atau kanal dinonaktifkan. Lihat
  [maintenance.md](maintenance.md#3-toko-tambahan-satellite).
- `docs/api-contracts.md` mencatat known issues (`default_platform_id` salah,
  `/admin/features` 500) yang belum diperbaiki; status terkini perlu dicek ulang
  terhadap database.
