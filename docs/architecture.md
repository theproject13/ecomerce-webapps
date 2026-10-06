# Arsitektur

Status: homepage storefront sudah pindah ke React. Halaman lain masih PHP.

## Peta host

| Host | Peran | Isi |
| --- | --- | --- |
| `http://localhost/osc414/` | Storefront publik | React (homepage) + PHP (katalog, cart, checkout, akun) + API Yii2 |
| `http://admin.localhost/osc414/admin/` | Admin | Backend PHP lama, ditolak untuk semua path storefront |

Keduanya tetap berbagi `DocumentRoot C:/xampp/htdocs`. Isolasi ditegakkan oleh
vhost, bukan oleh pemisahan root fisik. Definisi vhost ada di
`C:\xampp\apache\conf\extra\httpd-vhosts.conf`, pemetaan host ada di
`C:\Windows\System32\drivers\etc\hosts`.

## Backend

Yii2 dengan routing bawaan osCommerce. URL rule storefront berada di
`lib/frontend/config/main.php`.

API frontend berada di `lib/frontend/controllers/api/` dan mewarisi
`BaseApiController` (mengatur format respons JSON). Base ini menumpang
`frontend\controllers\Sceleton`, yang nama file-nya memang salah eja sejak
awal dan sengaja tidak diubah karena dipakai luas.

### Controller API yang ada

| Controller | Endpoint | Keterangan |
| --- | --- | --- |
| `CatalogController` | `/api/catalog/products`, `/api/catalog/categories` | Bawaan, bentuk respons `items` + `total_count` |
| `StorefrontController` | `/api/storefront/dashboard`, `/channels`, `/featured` | Untuk React |

`StorefrontController` mengembalikanAmplop `{ items, meta, error }` di mana
`meta` berisi `platform_id`, `store_name`, `currency`, `channel_count`, dan
`featured_count`.

## Frontend React

Berkas di `lib/frontend/web/react/`.

```
lib/frontend/web/react/
├── .htaccess          # menutup semua akses web kecuali public/
├── .env               # VITE_BASE_PATH, VITE_API_TARGET, VITE_CATALOG_BASE
├── index.html         # entry Vite
├── vite.config.ts     # outDir public/, publicDir false
├── public/            # hasil build, yang dilayani Apache
└── src/
    ├── app/           # App, AppLayout, router, providers
    ├── pages/         # satu file per URL
    ├── components/    # layout, navigation, product, ui
    ├── features/      # api.ts, hooks, logika per fitur
    ├── lib/           # api-client, csrf, routes, utils
    ├── hooks/
    ├── types/
    ├── styles/
    └── main.tsx
```

### Pembagian tanggung jawab

| Direktori | Tanggung jawab |
| --- | --- |
| `pages/` | Menyusun halaman berdasarkan URL |
| `components/` | Komponen UI yang dapat dipakai ulang |
| `features/` | Logika domain, panggilan API, hook, validasi |
| `lib/` | Infrastruktur komunikasi API dan utilitas |
| `app/` | Routing dan konfigurasi aplikasi |

### Alur data homepage

`StorefrontProvider` (dalam `app/providers.tsx`) memanggil
`useDashboard` -> `features/catalog/api.ts` -> `apiClient` ->
`/osc414/api/storefront/dashboard`. Header, kanal, dan grid produk membaca
satu context yang sama, jadi homepage hanya membuat satu permintaan HTTP.

`app/App.tsx` membungkus provider di `BrowserRouter` dengan
`basename = VITE_CATALOG_BASE` supaya router React berjalan di
`/osc414/`.

## Routing Apache

`.htaccess` di root instalasi, urutan aturan penting:

1. Tolak `^lib/frontend/web/react/(src|tests|node_modules)`
2. `^react-assets/(.*)` -> `lib/frontend/web/react/public/$1`
3. `^$` -> `lib/frontend/web/react/public/index.html` (hanya homepage)
4. `^admin($|/)` -> biarkan masuk router backend
5. Catch-all `.*` -> `index.php`

Aturan `RewriteCond %{REQUEST_FILENAME} !-d` **tetap dikomentari**. Empat
kanal satellite (`furniture`, `watch`, `b2b-supermarket`, `printshop`) adalah
direktori nyata dan harus diteruskan ke `index.php` oleh URL manager.

Belum ada fallback SPA di root. React baru mengklaim satu URL. Menambah
catch-all ke React akan merebut `/catalog`, `/shopping-cart`, dan
`/checkout` dari PHP.

## Prefix aset

`assets/` di root sudah dipakai bundle legacy berhash (`1706d855`, `221b7853`,
dan sejenisnya), jadi React memakai `/react-assets/`. Vite menulis path aset
absolut dari `VITE_BASE_PATH`, sedangkan rewrite mengarah ke root `public/`
bukan `public/assets/`.

## Deployment frontend

```powershell
cd lib/frontend/web/react
npm install
npm run build
```

`npm run build` menjalankan `tsc --noEmit` lalu `vite build`. Build gagal
jika ada error TypeScript, jadi mesin produksi tidak mungkin menerima bundle
yang tidak type-safe.

## Verifikasi

`tests/regression/smoke-storefront.ps1` menguji 34 hal: homepage dilayani
React, aset 200, source React 403, link UI tidak 404, empat kanal hidup,
isolasi admin, dan kontrak API.

```powershell
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
```