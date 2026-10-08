# ecomerce-webapps

Aplikasi ecommerce **osCommerce 4.14** (platform Trueloaded/Yii 2).

Repository ini bisa dipakai di device mana pun: nama folder, port, dan IP tidak
perlu sama. Alamat toko dibaca otomatis dari URL yang sedang dibuka, sehingga
satu dump database yang sama bisa dipakai ulang di semua perangkat.

---

## 0. Ringkasan Step-by-Step (dari nol sampai jalan)

```bash
# 1. Clone repo
cd C:\xampp\htdocs
git clone https://github.com/theproject13/ecomerce-webapps.git osc414

# 2. Jalankan XAMPP (Apache + MySQL) lewat XAMPP Control Panel

# 3. Buat database + import dump
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS osc414 CHARACTER SET utf8 COLLATE utf8_general_ci;"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql"

# 4. Buka admin (backend) di browser
#    http://localhost/osc414/admin/

# 5. Install dependency React
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm install

# 6. Jalankan dev server React (port 5173)
npm run dev
# buka http://localhost:5173/
```

Detail tiap langkah ada di bagian 9 (Frontend React) dan bagian 2-7 di bawah.

---

## 1. Prasyarat

- **XAMPP** (Apache + MySQL/MariaDB + PHP 8.2)
  Unduh di: https://www.apachefriends.org
- Git (hanya jika ingin clone dari GitHub)
- **Node.js 18+** (untuk frontend React) - unduh di: https://nodejs.org
  Cek versi: `node -v` dan `npm -v`

Ekstensi PHP yang wajib aktif (XAMPP sudah menyediakannya secara default):

```
pdo_mysql, pdo, mbstring, intl, curl, openssl, gd, fileinfo, zip, sodium, soap, xml
```

Daftar lengkapnya bisa dicek di `lib/requirements.php`.

---

## 2. Menaruh File

Letakkan folder store di dalam direktori web server. **Nama folder bebas**,
tapi contoh di bawah memakai `osc414`.

```
C:\xampp\htdocs\osc414
```

### Cara A — clone dari GitHub (folder otomatis bernama `osc414`)

```bash
cd C:\xampp\htdocs
git clone https://github.com/theproject13/ecomerce-webapps.git osc414
```

### Cara B — download ZIP dari GitHub

GitHub memberi nama folder hasil unduhan **`ecommerce-webapps-main`**, bukan
`osc414`. Pilih salah satu:

- **Rename** foldernya jadi `osc414` supaya URL sama seperti contoh di bawah, atau
- **Biarkan** apa adanya, tapi ingat URL-nya jadi `ecommerce-webapps-main`.

> Penting: file store harus berada **langsung** di dalam folder itu, bukan di
> dalam subfolder tambahan. Yang benar:
> `C:\xampp\htdocs\osc414\index.php`
> Salah (pembungkus ganda, penyebab paling umum 404):
> `C:\xampp\htdocs\osc414\ecommerce-webapps-main\`

---

## 3. Menjalankan XAMPP

**Cara 1 - XAMPP Control Panel:**
1. Buka `XAMPP Control Panel` (biasanya di `C:\xampp\xampp-control.exe`)
2. Klik **Start** pada: Apache
3. Klik **Start** pada: MySQL
4. Pastikan status keduanya hijau/berjalan

**Cara 2 - Lewat Command Line (PowerShell/CMD):**
```bash
C:\xampp\apache\bin\httpd.exe
C:\xampp\mysql\bin\mysqld.exe
```

> PHP, Apache, dan MySQL harus aktif sebelum membuka website.

---

## 4. Mengaktifkan `mod_rewrite`

Tanpa ini semua URL produk, kategori, dan admin akan **404**, karena aturan
rewrite ada di `.htaccess`.

1. Buka `C:\xampp\apache\conf\httpd.conf`, pastikan baris ini **tidak** diawali `#`:
   ```apache
   LoadModule rewrite_module modules/mod_rewrite.so
   ```
2. Pastikan `AllowOverride` mengizinkan `.htaccess`:
   ```apache
   AllowOverride All
   ```
3. Restart Apache.

---

## 5. Setting `php.ini`

Buka `C:\xampp\php\php.ini`, ubah nilainya, lalu restart Apache:

```ini
memory_limit = 512M
max_execution_time = 600
max_input_time = 600
max_input_vars = 10000
post_max_size = 64M
upload_max_filesize = 64M
max_file_uploads = 50
```

Restart Apache setelah mengubah `php.ini`.

---

## 6. Membuat Database dan Tabel (SQL)

Koneksi database yang dipakai aplikasi:

```
host     : localhost
user     : root
password : (kosong)
database : osc414
```

File konfigurasinya ada di:
- `includes/local/configure.php`
- `admin/includes/local/configure.php`

