# Deployment dan Rollback

## Prasyarat

- Apache 2.4 dengan `mod_rewrite` aktif
- PHP 8.2
- Node.js 20+ (terverifikasi 24.11.1) dan npm
- Host sudah terdaftar di `C:\Windows\System32\drivers\etc\hosts`:
  `127.0.0.1 admin.localhost`

Di PowerShell, `npm` diblokir execution policy sehingga harus memakai
`npm.cmd`.

## Build frontend

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm install
npm run build
```

`npm run build` = `tsc --noEmit && vite build`. Kalau TypeScript salah, build
berhenti dan `public/` tidak ditimpa.

Hasil build ada di `lib/frontend/web/react/public/`. Folder `public/` tidak
di-version control.

## Deploy

Tidak ada langkah terpisah. Apache membaca `public/` langsung dari disk, jadi
file yang baru di-build langsung aktif pada request berikutnya.

Yang perlu dipastikan setelah deploy:

```powershell
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
```

## Kalau base path instalasi berbeda

`lib/frontend/web/react/.env`:

```
VITE_BASE_PATH=/osc414/react-assets/
VITE_API_TARGET=http://localhost/osc414
VITE_CATALOG_BASE=/osc414
```

`VITE_BASE_PATH` ditulis ke `index.html` hasil build sebagai prefix absolut
dan harus cocok dengan rewrite di `.htaccess` root:

```apache
RewriteRule ^react-assets/(.*)$ lib/frontend/web/react/public/$1 [L]
RewriteRule ^$ lib/frontend/web/react/public/index.html [L]
```

Kalau path instalasi bukan `/osc414`, ubah `VITE_BASE_PATH`, `VITE_API_TARGET`,
dan `VITE_CATALOG_BASE`, lalu build ulang. Rewrite di `.htaccess` tidak
memuat path instalasi sehingga tidak perlu diubah.

## Rollback homepage ke PHP

Homepage React diklaim oleh satu baris:

```apache
RewriteRule ^$ lib/frontend/web/react/public/index.html [L]
```

Untuk kembali ke halaman PHP, hapus atau NONaktifkan hanya baris itu.
Semua route lain sudah tidak pernah disentuh, jadi `/catalog`,
`/shopping-cart`, `/checkout`, `/account/*`, dan keempat kanal langsung
kembali normal tanpa rollback tambahan.

Tidak perlu mengembalikan `.htaccess` dari backup dan tidak perlu menyentuh
vhost atau `hosts`.

## Rollback seluruh perubahan pemisahan host

Kalau pemisahan `admin.localhost` perlu dibatalkan:

1. Kembalikan `C:\xampp\apache\conf\extra\httpd-vhosts.conf` dari
   `C:\Users\iQ06\AppData\Local\Temp\opencode\httpd-vhosts.conf.bak`
2. Hapus baris `127.0.0.1 admin.localhost` dari
   `C:\Windows\System32\drivers\etc\hosts`
   (backup: `C:\Users\iQ06\AppData\Local\Temp\opencode\hosts.bak`)
3. Restart Apache
4. Admin kembali diakses lewat `http://localhost/osc414/admin/`

Perhatikan: `admin/includes/local/configure.php` sudah diubah agar
`HTTP_CATALOG_SERVER` menunjuk host publik saat diakses lewat
`admin.localhost`. File tersebut tidak perlu dikembalikan untuk akses lewat
`localhost`; perubahan itu justru membuat katalog tertaut benar pada kedua
mode akses. Backup ada di
`admin/includes/local/configure.php.bak-20261003`.

## Backup yang tersedia

| Berkas | Lokasi |
| --- | --- |
| Konfigurasi admin | `admin/includes/local/configure.php.bak-20261003` |
| Vhost Apache | `C:\Users\iQ06\AppData\Local\Temp\opencode\httpd-vhosts.conf.bak` |
| Hosts | `C:\Users\iQ06\AppData\Local\Temp\opencode\hosts.bak` |
| Skrip hosts | `C:\Users\iQ06\AppData\Local\Temp\opencode\add-hosts-osc414.ps1` |

Backup vhost dan hosts berada di direktori sementara dan bisa terhapus oleh
pembersihan sistem. Salin ke lokasi permanen bila pemisahan host ini akan
dipakai lebih lama.

## Restart Apache

```powershell
& "C:\xampp\apache\bin\httpd.exe" -k stop
& "C:\xampp\apache\bin\httpd.exe" -k start
```

Restart tidak perlu dilakukan setiap kali build frontend. Cukup saat
`.htaccess`, vhost, atau konfigurasi PHP berubah.