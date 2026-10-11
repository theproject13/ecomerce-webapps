# Frontend Development (React + Vite)

Untuk developer yang mengembangkan storefront React. Prasyarat OS-level
(XAMPP, database) ada di [installation.md](installation.md).

## 1. Prasyarat Node.js

| Item | Nilai |
|---|---|
| Versi minimum | Node.js **18+** |
| Disarankan | LTS 20/22 (terverifikasi 24.11.1) |
| Alasan | Vite 5.4.8 `engines: ^18.0.0 || >=20.0.0` |

`package.json` tidak mengunci versi Node, jadi bebas memakai LTS terbaru.

```powershell
node -v
npm.cmd -v
```

## 2. Lokasi direktori frontend

```
lib/frontend/web/react/
├── .env               # VITE_BASE_PATH, VITE_CATALOG_BASE, VITE_DEV_PROXY_TARGET
├── index.html         # entry Vite
├── vite.config.ts     # outDir public/, publicDir static/, proxy dev
├── package.json
├── public/            # HASIL build (tidak ikut git)
├── static/            # aset statis yang disalin apa adanya (favicon, banner)
└── src/
    ├── app/           # App, router, providers
    ├── pages/         # satu file per URL
    ├── components/    # komponen UI
    ├── features/      # logika domain + panggilan API per fitur
    ├── lib/           # api-client, csrf, routes, utils
    └── ...
```

Semua perintah di bawah dijalankan dari `lib/frontend/web/react/`.

## 3. Instalasi dependency

```powershell
cd C:\xampp\htdocs\osc414\lib\frontend\web\react
npm.cmd install
```

Jalankan ulang setiap kali `package.json`/`package-lock.json` berubah.
`node_modules/` tidak ikut git.

## 4. Development server (Vite)

```powershell
npm.cmd run dev
```

- React dilayani Vite di **`http://localhost:5173/osc414/`**.
  Basename router React adalah `/osc414`, jadi JANGAN buka `http://localhost:5173/`
  tanpa segmen `/osc414`.
- `strictPort: true` — kalau port 5173 sudah dipakai, Vite gagal, tidak pindah port.
- **XAMPP (Apache) harus jalan lebih dulu**, karena Vite mem-proxy permintaan
  API, halaman PHP, dan gambar ke Apache port 80.

### Integrasi proxy dengan Apache

`vite.config.ts` meneruskan path `^/osc414/(?!$)`. Artinya:

- `/osc414/api/...`, `/osc414/catalog`, gambar, dll → diteruskan ke
  `VITE_DEV_PROXY_TARGET` (default `http://localhost`).
- Target **harus origin polos tanpa path** (`http://localhost`, bukan
  `http://localhost/osc414`). Kalau memuat path, permintaan menjadi
  `/osc414/osc414/api/...` dan 404.

Kalau nama folder instalasi bukan `osc414`, sesuaikan `.env`
(`VITE_DEV_PROXY_TARGET`, `VITE_CATALOG_BASE`, `VITE_BASE_PATH`) lalu build ulang.
Lihat [deployment-rollback.md](deployment-rollback.md#kalau-base-path-instalasi-berbeda).

> Mode dev hanya untuk UI. Cart/checkout/login bergantung pada cookie session
> same-origin dan lebih andal diuji lewat Apache (`http://localhost/osc414/`).

## 5. Typecheck dan build production

```powershell
npm.cmd run typecheck    # tsc --noEmit
npm.cmd run build        # tsc --noEmit && vite build
npm.cmd run build:only   # vite build tanpa typecheck
```

- `build` menjalankan typecheck lebih dulu; kalau ada error TypeScript, build
  berhenti dan `public/` **tidak** ditimpa.
- Output: `lib/frontend/web/react/public/`, dengan `emptyOutDir` (dikosongkan
  tiap build) dan base path `/osc414/react-assets/`.

**Lokasi hasil build & verifikasi:**

```
lib/frontend/web/react/public/index.html   # harus ada
lib/frontend/web/react/public/assets/      # bundel JS/CSS ber-hash
```

> `public/` adalah outDir build — jangan menaruh file manual di sana (terhapus
> tiap build). Aset statis (favicon, banner) ditaruh di `static/`.

## 6. Development vs production

| Aspek | `npm run dev` | `npm run build` |
|---|---|---|
| URL | `http://localhost:5173/osc414/` | `http://localhost/osc414/` |
| Pelayan aset | Vite | Apache (`public/`) |
| API | diproxy Vite ke Apache | same-origin, langsung Apache |
| Base path | `/` | `/osc414/react-assets/` |
| Cocok untuk | mengembangkan UI | cart, checkout, login, uji nyata |

## Catatan PowerShell

Dua kendala umum di Windows PowerShell:

1. **`npm.ps1` diblokir Execution Policy** → muncul error seperti
   *"npm.ps1 cannot be loaded because running scripts is disabled"*.
   Solusi cepat: pakai `npm.cmd` alih-alih `npm`.
   Solusi permanen:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```
2. **Redirect `<` tidak didukung** PowerShell (relevan saat import SQL di
   [installation.md](installation.md)) — bungkus dengan `cmd /c`.

## Perintah ringkas

| Perintah | Fungsi |
|---|---|
| `npm.cmd install` | pasang dependency |
| `npm.cmd run dev` | dev server (5173) |
| `npm.cmd run typecheck` | cek tipe saja |
| `npm.cmd run build` | typecheck + build → `public/` |
| `npm.cmd run build:only` | build tanpa typecheck |

## Uji regresi frontend

```powershell
powershell -ExecutionPolicy Bypass -File tests/regression/smoke-storefront.ps1
```

Menjalankan Apache/XAMPP dan menguji homepage React, aset, isolasi admin, serta
kontrak API. Lihat [architecture.md](architecture.md#verifikasi).