Kalau nama/user/password database diubah, sesuaikan kedua file tersebut.
Alamat toko **tidak** ada di sini — dibaca otomatis dari URL yang dibuka.

### Langkah 1 - Buat database

```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS osc414 CHARACTER SET utf8 COLLATE utf8_general_ci;"
```

### Langkah 2 - Import dump

> **Penting untuk PowerShell:** tanda `<` bukan operator redirect di
> PowerShell, perintah `mysql ... < file.sql` akan gagal diam-diam. Bungkus
> dengan `cmd /c`:

```powershell
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql"
```

Di CMD (bukan PowerShell) perintah aslinya juga bisa dipakai:

```cmd
C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql
```

Import sekitar 384 tabel dan butuh 1–3 menit. Tunggu sampai selesai.

### Alternatif via phpMyAdmin

1. Buka `http://localhost/phpmyadmin`
2. Login (user `root`, password kosong)
3. Tab **Import** → pilih file `sql/trueloaded.sql` → **Go**

> Kapasitas upload phpMyAdmin dibatasi oleh `upload_max_filesize` di
> `php.ini`. Naikkan ke `64M` dulu, kalau tidak file 42 MB akan ditolak.

### Langkah 3 - Pastikan folder runtime ada

Folder berikut sudah ikut repository (berisi file `.gitkeep`) dan **tidak**
perlu dibuat manual. Kalau_clone dilakukan dengan benar, semua sudah ada:

```
assets/
lib/frontend/runtime/    lib/backend/runtime/    lib/console/runtime/
themes/<tema>/cache/
images/emails/           uploads/backups/        admin/backups/
```

Kalau sebuah folder hilang, buat manual:

```powershell
cd C:\xampp\htdocs\osc414
New-Item -ItemType Directory -Force -Path assets, lib/frontend/runtime, lib/backend/runtime, lib/console/runtime, admin/backups, uploads/backups, images/emails | Out-Null
```

---

## 7. Membuka di Web Browser

Sesuaikan nama folder dengan yang benar-benar dipakai:

| Halaman          | URL                          |
|------------------|------------------------------|
| Frontend (toko)  | http://localhost/osc414/     |
| Admin (backend)  | http://localhost/osc414/admin/ |

Kalau folder tidak di-rename jadi `osc414`:

| Halaman | URL                                     |
|---------|-----------------------------------------|
| Frontend | http://localhost/ecommerce-webapps-main/ |
| Admin    | http://localhost/ecommerce-webapps-main/admin/ |

Bisa juga diakses dari device lain dalam jaringan yang sama:

```
http://<IP-PC-XAMPP>/osc414/
```

First time phpMyAdmin, login admin:
- Email: `admin@localhost.local`
- Password: diatur saat proses instalasi pertama.

---

## 8. Memakai Database di Device Kedua

Dump `sql/trueloaded.sql` sudah aman dipindah ke device lain. Yang perlu
disesuaikan hanya:

1. **Nama folder** — bebas, tidak perlu `osc414`.
2. **Kredensial database** di `includes/local/configure.php` dan
   `admin/includes/local/configure.php`.
3. **Tidak perlu** mengubah `platforms.platform_url`.

Alamat toko dibaca dari URL yang sedang dibuka. Kalau `platforms.platform_url`
di database tidak sama dengan alamat yang dipakai, aplikasi otomatis mengikuti
alamat yang benar dan mengabaikan nilai lama.

Untuk kasus lanjutan seperti mengunci URL tetap atau multi-domain, pakai
`sql/set-platform-url.sql` (ubah variabel `@store_url` di dalamnya, lalu
import).

### Toko tambahan (Furniture, Watch, b2b, Print Shop)

Dump mendaftarkan 4 toko tambahan dengan URL `localhost/furniture`,
`localhost/watch`, `localhost/b2b-supermarket`, dan `localhost/printshop`.
Folderfolder tersebut **tidak** ikut repository (sudah masuk `.gitignore` karena
sangat besar), jadi di device baru tautannya akan 404.

Pilih salah satu:
- Salin folder tersebut secara manual ke `C:\xampp\htdocs\`, atau
- Matikan toko tambahannya lewat `sql/set-platform-url.sql`, atau
- Nonaktifkan lewat Admin → Platforms.

---

## 9. Frontend React (install, dev server, build)

Frontend React ada di `lib/frontend/web/react/`. Butuh **Node.js 18+**
(`node -v` untuk cek).

### 9.1 Install dependency (sekali di awal / setelah `package.json` berubah)

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm install
```

`node_modules/` tidak ikut repository, jadi wajib `npm install` di device baru.

