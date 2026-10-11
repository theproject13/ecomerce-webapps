# Troubleshooting

Format tiap masalah: **Gejala → Kemungkinan penyebab → Pemeriksaan → Solusi →
Verifikasi**. Utamakan urutan itu.

Referensi: [installation.md](installation.md) · [frontend-development.md](frontend-development.md) · [api-database.md](api-database.md)

---

## 1. Semua URL 404 (produk, kategori, admin)

**Gejala:** membuka `http://localhost/osc414/` atau halaman produk → 404.

**Kemungkinan penyebab:** folder salah tempat (pembungkus ganda),
`mod_rewrite` mati, atau `AllowOverride` bukan `All`.

**Pemeriksaan:**
```powershell
Test-Path C:\xampp\htdocs\osc414\index.php   # harus True
Test-Path C:\xampp\htdocs\osc414\ecommerce-webapps-main   # harus False
```

**Solusi:** pindahkan file ke `htdocs\osc414` (bukan subfolder tambahan), aktifkan
`LoadModule rewrite_module modules/mod_rewrite.so`, set `AllowOverride All`,
restart Apache. Lihat [installation.md](installation.md#61-mod_rewrite-wajib).

**Verifikasi:** `http://localhost/osc414/api/storefront/dashboard` membalas JSON.

---

## 2. `Unable to connect to database server!` / HTTP 500

**Gejala:** halaman error koneksi DB, atau API membalas 500.

**Kemungkinan penyebab:** MySQL belum jalan; dump belum di-import; kredensial
nama DB berbeda.

**Pemeriksaan:**
```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "SELECT COUNT(*) FROM osc414.platforms;"
```

**Solusi:** start MySQL; import dump; samakan kredensial di
`includes/local/configure.php` dan `admin/includes/local/configure.php`.

**Verifikasi:** query di atas mengembalikan angka, bukan error.

---

## 3. Import SQL "berhasil" tapi database kosong

**Gejala:** perintah import selesai cepat tanpa error, tetapi tabel kosong.

**Kemungkinan penyebab:** memakai `mysql ... < file.sql` di PowerShell;
tanda `<` bukan redirect di PowerShell sehingga dump tidak terbaca.

**Pemeriksaan:** cek jumlah tabel `information_schema` untuk `osc414`.

**Solusi:** bungkus dengan `cmd /c`:
```powershell
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root osc414 < C:\xampp\htdocs\osc414\sql\trueloaded.sql"
```

**Verifikasi:** `SELECT COUNT(*) FROM osc414.customers;` > 0.

---

## 4. `npm` gagal: "npm.ps1 cannot be loaded" / Execution Policy

**Gejala:** menjalankan `npm` di PowerShell diblokir
(*running scripts is disabled on this system*).

**Kemungkinan penyebab:** Execution Policy melarang `npm.ps1`.

**Solusi (cepat):** pakai `npm.cmd` alih-alih `npm`.
**Solusi (permanen):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**Verifikasi:** `npm.cmd -v` menampilkan versi.

---

## 5. Toko tampil tema lama / bukan React

**Gejala:** `http://localhost/osc414/` menampilkan halaman model PHP lama.

**Kemungkinan penyebab:** frontend belum di-build, atau `public/` kosong.

**Pemeriksaan:** `Test-Path lib\frontend\web\react\public\index.html`.

**Solusi:**
```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm.cmd install
npm.cmd run build
```

**Verifikasi:** `public/index.html` ada; `http://localhost/osc414/` menampilkan
storefront React.

---

## 6. Build gagal / error TypeScript

**Gejala:** `npm run build` berhenti dengan error `tsc`.

**Kemungkinan penyebab:** error tipe di sumber React; `public/` sengaja **tidak**
ditimpa agar build lama tetap aman.

**Solusi:** perbaiki error tipe, atau sementara `npm.cmd run build:only` (tanpa
typecheck) untuk memastikan bundling; jangan commit build yang belum lulus
typecheck.

**Verifikasi:** `npm.cmd run typecheck` selesai tanpa error.

---

## 7. Produk "0 Produk Pilihan" / katalog 404 padahal DB berisi

**Gejala:** homepage menampilkan "0 Kanal" / "0 Produk Pilihan"; katalog
"Gagal memuat produk (404)".

**Kemungkinan penyebab:** build belum ada; API 404 (folder/rewrite); atau
data kanal tidak cocok.

**Pemeriksaan:** buka `http://localhost/osc414/api/storefront/dashboard` dan
`.../products?scope=all`. Lihat kolom diagnosis di
[api-database.md](api-database.md#5-diagnosis-masalah).

**Verifikasi:** dashboard mengembalikan `channel_count` > 0.

---

## 8. Halaman tanpa CSS / gambar rusak

**Gejala:** layout berantakan, gambar produk tidak muncul.

**Kemungkinan penyebab:** `platforms.platform_url` tidak cocok dengan folder,
atau base path aset (`VITE_BASE_PATH`) tidak cocok saat build.

**Pemeriksaan:** bersihkan cache `lib/*/runtime/cache`; cek `VITE_BASE_PATH`
di `lib/frontend/web/react/.env` terhadap `.htaccess`.

**Solusi:** sesuaikan `.env`, `npm.cmd run build` ulang. Untuk override URL DB
pakai `sql/set-platform-url.sql`.

**Verifikasi:** muat ulang; aset `/osc414/react-assets/...` membalas 200.

---

## 9. Mengarah ke `https://` lalu gagal

**Gejala:** browser dipaksa ke HTTPS sementara server hanya HTTP.

**Kemungkinan penyebab:** `ssl_enabled = 2` (paksa HTTPS) di database.

**Solusi:** jalankan `sql/set-platform-url.sql` (mengubah ke `0`).

**Verifikasi:** URL kembali ke `http://`.

---

## 10. Halaman putih tanpa pesan

**Gejala:** halaman kosong.

**Pemeriksaan:** `C:\xampp\apache\logs\error.log` dan
`lib/frontend/runtime/logs/app.log`.

**Kemungkinan penyebab umum:** error PHP fatal, folder runtime hilang.

**Solusi:** buat folder runtime ([installation.md](installation.md#7-folder-runtime)).

**Verifikasi:** error.log tidak bertambah setelah reload.

---

## 11. Error "cache path does not exist"

**Gejala:** aplikasi error menyebut `runtime`.

**Kemungkinan penyebab:** folder `lib/*/runtime` hilang.

**Solusi:**
```powershell
cd C:\xampp\htdocs\osc414
New-Item -ItemType Directory -Force -Path lib/frontend/runtime, lib/backend/runtime, lib/console/runtime | Out-Null
```

**Verifikasi:** halaman kembali normal; folder terisi file cache.

---

## 12. Kanal tambahan (furniture/watch/b2b/printshop) 404

**Gejala:** tautan ke kanal satellite 404 di device baru.

**Kemungkinan penyebab:** folder kanal besar **tidak** ikut repo (gitignored).

**Solusi:** salin folder secara manual, atau nonaktifkan kanal lewat
`sql/set-platform-url.sql` / Admin → Platforms. Lihat
[maintenance.md](maintenance.md#3-toko-tambahan-satellite).

**Verifikasi:** `http://localhost/osc414/furniture/` merespons, atau kanal tidak
lagi ditautkan.

---

## 13. Admin menolak / salah host

**Gejala:** `/osc414/admin/` di host publik dialihkan, atau `admin.localhost`
menolak path storefront.

**Kemungkinan penyebab:** pemisahan host via vhost (isolasi jaringan).

**Solusi:** akses admin lewat host yang benar; lihat
[architecture.md](architecture.md#peta-host) dan
[deployment-rollback.md](deployment-rollback.md).

**Verifikasi:** `/osc414/admin/` di host publik → 301; storefront di
`admin.localhost` → 403.
