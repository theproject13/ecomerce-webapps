# Kontrak API

Semua endpoint storefront berada di `/osc414/api/` dan dilayani origin yang
sama dengan React, jadi cookie session PHP ikut terkirim tanpa konfigurasi
CORS tambahan.

## Bentuk respons

`StorefrontController` memakai amplop tiga kunci:

```json
{
  "items": {},
  "meta": {},
  "error": null
}
```

`error` bernilai `null` pada sukses. `CatalogController` bawaan memakai bentuk
yang lebih lama (`items` + `total_count`) dan sengaja tidak diubah agar tidak
memutus konsumen yang sudah ada.

## `GET /api/storefront/dashboard`

Satu permintaan untuk seluruh kebutuhan homepage.

Parameter query:

| Parameter | Default | Batas | Keterangan |
| --- | --- | --- | --- |
| `featured_limit` | `8` | 1-24 | Jumlah produk featured yang dikembalikan |

Contoh respons:

```json
{
  "items": {
    "channels": [
      {
        "platform_id": 7,
        "name": "Furniture",
        "url": "http://localhost/osc414/furniture/",
        "logo": null
      }
    ],
    "featured": [
      {
        "products_id": 40,
        "name": "Epson EcoTank ET-M2120",
        "summary": "",
        "model": "",
        "price": 247.41,
        "quantity": 12,
        "in_stock": true,
        "image": null,
        "url": "http://localhost/osc414/epson-ecotank-et-m2120"
      }
    ]
  },
  "meta": {
    "platform_id": 1,
    "store_name": "osCommerce Test Store",
    "currency": "GBP",
    "channel_count": 4,
    "featured_count": 23
  },
  "error": null
}
```

### Catatan per field

`url` pada kanal dibangun dari kolom `platforms.platform_url` secara langsung.
Kolom itu **tidak** boleh dibaca lewat
`platform_config::getCatalogBaseUrl()`: kelas tersebut menimpa `platform_url`
dengan milik platform `default_platform_id`, dan data saat ini salah isi (lihat
bagian known issues).

`image` dan `logo` bernilai `null` bila berkas tidak ada di disk. Saat ini 0
dari 75 produk punya gambar, jadi frontend wajib menangani `null`.

`price` sudah dibulatkan dua desimal oleh server. Bentuk angka uang dan
simbol matanya diambil dari `meta.currency`.

## `GET /api/storefront/channels`

`items` berisi daftar kanal, `meta` hanya `platform_id`.

## `GET /api/storefront/featured`

`items` berisi produk featured, `meta` berisi `total_count`, `limit`, dan
`currency`. Parameter `limit` dibatasi 1-48.

## `GET /api/storefront/products` dan `GET /api/storefront/categories`

Katalog kanal. `products` menerima `scope` (`all` / `featured`), `page`,
`per_page` (1-48), `category_id`, `keywords`, dan `sort`
(`newest`, `oldest`, `name_asc`, `name_desc`, `price_asc`, `price_desc`).
`categories` memakai nama field `category_id`.

`meta.platform_id` selalu mengikuti kanal dari path, bukan dari query. Jadi
`?platform=`, `?platformId=`, `?channel=`, dan `?store=` diabaikan; yang
mengubah platform hanya segmen URL. Parameter `?platform_id=` sendiri masih
berefek karena dibaca bootstrap platform global, bukan oleh controller.

## Endpoint keranjang

| Endpoint | Method | Fungsi |
| --- | --- | --- |
| `/api/cart/csrf` | `GET` | Mengembalikan `{ok, csrfToken}` dan memasang cookie `_csrf` |
| `/api/cart/add` | `POST` | Menambah produk ke `shopping_cart` PHP |

Rutenya dua segmen, jadi URL tiga segmen seperti `/api/storefront/cart/add`
tidak akan sampai ke action mana pun.

`POST /api/cart/add` menerima `products_id` (wajib), `qty` (default 1, dijepit
1-99), dan `id[]` untuk atribut. Body form-urlencoded, bukan JSON.

Bentuk respons, sama untuk sukses dan gagal:

```json
{
  "ok": true,
  "items": [{ "products_id": 52, "qty": 2 }],
  "meta": { "platform_id": 7, "count": 2, "is_empty": false },
  "redirect": {
    "cart": "/osc414/furniture/shopping-cart",
    "checkout": "/osc414/furniture/checkout"
  },
  "error": null
}
```

