# ecomerce-webapps

Repository ini berisi aplikasi ecommerce **osCommerce 4.14** (platform Trueloaded/Yii 2) dari folder `C:\xampp\htdocs\osc414`.

---

## 1. Prasyarat

- **XAMPP** (Apache + MySQL/MariaDB + PHP 8.2)
  Unduh di: https://www.apachefriends.org
- Git (opsional, hanya jika ingin clone dari GitHub)

---

## 2. Penempatan File

Tempatkan seluruh isi repository ini di dalam direktori web server, dalam folder bernama `osc414`:

```
C:\xampp\htdocs\osc414
```

Cara memindah file:

- **Jika dari ZIP / hasil copy manual:**
  Ekstrak/salin folder `osc414` sehingga hasil akhirnya menjadi:
  `C:\xampp\htdocs\osc414\index.php`

- **Jika dari GitHub:**
  ```bash
  cd C:\xampp\htdocs
  git clone https://github.com/theproject13/ecomerce-webapps.git osc414
  ```

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

## 4. Membuat Database dan Tabel (SQL)

Situs ini memakai koneksi database:
```
host     : localhost
user     : root
password : (kosong)
database : osc414
```
Konfigurasi tersebut ada di file:
- `includes/local/configure.php`
- `admin/includes/local/configure.php`

**Langkah 1 - Buat database:**
```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS osc414 CHARACTER SET utf8 COLLATE utf8_general_ci;"
```

**Langkah 2 - Import seluruh tabel dari file dump:**
```bash
C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql
```

Proses import sekitar 384 tabel (termasuk `admin`, `products`, `categories`, `customers`, `orders`, `platforms`, dan lainnya).

**Alternatif via phpMyAdmin:**
1. Buka `http://localhost/phpmyadmin`
2. Login (user `root`, password kosong)
3. Tab **Import** → pilih file `C:\xampp\htdocs\osc414\sql\trueloaded.sql` → **Go**

Jika nama/user/password database diubah, sesuaikan juga isi kedua file `*.php` di `configure.php` di atas.

---

## 5. Membuka di Web Browser

Setelah Apache + MySQL jalan dan database ter-import:

| Halaman          | URL                                              |
|------------------|--------------------------------------------------|
| Frontend (toko)  | http://localhost/osc414/                          |
| Admin (backend)  | http://localhost/osc414/admin/                    |

**Login Admin:**
- Email: `admin@localhost.local`
- Password: diatur saat proses instalasi pertama (jika lupa, reset lewat tabel `admin` di phpMyAdmin, atau ulangi instalasi via `http://localhost/osc414/install/`).

> Catatan: URL admin diatur di `admin/includes/local/configure.php` (`DIR_WS_ADMIN`).

---

## 6. Menambahkan File yang Tidak Ter-push dari Device Ini

Sebagian file di perangkat ini **tidak ikut ter-upload** ke GitHub karena masuk daftar `.gitignore`, contoh:
- Folder duplikat: `watch/`, `furniture/`, `printshop/`, `b2b-supermarket/`
- Cache & runtime: `lib/*/runtime/`, `themes/*/cache/`, `assets/`

Untuk **menambahkan/mem-push file baru** (misal file hasil edit atau folder yang sebelumnya di-skip):

```bash
cd C:\xampp\htdocs\osc414
git add <nama-file-atau-folder>
git commit -m "Tambah <deskripsi>"
git push origin main
```

Contoh menambahkan gambar baru di `images/`:
```bash
git add images/logo-baru.png
git commit -m "Tambah logo baru"
git push origin main
```

Untuk **memaksa file yang sedang di-ignore** agar ikut ter-push (misal folder duplikat `watch`):
```bash
git add -f watch furniture printshop b2b-supermarket
git commit -m "Tambahkan tema duplikat"
git push origin main
```

> Peringatan: folder duplikat tersebut berukuran besar (±560MB per folder), pastikan ukuran dan kebutuhan sebelum menambahkannya.

Untuk **menarik/menyinkronkan** perubahan terbaru di perangkat lain:
```bash
git pull origin main
```

---

## Struktur Direktori Utama

```
osc414/
├── admin/               # Backend / dashboard admin
├── includes/            # Konfigurasi & file inti
├── install/             # Installer
├── lib/                 # Kerangka Yii2 + vendor (dependency)
├── sql/trueloaded.sql   # Dump database (import manual)
├── themes/              # Theme: basic, deals, splash, watch, furniture, dll (+ mobile)
├── images/              # Gambar produk & asset
├── uploads/             # File upload pengguna
└── index.php            # Entry point frontend
```