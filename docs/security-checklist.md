# Security Checklist

## Same-origin

React dan API dilayani dari `http://localhost/osc414/`, jadi `credentials:
'same-origin'` sudah cukup untuk membawa cookie session PHP. Tidak ada
konfigurasi CORS, dan tidak boleh ditambahkan.

`api-client.ts` memakai `credentials: 'same-origin'`, bukan `include`, supaya
permintaan tidak pernah membawa cookie ke origin lain.

## Isolasi admin

| Aturan | Status |
| --- | --- |
| `/osc414/admin/` di host publik 301 ke `admin.localhost` | Terverifikasi |
| `admin.localhost` menolak `/osc414/`, `/api/`, `/react-assets/`, kanal | 403, terverifikasi |
| `admin.localhost` menolak path di luar `/osc414/admin` | 403, terverifikasi |

Pemisahan admin lewat hostname adalahisolasi jaringan, bukan autentikasi.
Admin tetap wajib punya login yang kuat dan session yang aman.

## Kebocoran source

`lib/` dapat diakses web di instalasi ini. File `.php` dieksekusi sehingga
isinya tidak bocor sebagai teks, tetapi berkas lain seperti `.tpl`, `.md`,
`.json`, `.ts`, dan `.css` akan disajikan apa adanya.

`lib/frontend/web/react/.htaccess` menutup semua path kecuali yang memuat
`/react/public/`. Yang sudah diverifikasi 403:

```
src/main.tsx, src/app/App.tsx, src/lib/api-client.ts, src/styles/tokens.css,
package.json, package-lock.json, vite.config.ts, tsconfig.json,
tsconfig.node.json, .env, index.html, node_modules/vite/package.json
```

Berkas `.env` memuat konfigurasi deploy saja, bukan rahasia, tetapi tetap
harus tidak dapat diunduh.

`.htaccess` di root juga menolak
`^lib/frontend/web/react/(src|tests|node_modules)` sebagai lapisan kedua.

### Risiko tersisa di luar folder React

`lib/` secara umum masih terbuka untuk berkas non-PHP, dan `.tpl` sudah
terbukti bisa dibaca plaintext lewat HTTP. Perlu audit terpisah untuk
menentukan apakah `lib/` sebaiknya ditutup seluruhnya. Jangan menutup `lib/`
sebelum dipastikan modul, cron, atau admin tidak bergantung pada akses web ke
sana.

## Aset

- `public/` hasil build tidak di-version control (`.gitignore`)
- Nama berkas berhash isi, sehingga aman di-cache browser
- Aset lama dihapus tiap build (`emptyOutDir: true`); smoke test memastikan
  aset lama memberi 404

## Yang belum dikerjakan

- Belum ada proteksi CSRF aktif. `lib/csrf.ts` sudah ada dan `api-client.ts`
  mengirim `X-CSRF-Token` bila tersedia, tetapi backend belum menerbitkan
  token. Semua endpoint yang sekarang hanya GET, jadi belum ada risiko CSRF
  yang bisa dieksploitasi. Wajib diselesaikan sebelum endpoint keranjang,
  checkout, atau akun dibuka untuk write.
- Belum ada rate limit pada API.
- Belum ada validasi input di sisi server untuk parameter `featured_limit`
  dan `limit`; keduanya sudah dibatasi rentang di controller.
- Header `X-Frame-Options: SAMEORIGIN` sudah ada dari `.htaccess` root.
  Content Security Policy belum ada.
- Integrasi pembayaran belum ada. Saat Midtrans ditambahkan, kunci rahasia
  hanya boleh ada di server (`ext/modules/payment/midtrans/`), tidak pernah
  di bundle React.

## Rahasia

- Kredensial admin hanya dipakai untuk verifikasi manual lewat browser dan
  tidak pernah ditulis ke berkas.
- `node_modules` dan `.env` tidak boleh masuk commit.
- `lib/frontend/runtime/logs/` sudah menolak akses web (403). Jangan longgarkan
  aturan itu; log bisa memuat data session.