`redirect` dipakai React untuk tombol "Tambah ke keranjang" dan "Beli sekarang".
Harga dan total sengaja tidak ada: keduanya milik aturan pajak dan total tema,
jadi menyalinnya ke sini akan membuat dua sumber angka.

Kode status: `400` tanpa token CSRF, `405` selain POST, `422` produk tidak ada
atau produk berattribut belum punya pilihan.

### Token CSRF harus diambil dari endpoint, bukan dari runtime config

`ReactShell` echoing HTML sebelum `$application->run()`. Token dari
`Yii::$app->request->getCsrfToken()` di titik itu tidak konsisten dengan cookie
`_csrf` yang dibaca `Request` pada POST berikutnya, dan Yii menolak dengan "The
form is expired". Ambil token dari `/api/cart/csrf`, yang berjalan di lifecycle
Yii normal.

`Sceleton.php` memanggil `getCsrfToken(true)` setiap kali POST lolos validasi,
jadi token diputar pada setiap POST yang diterima. Client yang menahan token
lama harus mengambil yang baru; `features/cart/cart-api.ts` mencoba ulang satu
kali pada 400 karena itu bentuk token basi, bukan kegagalan add cart.

## Endpoint bawaan yang harus tetap hidup

| Endpoint | Pemakai |
| --- | --- |
| `GET /api/catalog/products` | Konsumen lama; fields minimal (id, model, price, status, quantity) |
| `GET /api/catalog/categories` | Konsumen lama |

## Aturan yang belum berubah

- URL rule tidak disentuh. `api/<controller>/<action>` dipetakan ke
  `api/<controller>/<action>` oleh `lib/frontend/config/main.php`. Karena itu
  controller API harus berada di `lib/frontend/controllers/api/` dan nama
  filenya mengikuti kapitalisasi action.
- Action baru cukup ditambah sebagai `actionXxx()` pada controller yang ada.
  Tidak perlu mendaftarkan route baru.
- `Featured::find()` mengembalikan `FeaturedQuery` yang punya `active()`.
  Gunakan itu, jangan `where(['status' => 1])` manual.
- Deskripsi produk difilter per platform lewat relasi
  `Featured::getBackendProductDescription()` dengan
  `platform::defaultId()` dan `languages_id`. Menyalin query tanpa filter ini
  akan mencampur nama produk antar kanal.
- Gambar produk ada di `products.products_image`. Tabel `products_images` tidak
  punya kolom `image`.
- `DIR_FS_CATALOG_IMAGES` hanya didefinisikan di konteks admin. Di frontend
  gunakan `DIR_FS_CATALOG . DIR_WS_IMAGES`.

## Known issues

### `platforms.default_platform_id` salah isi

| platform_id | platform_url | default_platform_id |
| --- | --- | --- |
| 7 Furniture | `localhost/osc414/furniture` | 7 (diri sendiri) |
| 8 Watch | `localhost/osc414/watch` | 8 (diri sendiri) |
| 9 b2b supermarket | `localhost/osc414/b2b-supermarket` | **8** |
| 10 Print Shop | `localhost/osc414/printshop` | **8** |

`platform_config::load()` memakai `default_platform_id` untuk menimpa
`platform_url`. Akibatnya kanal 9 dan 10 mewarisi URL Watch di semua tempat
yang memakai kelas itu, bukan hanya di navigasi. Dampaknya dapat menjangkau
canonical URL SEO, bundling aset, feed, dan callback pembayaran.

Perbaikan yang benar adalah mengoreksi kolom di database, bukan menambal
di frontend:

```sql
UPDATE platforms SET default_platform_id = platform_id
WHERE default_platform_id <> 0 AND default_platform_id <> platform_id;
```

Belum dijalankan karena mengubah perilaku lebih luas dari homepage.

### `/admin/features` 500

`Admin\FeaturesController` membaca tabel `features`, `features_types`, dan
`department_features` yang tidak ada di database (MySQL 1146). Route tidak
tautan dari menu admin dan bukan bagian dari pekerjaan storefront.

### POST dari halaman React selain keranjang belum punya token

`lib/csrf.ts` masih membaca token dari tag `<meta name="csrf-token">` atau
cookie `csrfToken`, dan keduanya tidak ada di shell React. Jadi
`withCsrfHeaders()` tidak mengirim apa pun dan POST dari halaman React selain
keranjang akan ditolak 400. Halaman `/register` masuk kategori ini.

Perbaikannya mengikuti pola keranjang: ambil token dari endpoint yang berjalan
di lifecycle Yii normal sebelum mengirim POST. Itu pekerjaan Batch 3 (Akun),
bukan bagian dari Batch 4a.