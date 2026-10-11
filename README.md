# ecomerce-webapps

Aplikasi e-commerce **osCommerce 4.14** (platform TrueLoaded / Yii2) dengan
storefront React. Homepage dilayani React; katalog, cart, checkout, dan akun
masih PHP + API Yii2. Alamat toko dibaca otomatis dari URL yang sedang dibuka,
jadi satu dump database yang sama bisa dipakai ulang di device mana pun.

Pintu masuk ini sengaja ringkas. Detail per topik ada di `docs/` (lihat
[Dokumentasi](#dokumentasi)).

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Backend | PHP 8.2, Yii2 (osCommerce 4.14 / TrueLoaded) |
| Database | MySQL / MariaDB |
| Frontend storefront | React 18, React Router 6, TypeScript, Vite 5 |
| Server lokal | XAMPP (Apache + MySQL + PHP) di Windows |
| Versi kontrol | Git / GitHub |

## Prasyarat

- **XAMPP** (Apache + MySQL/MariaDB + PHP 8.2) — https://www.apachefriends.org
- **Git** (untuk clone dari GitHub)
- **Node.js 18+** (disarankan LTS 20/22; terverifikasi 24.11.1) — https://nodejs.org

Cek versi:

```powershell
node -v
npm.cmd -v
```

> Di Windows PowerShell, `npm` sering diblokir Execution Policy. Pakai
> `npm.cmd` atau jalankan `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
> (lihat [docs/frontend-development.md](docs/frontend-development.md#catatan-powershell)).
> Seluruh detail dan pengecekan ada di [docs/installation.md](docs/installation.md).

## Quick Start (dari clone sampai jalan)

```powershell
# 1. Clone ke htdocs dengan nama folder osc414
cd C:\xampp\htdocs
git clone https://github.com/theproject13/ecomerce-webapps.git osc414

# 2. Start Apache + MySQL dari XAMPP Control Panel

# 3. Buat database lalu import dump (WAJIB pakai cmd /c di PowerShell)
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS osc414 CHARACTER SET utf8 COLLATE utf8_general_ci;"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql"

# 4. Install dependency + build frontend React (WAJIB, public/ tidak ikut git)
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm.cmd install
npm.cmd run build

# 5. Buka toko lewat Apache
#    http://localhost/osc414/
```

> **Kenapa wajib `npm.cmd run build`?** Folder `lib/frontend/web/react/public/`
> (hasil build) dan `node_modules/` **tidak ikut git**. Tanpa build, homepage
> React tidak ada dan toko jatuh ke tema PHP lama.

Langkah lengkap + indikator keberhasilan tiap tahap: [docs/installation.md](docs/installation.md).

## Menjalankan React dalam mode development

Hanya untuk mengembangkan UI. Cart/checkout tetap diuji lewat Apache.

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm.cmd run dev
# buka http://localhost:5173/osc414/
```

XAMPP harus jalan lebih dulu karena Vite mem-proxy API dan aset ke Apache.
Detail: [docs/frontend-development.md](docs/frontend-development.md).

## URL

| Tujuan | URL |
|---|---|
| Storefront (production, via Apache) | `http://localhost/osc414/` |
| Admin (backend PHP) | `http://localhost/osc414/admin/` |
| React dev server | `http://localhost:5173/osc414/` |
| API storefront | `http://localhost/osc414/api/storefront/dashboard` |

Kalau nama folder bukan `osc414`, ganti semua `osc414` pada URL di atas.

## Pemeriksaan keberhasilan

- `http://localhost/osc414/` menampilkan storefront (React), bukan teks PHP mentah.
- `http://localhost/osc414/api/storefront/dashboard` mengembalikan **JSON** dengan
  daftar kanal/produk (bukan 404/500).
- `http://localhost/osc414/admin/` menampilkan halaman login admin.
- Halaman katalog React menampilkan produk (bukan "0 Produk Pilihan").

Jika salah satu gagal, lihat [docs/troubleshooting.md](docs/troubleshooting.md).

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/installation.md](docs/installation.md) | Instalasi XAMPP, konfigurasi PHP/Apache, database, import SQL |
| [docs/frontend-development.md](docs/frontend-development.md) | Node.js, npm, Vite, dev server, build, typecheck |
| [docs/api-database.md](docs/api-database.md) | Arsitektur API Yii2, cara uji endpoint, cek data |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Gejala → penyebab → solusi → verifikasi |
| [docs/maintenance.md](docs/maintenance.md) | Sinkronisasi GitHub, cache, toko tambahan, console Yii2 |
| [docs/architecture.md](docs/architecture.md) | Peta host, routing Apache, struktur frontend React |
| [docs/api-contracts.md](docs/api-contracts.md) | Kontrak field-level tiap endpoint API |
| [docs/deployment-rollback.md](docs/deployment-rollback.md) | Deploy frontend dan cara rollback ke PHP |
| [docs/security-checklist.md](docs/security-checklist.md) | Isolasi same-origin dan admin |
| [docs/PRD.md](docs/PRD.md) | Product requirements migrasi React |

## Troubleshooting singkat

| Gejala | Solusi cepat |
|---|---|
| 404 di semua URL | Folder harus langsung di `htdocs\osc414` (bukan pembungkus ganda), atau `mod_rewrite` mati. Lihat [installation.md](docs/installation.md). |
| `Unable to connect to database server!` | MySQL belum jalan atau dump belum di-import. |
| Toko tampil tema lama / bukan React | Belum `npm.cmd run build`. |
| Produk "0"/404 padahal DB ada | Cek endpoint dashboard; biasanya DB kosong atau build belum ada. Lihat [api-database.md](docs/api-database.md). |
| Halaman putih | Buka `C:\xampp\apache\logs\error.log`. |
| `npm` diblokir PowerShell | Pakai `npm.cmd`. |

Daftar lengkap: [docs/troubleshooting.md](docs/troubleshooting.md).
