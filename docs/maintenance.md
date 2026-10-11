# Maintenance (Operasional Lanjutan)

Topik lanjutan yang tidak diperlukan untuk sekadar menjalankan aplikasi.
Instalasi dasar ada di [installation.md](installation.md).

## 1. Sinkronisasi dengan GitHub

Ambil perubahan terbaru di device lain:

```powershell
git pull origin main
```

Detail penting soal apa yang **tidak** ikut repo:

- `node_modules/` dan `lib/frontend/web/react/public/` (hasil build) — diabaikan.
  Setelah pull, jalankan `npm.cmd install` dan `npm.cmd run build` bila berubah.
- Folder kanal besar: `/watch/`, `/furniture/`, `/printshop/`, `/b2b-supermarket/`
  — diabaikan (lihat bagian 3).
- Runtime/cache (`lib/*/runtime/`, `themes/*/cache/`, `assets/`) — hanya
  foldernya yang ikut lewat `.gitkeep`; isinya dibuat ulang otomatis.

### File vendor yang tercecer dari `.gitignore`

Beberapa paket vendor menyertakan `.gitignore` sendiri yang cocok
case-insensitive di Windows, sehingga file yang ada di disk tidak pernah
ter-commit. Untuk menambahkan secara paksa:

```powershell
git add -f lib/vendor/bower-asset/jquery.inputmask/dist/inputmask
```

## 2. Cache dan runtime

Folder runtime hanya berisi foldernya di repo; isinya (cache, log, temp)
diabaikan dan dibuat ulang aplikasi. Bila ada masalah aneh setelah update,
bersihkan cache:

```powershell
cd C:\xampp\htdocs\osc414
Remove-Item -Recurse -Force lib\*\runtime\cache\* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force themes\*\cache\* -ErrorAction SilentlyContinue
```

Log berguna:

- `lib/frontend/runtime/logs/app.log`
- `C:\xampp\apache\logs\error.log`

## 3. Toko tambahan (satellite)

Dump mendaftarkan 4 kanal tambahan dengan URL `localhost/furniture`,
`localhost/watch`, `localhost/b2b-supermarket`, dan `localhost/printshop`.
Folder fisiknya **tidak** ikut repo (ukurannya besar, ± 560 MB/folder), jadi di
device baru tautannya 404.

Pilih salah satu:

- Salin folder tersebut secara manual ke `C:\xampp\htdocs\`, atau
- Nonaktifkan lewat Admin → Platforms, atau
- Override URL dengan `sql/set-platform-url.sql`.

## 4. Menjalankan console Yii2

```powershell
cd C:\xampp\htdocs\osc414
C:\xampp\php\php.exe yii.php
```

Deteksi URL otomatis sengaja dimatikan untuk mode CLI, jadi console memakai
nilai `platforms.platform_url` apa adanya (bukan dari URL yang dibuka).

## 5. Konfigurasi lintas perangkat

Dump `sql/trueloaded.sql` aman dipindah ke device lain. Yang perlu disesuaikan
hanya:

1. **Nama folder** — bebas, tidak harus `osc414`.
2. **Kredensial database** di `includes/local/configure.php` dan
   `admin/includes/local/configure.php`.
3. **`lib/frontend/web/react/.env`** bila base path instalasi bukan `/osc414`
   (lalu `npm.cmd run build` ulang).

**Tidak perlu** mengubah `platforms.platform_url`: alamat toko dibaca otomatis
dari URL yang sedang dibuka. Untuk mengunci URL tetap atau multi-domain, pakai
`sql/set-platform-url.sql` (ubah `@store_url` di dalamnya lalu import).

## 6. Base path instalasi berbeda

Bila nama folder bukan `osc414`, sesuaikan `lib/frontend/web/react/.env`
(`VITE_BASE_PATH`, `VITE_CATALOG_BASE`, `VITE_DEV_PROXY_TARGET`) lalu build
ulang. Detail dan catatan rollback: [deployment-rollback.md](deployment-rollback.md#kalau-base-path-instalasi-berbeda).

## 7. Mengaktifkan/mematikan storefront React (rollback)

Homepage React diklaim satu baris di `.htaccess` root. Untuk kembali ke PHP,
nonaktifkan hanya baris itu. Langkah lengkap dan backup yang tersedia:
[deployment-rollback.md](deployment-rollback.md).

## 8. Uji regresi

```powershell
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
```

Menguji homepage React, aset, isolasi admin, empat kanal, dan kontrak API.
