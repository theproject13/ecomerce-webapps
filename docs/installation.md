# Instalasi Lokal (Windows + XAMPP)

Panduan ini mengantarkan dari repository bersih sampai toko jalan di
`http://localhost/osc414/`, diikuti langkah validasi tiap tahap.

- Hanya menjalankan aplikasi: cukup ikuti dokumen ini sampai **Validasi** terakhir.
- Mengembangkan frontend: lanjut ke [frontend-development.md](frontend-development.md).
- Hanya mendeploy/rollback frontend: lihat [deployment-rollback.md](deployment-rollback.md).

## 1. Prasyarat

| Perangkat | Versi | Catatan |
|---|---|---|
| XAMPP | Apache 2.4 + MySQL/MariaDB + **PHP 8.2** | https://www.apachefriends.org |
| Git | terbaru | untuk clone (opsional bila pakai ZIP) |
| Node.js | **18+** (disarankan LTS 20/22) | hanya untuk build frontend React |

Node 18+ adalah minimum teknis Vite 5.4.8 (`engines: ^18.0.0 || >=20.0.0`).
`package.json` tidak mengunci versi Node, jadi gunakan LTS terbaru yang aman.

Ekstensi PHP yang dipakai (XAMPP default sudah menyediakan) dan daftar
lengkapnya dapat dicek di `lib/requirements.php`:

```
pdo_mysql, pdo, mbstring, intl, curl, openssl, gd, fileinfo, zip, sodium, soap, xml
```

## 2. Clone dan struktur folder

```powershell
cd C:\xampp\htdocs
git clone https://github.com/theproject13/ecomerce-webapps.git osc414
```

**Nama folder bebas**, tetapi seluruh contoh di dokumentasi ini memakai
`osc414`. Kalau memakai nama lain, ganti `osc414` pada setiap URL.

Bila memakai unduhan ZIP, GitHub menamai folder `ecommerce-webapps-main`.
Rename menjadi `osc414` atau sesuaikan URL.

> File store harus berada **langsung** di dalam folder itu:
> `C:\xampp\htdocs\osc414\index.php`
> Bukan pembungkus ganda: `C:\xampp\htdocs\osc414\ecommerce-webapps-main\`
> (pembungkus ganda adalah penyebab 404 paling umum).

**Validasi:** `Test-Path C:\xampp\htdocs\osc414\index.php` harus `True`.

## 3. Jalankan Apache dan MySQL

Lewat XAMPP Control Panel: klik **Start** pada **Apache** lalu **MySQL**, dan
pastikan keduanya berstatus hijau.

Lewat command line (alternatif):

```powershell
C:\xampp\apache\bin\httpd.exe
C:\xampp\mysql\bin\mysqld.exe
```

> PHP, Apache, dan MySQL harus aktif sebelum aplikasi dibuka.

**Validasi:** `http://localhost/` menampilkan halaman XAMPP.

## 4. Buat database dan import dump

Kredensial yang dipakai aplikasi (lihat konfigurasi di langkah 5):

```
host     : localhost
user     : root
password : (kosong)
database : osc414
```

### 4.1 Buat database

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS osc414 CHARACTER SET utf8 COLLATE utf8_general_ci;"
```

### 4.2 Import dump

> **PowerShell:** tanda `<` bukan operator redirect. Perintah
> `mysql ... < file.sql` akan **gagal diam-diam**. Bungkus dengan `cmd /c`:

```powershell
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql"
```

Di CMD, bentuk aslinya juga bisa dipakai:

```cmd
C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql
```

Import berisi ratusan tabel dan butuh 1–3 menit. Tunggu hingga selesai.

Alternatif phpMyAdmin: buka `http://localhost/phpmyadmin` → login `root` tanpa
password → tab **Import** → pilih `sql/trueloaded.sql` → **Go**. Naikkan dulu
`upload_max_filesize` ke `64M` (langkah 6) karena file ± 42 MB.

**Validasi:** jumlah tabel bertambah.

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='osc414';"
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.customers;"
```

## 5. Konfigurasi koneksi database

File konfigurasi (dibuat di repo, sudah cocok untuk XAMPP default):

- `includes/local/configure.php`
- `admin/includes/local/configure.php`

Ubah `DB_SERVER`, `DB_SERVER_USERNAME`, `DB_SERVER_PASSWORD`, dan `DB_DATABASE`
bila kredensial MySQL berbeda. Alamat toko **tidak** disetel di sini — dibaca
otomatis dari URL yang dibuka.

> **Peringatan:** `root` tanpa password adalah konfigurasi **lokal
> pengembangan** di XAMPP. Jangan dipakai di server production.

## 6. Konfigurasi Apache dan PHP

### 6.1 `mod_rewrite` (wajib)

Tanpa ini, semua URL produk/kategori/admin akan **404**.

Di `C:\xampp\apache\conf\httpd.conf`:

```apache
LoadModule rewrite_module modules/mod_rewrite.so   # hilangkan tanda # bila ada
```

Pastikan `.htaccess` diizinkan (di blok `<Directory>` yang relevan):

```apache
AllowOverride All
```

Restart Apache setelahnya.

### 6.2 `php.ini` (disarankan)

Di `C:\xampp\php\php.ini`, sesuaikan lalu restart Apache:

```ini
memory_limit = 512M
max_execution_time = 600
max_input_time = 600
max_input_vars = 10000
post_max_size = 64M
upload_max_filesize = 64M
max_file_uploads = 50
```

Gunakan `max_input_vars` tinggi untuk import produk besar dan
`post_max_size`/`upload_max_filesize` untuk upload gambar.

## 7. Folder runtime

Folder runtime sudah ikut repository lewat file `.gitkeep` dan **tidak** perlu
dibuat manual pada clone yang benar:

```
assets/
lib/frontend/runtime/    lib/backend/runtime/    lib/console/runtime/
themes/<tema>/cache/
images/emails/           uploads/backups/        admin/backups/
```

Kalau ada yang hilang:

```powershell
cd C:\xampp\htdocs\osc414
New-Item -ItemType Directory -Force -Path assets, lib/frontend/runtime, lib/backend/runtime, lib/console/runtime, admin/backups, uploads/backups, images/emails | Out-Null
```

## 8. Build frontend React

Frontend React **wajib di-build** karena `public/` (hasil build) tidak ikut git.
Lihat [frontend-development.md](frontend-development.md) untuk detail.

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm.cmd install
npm.cmd run build
```

## 9. Buka di browser

| Halaman | URL |
|---|---|
| Storefront | `http://localhost/osc414/` |
| Admin | `http://localhost/osc414/admin/` |

Bisa diakses dari device lain dalam jaringan yang sama via
`http://<IP-PC-XAMPP>/osc414/`.

## Checklist validasi instalasi

| # | Cek | Harapan |
|---|---|---|
| 1 | `http://localhost/osc414/` | Storefront React tampil (bukan teks/tema lama) |
| 2 | `http://localhost/osc414/api/storefront/dashboard` | JSON berisi kanal & produk (bukan 404/500) |
| 3 | `http://localhost/osc414/admin/` | Halaman login admin |
| 4 | Halaman katalog React | Produk tampil, bukan "0 Produk Pilihan" |
| 5 | `lib/frontend/web/react/public/index.html` | Ada (hasil build) |

Kalau ada yang gagal, lihat [troubleshooting.md](troubleshooting.md).

## Langkah lanjutan

- Pengembangan React: [frontend-development.md](frontend-development.md)
- Uji endpoint & cek data: [api-database.md](api-database.md)
- Sinkronisasi git, toko tambahan, console: [maintenance.md](maintenance.md)