### 9.2 Jalankan dev server (development)

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm run dev
```

- React dilayani Vite di **http://localhost:5173/** (`strictPort`, kalau port
  dipakai maka gagal, bukan pindah port).
- API (`/osc414/api/*`), halaman PHP, dan gambar tetap dilayani **Apache
  port 80** lewat proxy di `vite.config.ts`. Jadi XAMPP (langkah 3) harus
  jalan dulu sebelum `npm run dev`.
- Kalau folder toko bukan `osc414`, set env di file `.env`
  (`VITE_DEV_PROXY_TARGET=http://localhost` dan path proksi menyesuaikan).

### 9.3 Build untuk production

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm run build
```

- `npm run build` = typecheck (`tsc --noEmit`) lalu `vite build`.
- Output ke folder `public/` (dikosongkan tiap build) dengan base path
  `/osc414/react-assets/`, jadi halaman PHP memakai bundle hasil build itu.
- `npm run build:only` = build tanpa typecheck.
- `npm run typecheck` = cek tipe saja.
- Setelah build, hasilnya dibuka lewat **http://localhost/osc414/**
  (Apache), bukan port 5173.

> `public/` adalah outDir build - jangan taruh file manual di sana (akan
> terhapus). Aset statis (favicon, banner) taruh di `static/`.

### 9.4 Login admin (backend)

Backend tidak butuh Node - cukup XAMPP jalan:

| Halaman | URL |
|---|---|
| Admin (backend) | http://localhost/osc414/admin/ |
| Toko (frontend PHP) | http://localhost/osc414/ |
| React dev | http://localhost:5173/ |

---

## 10. Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| **404 Not Found** saat membuka URL | Folder tidak berada di `htdocs`, atau URL punya path dobel (mis. `osc414/ecommerce-webapps-main`). Cek struktur file, lihat §2. |
| **Halaman tanpa CSS / gambar rusak** | `DIR_WS_HTTP_CATALOG` salah, biasanya `platforms.platform_url` tidak cocok dengan folder. Sudah ditangani otomatis; kalau masih muncul, bersihkan cache `lib/*/runtime/cache`. |
| **Mengarah ke `https://` lalu gagal** | `ssl_enabled = 2` (paksa HTTPS) sementara server hanya HTTP. Sudah diubah ke `0` di dump; kalau DB lama masih `2`, jalankan `sql/set-platform-url.sql`. |
| **Semua URL produk 404** | `mod_rewrite` mati atau `AllowOverride` bukan `All`. Lihat §4. |
| **`Unable to connect to database server!`** | MySQL belum jalan, atau dump belum di-import. Lihat §6. |
| **Error saat upload gambar besar** | `upload_max_filesize` / `post_max_size` masih kecil. Lihat §5. |
| **Halaman putih tanpa pesan** | Buka `C:\xampp\apache\logs\error.log` untuk pesan detailnya. |
| **Error "cache path does not exist"** | Folder `lib/*/runtime` hilang. Lihat §6 langkah 3. |

---

## 11. Menjalankan Aplikasi Console

```bash
cd C:\xampp\htdocs\osc414
C:\xampp\php\php.exe yii.php
```

Deteksi URL otomatis sengaja dimatikan untuk mode CLI, jadi console memakai
nilai `platforms.platform_url` apa adanya.

---

## 12. Sinkronisasi dengan GitHub

Folder ini di-`.gitignore` dan **tidak** ikut ter-push karena ukurannya besar:

```
/watch/    /furniture/    /printshop/    /b2b-supermarket/
```

Isinya salinan penuh dari store di atas. Kalau memang perlu ikut, paksa dengan
`git add -f`. Peringatan: sekitar 560 MB per folder.

Sebaliknya, folder runtime (`lib/*/runtime/`, `themes/*/cache/`, `assets/`)
**hanya** foldernya yang ikut lewat file `.gitkeep`; isinya (cache, log)
diabaikan dan dibuat ulang otomatis oleh aplikasi.

Untuk mengambil perubahan terbaru di device lain:

```bash
git pull origin main
```

### File vendor yang tercecer dari `.gitignore`

Beberapa paket vendor menyertakan `.gitignore` sendiri yang cocok
case-insensitive di Windows, sehingga file yang ada di disk tidak pernah
ter-commit. Untuk menyamakan dengan device ini:

```bash
git add -f lib/vendor/bower-asset/jquery.inputmask/dist/inputmask
```

---

## Struktur Direktori Utama

```
osc414/
├── admin/               # Backend / dashboard admin
├── includes/            # Konfigurasi & file inti
│   └── local/           # Kredensial database (wajib disesuaikan per device)
├── install/             # Installer
├── lib/                 # Kerangka Yii2 + vendor (dependency)
├── sql/
│   ├── trueloaded.sql   # Dump database (import manual)
│   └── set-platform-url.sql  # Override URL toko secara manual
├── themes/              # Theme: basic, deals, splash, watch, furniture, dll (+ mobile)
├── images/              # Gambar produk & asset
├── uploads/             # File upload pengguna
└── index.php            # Entry point frontend
```