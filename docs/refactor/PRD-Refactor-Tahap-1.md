# PRD — Refaktoring Struktur Project (Tahap 1 / Fix Foundation)

| Item | Nilai |
|---|---|
| **Proyek** | E-Commerce Web Applications (`ecomerce-webapps`) |
| **Dokumen** | PRD Rencana Refaktoring — Tahap 1 |
| **Versi** | 1.0.0 (Draft) |
| **Status** | Proposed |
| **Tanggal** | 2026-11-20 |
| **Basis** | PHP 8.2, Yii2, osCommerce 4.14/TrueLoaded, React 18, TypeScript, Vite 5, MySQL/MariaDB |
| **Konteks aktif** | Migrasi hybrid storefront (Batch 1–4b selesai, **Batch 5 checkout aktif**); admin PHP tidak diubah; tanpa ubah skema inti DB & model/core |

## 1. Ringkasan Eksekutif
Tahap 1 merapikan struktur proyek agar pengembangan & perubahan tidak lambat akibat folder/file yang bercampur, dengan menegakkan pemisahan domain yang jelas:
- **UI Klien (storefront)** dan **UI Admin** **fix terpisah** (struktur, komponen, layout, halaman, service/hook/type, aset domain) agar pengerjaan keduanya independen.
- **Backend (BE) admin & klien digabung dalam satu wadah domain terorganisasi** (`backend/`) untuk logic/service/validator/pemetaan per domain, **tanpa** memindahkan core Yii2/osCommerce yang terikat autoload/namespace/bootstrap.
- Refaktor dilakukan **total cakupan namun bertahap per-slice** dengan baseline & fix-loop: setiap perubahan memunculkan error secara terisolasi lalu diperbaiki, menjaga perilaku existing tetap berjalan.

## 2. Latar Belakang & Masalah (kondisi aktual)
Struktur saat ini bercampur antara runtime legacy dan frontend modern sehingga lokasi perubahan sulit dilacak:
- **Core/runtime hybrid:** `index.php`, `yii.php`, `.htaccess`, `includes/`, `lib/{common,frontend,backend,console,modules,vendor}`, `ext/`, `themes/`, `images/`, `sql/`, `uploads/`.
- **Client (FE/BE tersebar):** React storefront di `lib/frontend/web/react/` (`src/{app,components,features,lib,pages,styles,types}`, `public/` hasil build, `static/`, `vite.config.ts`, `ReactShell.php`) dilayani Apache same-origin (base prod `/ecomerce-webapps/react-assets/`, proxy dev). API di `lib/frontend/controllers/api/*`, controller/page PHP legacy di `lib/frontend/controllers/*`, integrasi shell/routing di komponen frontend.
- **Admin UI legacy:** `admin/` (`assets,css,images,includes,themes,plugins,uploads,index.php,...`) + area `lib/backend/*` (struktur Yii2) — batas UI/logic admin tidak seragam dengan klien.
- **Aset & storage tersebar:** `assets/`, `images/`, `themes/`, `admin/{assets,images,themes}`, `lib/frontend/web/react/{public,static}`, `uploads/` (banyak path dirujuk DB/template/URL).

**Dampak:** sulit menemukan & memodifikasi file, risiko regresi saat ubah satu sisi, duplikasi, dan waktu update lama.

## 3. Tujuan Tahap 1
1. Memisahkan **UI Klien** dan **UI Admin** secara tegas (domain, folder, komponen, aset domain) untuk memudahkan pengerjaan paralel & minim bentrok.
2. Menyediakan **satu wadah BE gabungan** (`backend/`) yang mengelompokkan domain **admin** & **client** (services/validators/pemetaan/logic hasil ekstraksi) secara terorganisasi.
3. Menetapkan **struktur target, peta as-is→to-be, dan konvensi** sebagai acuan tunggal perubahan.
4. Menjaga **kompatibilitas runtime** (Yii2/osCommerce, API, routing, CSRF/session, DB, build/serve React) — refaktor struktur, bukan ubah perilaku bisnis.
5. Mendeteksi & memperbaiki error yang muncul akibat refaktor secara terisolasi per-slice (fix-loop) terhadap baseline.

## 4. Ruang Lingkup

### 4.1 In-scope (Tahap 1)
- **F0 — Audit & baseline:** inventaris, klasifikasi {Admin/Client/Shared/Core-Legacy} × {aman-pindah/butuh-adaptasi/wajib-tetap}, peta dependensi (import/require/namespace, routing `urlManager`/`TlUrlRule`/`api/*`/.htaccess, integrasi `ReactShell`/Vite, referensi aset & `uploads` di kode/template/DB), kontrak API aktual, baseline kesehatan & error bawaan.
- **F1 — Konvensi & kontrak:** dokumen struktur/aturan layer, alias/path standar, `shared/contracts/` (tipe & spesifikasi respons/request aktual, non-runtime).
- **F2 — UI Klien fix terpisah (fisik):** reorganisasi domain React storefront (`components/ui, features, pages, layouts, services, hooks, types, lib, styles`) dan pemusatan akses API; **opsi Tahap 1** relokasi root ke `client/storefront/` (perubahan atomik: `vite.config`, `tsconfig`, scripts, path serve/outDir, `ReactShell.php`, Apache, env/.gitignore, docs) — tanpa ubah perilaku/URL/base.
- **F3 — UI Admin fix terpisah (boundary):** penegasan & perapihan domain UI admin legacy di `admin/` terisolasi dari klien; penyiapan slot `admin/frontend/` **hanya bila ada modul React admin nyata** (komponen UI admin tidak boleh bercampur di klien).
- **F4 — BE gabungan terorganisasi (aman):** pembentukan wadah `backend/{client,admin,shared}` untuk service/validator/helper/pemetaan domain (hasil ekstraksi/baru) + dokumentasi pemetaan ke endpoint/kode existing; controller/model/core tetap kompatibel.
- **F5 — Validasi & stabilisasi:** verifikasi build/smoke/API/admin/aset/log per-slice dan regresi akhir terhadap baseline.

### 4.2 Out-of-scope (Tahap 1)
- Redesign UI/UX, penambahan fitur bisnis, perubahan alur checkout/payment, atau rewrite aplikasi.
- Perubahan skema DB/migrasi data, perubahan `common/models`/core domain, atau sentuh `TlUrlManager`, `TlUrlRule`, `TlSmarty`, `Sceleton` tanpa persetujuan.
- Relokasi fisik massal kelas/controller/model bernamespace, pemecahan autoload/bootstrap Yii2, atau pemindahan `uploads/`/path yang dipersist DB & URL publik secara massal.
- Pembuatan `admin/frontend` React bila belum ada modul admin nyata; migrasi platform lain/microservices.

## 5. Batasan & Guardrails (Non-Negotiable)
- **Kompatibilitas:** tidak ubah perilaku bisnis, kontrak API existing, URL/routing, CSRF, session, atau integrasi same-origin.
- **Core/entry tetap:** `index.php`, `yii.php`, `.htaccess`, `includes/`, `lib/` (bootstrap/autoload/core), `ext/`, `sql/` tidak dipindah/dimodifikasi destruktif; DB & data tidak berubah/hilang.
- **Tidak buat folder/file kosong** hanya untuk memenuhi struktur; buat berdasarkan kebutuhan & audit.
- **Terbukti aman sebelum hapus:** file legacy/duplikat hanya dihapus jika tak punya dependensi.
- **Koordinasi Batch 5 aktif:** hindari konflik area checkout/cart/API terkait.
- **Perubahan kecil & atomik:** commit per-slice, mudah di-review/rollback.

## 6. Prinsip Arsitektur Tahap 1
| Aspek | Keputusan |
|---|---|
| **UI Klien vs Admin** | **Fix terpisah** secara fisik & domain (komponen/layout/pages/services/hooks/types/aset domain tidak bercampur). |
| **BE Admin & Klien** | **Digabung terorganisasi** dalam satu wadah `backend/` per domain (`client/`, `admin/`, `shared/`) untuk logic/ekstraksi/pemetaan; **pemisahan fisik core dilarang** jika memecah autoload/namespace/bootstrap — core tetap di lokasi kompatibel (pemisahan logis). |
| **Shared** | Hanya kode/kontrak yang benar-benar lintas-domain (`shared/contracts/`, helper bersama tervalidasi); bukan tempat “buangan”. |
| **Legacy/Core** | Dipetakan & dipertahankan; dipindah hanya jika terbukti aman & tervalidasi. |
| **Kebenaran server** | Harga/diskon/stok/total/otorisasi tetap divalidasi di server; UI bukan sumber kebenaran. |

## 7. Struktur Folder

### 7.1 Saat ini (ringkas, relevan refaktor)
```text
ecomerce-webapps/
├─ admin/                         # UI admin legacy PHP (assets,css,images,includes,themes,plugins,...)
├─ lib/
│  ├─ backend/                    # struktur Yii2 (sisi backend)
│  ├─ common/                     # model/helpers/komponen bersama (core)
│  ├─ console/ frontend/ modules/ vendor/
│  └─ frontend/
│     ├─ controllers/             # controller PHP (+ api/*)
│     ├─ components/              # integrasi (termasuk routing/shell terkait)
│     ├─ config/                  # urlManager/rules (api/*)
│     └─ web/react/               # React storefront (FE klien saat ini)
│        ├─ src/{app,components,features,lib,pages,styles,types}
│        ├─ public/ (build outDir)  static/ (sumber aset dev)
│        ├─ ReactShell.php  vite.config.ts  package.json  tsconfig*.json
├─ includes/ ext/ themes/ images/ sql/ uploads/ docs/ tests/
├─ assets/ brochure/ documents/ download/ ep_files/ mspcheckout/ pub/
└─ index.php  yii.php  .htaccess  README.md
```

### 7.2 Target Tahap 1 (disepakati: UI fix terpisah, BE gabungan)
> Legenda: **[FISIK]** = dipindah/dibuat & dipakai; **[FISIK-BERTAHAP/OPSIONAL]** = sesuai keputusan atomik; **[SLOT/SAAT ADA ISI]** = dibuat hanya bila ada modul nyata; **[LOGIS/WADAH]** = organisasi/ekstraksi/pemetaan, core tidak direlokasi; **[TETAP]** = lokasi existing dipertahankan.

```text
ecomerce-webapps/
│
├─ client/                                   # [FISIK] DOMAIN UI KLIEN (TERPISAH FIX DARI ADMIN)
│  └─ storefront/                            # app React storefront
│     ├─ src/
│     │  ├─ app/                             # bootstrap, router, providers
│     │  ├─ components/
│     │  │  └─ ui/                           # komponen UI generik klien
│     │  ├─ features/                        # domain klien (per-feature)
│     │  │  ├─ home/
│     │  │  ├─ catalog/
│     │  │  ├─ product/
│     │  │  ├─ cart/
│     │  │  ├─ checkout/
│     │  │  ├─ account/
│     │  │  └─ auth/
│     │  │     └─ (components, hooks, services, types, state)/
│     │  ├─ pages/                           # komposisi halaman/route
│     │  ├─ layouts/
│     │  ├─ services/                        # API client & data-access klien (terpusat)
│     │  ├─ hooks/
│     │  ├─ types/
│     │  ├─ lib/
│     │  └─ styles/
│     ├─ static/                             # sumber aset statik dev (sesuai config)
│     ├─ public/                             # output build (dilayani Apache, sesuai outDir)
│     ├─ index.html
│     ├─ package.json  package-lock.json
│     ├─ tsconfig.json  tsconfig.node.json
│     ├─ vite.config.ts
│     ├─ .env*
│     └─ (integrasi serve: ReactShell disesuaikan atomik — path/config sinkron)
│
├─ admin/                                    # [FISIK] DOMAIN UI/AREA ADMIN (TERISOLASI DARI KLIEN)
│  ├─ frontend/                              # [SLOT/SAAT ADA ISI] UI component React admin (jika ada)
│  │  └─ src/
│  │     ├─ components/{ui,forms,tables,modals,feedback}
│  │     ├─ pages/{dashboard,products,categories,orders,customers,users,reports,settings}
│  │     ├─ layouts/  hooks/  services/  types/  styles/
│  │     └─ (package.json, tsconfig, vite.config) — hanya bila modul React admin dibuat
│  ├─ assets/  css/  images/  themes/  plugins/  includes/  uploads/  backups/  # UI legacy PHP admin (existing, dirapikan)
│  ├─ .htaccess
│  └─ index.php
│
├─ backend/                                  # [LOGIS/WADAH] BE GABUNGAN ADMIN + KLIEN (TERORGANISASI)
│  ├─ client/
│  │  ├─ controllers/                        # pemetaan/facade ke controller existing (kompatibel)
│  │  ├─ services/                           # logic/domain service klien (ekstraksi/baru)
│  │  ├─ validators/
│  │  └─ routes/                             # dokumentasi/pemetaan endpoint klien
│  ├─ admin/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ validators/
│  │  └─ routes/                             # dokumentasi/pemetaan endpoint admin
│  └─ shared/
│     ├─ helpers/
│     ├─ services/
│     └─ config/
│  # CATATAN: controller/model/komponen core bernamespace & autoload/bootstrap
│  # TETAP di lokasi kompatibel (lib/frontend, lib/backend, lib/common, admin).
│  # Folder ini untuk domain logic terorganisasi, ekstraksi aman, dan pemetaan.
│
├─ shared/                                   # [FISIK] LINTAS-DOMAIN (NON-RUNTIME/TERVALIDASI)
│  └─ contracts/
│     ├─ api/                                # spesifikasi request/response aktual
│     └─ types/                              # tipe bersama (TS)
│
├─ lib/                                      # [TETAP/KOMPATIBEL] common, frontend, backend, console, modules, vendor (core)
│  ├─ frontend/controllers/ (+ api/*)        # endpoint aktual (dipetakan ke backend/client)
│  ├─ backend/                               # sisi backend existing (dipetakan ke backend/admin)
│  └─ common/                                # models/helpers/services/components bersama
├─ includes/  ext/  themes/  images/  sql/  uploads/   # [TETAP] legacy/core & storage
├─ docs/
│  ├─ refactor/                              # [FISIK] as-is, to-be, file-map, dependency, do-not-move, risks, STRUCTURE
│  └─ (PRD, arsitektur, troubleshooting existing)
└─ index.php  yii.php  .htaccess  README.md  # [TETAP] entry & root config
```

**Catatan penting struktur:**
- **Client UI**: pemisahan UI klien bersifat **fix & fisik**; pada eksekusi Tahap 1 dapat dilakukan *in-place* di path saat ini lalu relokasi ke `client/storefront/` sebagai langkah atomik (mengubah `vite.config` base/outDir/static, scripts, dan path integrasi `ReactShell.php`/Apache) agar kompatibel.
- **Admin UI**: admin saat ini **PHP legacy**; `admin/frontend/` disiapkan untuk komponen React admin **hanya jika ada modul nyata** sehingga UI admin tetap terpisah dari klien tanpa folder kosong.
- **BE gabungan**: `backend/` adalah **wadah domain terorganisasi** (tempat service/validator/helper/pemetaan admin+klien). Kelas/model/controller core yang bergantung autoload/namespace/bootstrap **tidak direlokasi massal**; disatukan secara logis dan diekstrak bertahap.

## 8. Pemetaan Current → Target (Tahap 1)
| Area | Saat ini | Target Tahap 1 | Mode |
|---|---|---|---|
| UI Klien (React) | `lib/frontend/web/react/src/*` | `client/storefront/src/{app,components/ui,features,pages,layouts,services,hooks,types,lib,styles}` | Fisik (reorg in-place → relokasi atomik opsional) |
| Config/build klien | `lib/frontend/web/react/{vite.config.ts,tsconfig*,package.json,ReactShell.php}` | `client/storefront/*` + integrasi serve/path sinkron | Fisik atomik (jika relokasi) |
| UI Admin (legacy) | `admin/{assets,css,images,includes,themes,plugins,...}` | `admin/*` domain terisolasi, dirapikan & terpetakan | Fisik (rapi) / batas tegas |
| UI Admin (React) | — | `admin/frontend/src/*` | Slot, hanya saat ada modul nyata |
| BE klien (aktual) | `lib/frontend/controllers/*`, `lib/frontend/controllers/api/*` | Dipetakan ke `backend/client/*`; logic terekstrak ke services (namespace kompatibel) | Logis + ekstraksi aman |
| BE admin (aktual) | `admin/*` (flow), `lib/backend/*` | Dipetakan ke `backend/admin/*`; logic terekstrak aman | Logis + ekstraksi aman |
| Shared logic | `lib/common/{helpers,services,components,...}` | Dipetakan/dirujuk `backend/shared/*` & `lib/common/*` | Logis/tervalidasi |
| Kontrak API | implisit/tersebar | `shared/contracts/{api,types}` (sesuai respons aktual) | Fisik (non-runtime) |
| Core/entry/storage | `index.php,yii.php,.htaccess,includes,lib(core),ext,sql,uploads,themes,images` | Tetap; terdokumentasi di peta | Tetap |

## 9. Rencana Kerja Tahap 1 (per-slice, fix-loop)

| Langkah | Aktivitas utama | Output | Gate/Validasi |
|---|---|---|---|
| **F0 Audit & Baseline** | Snapshot; inventaris & klasifikasi; peta dependensi (namespace, routing, `ReactShell`/Vite, aset/`uploads`, kontrak API); catat baseline & error bawaan (React typecheck+build, smoke UI/API/CSRF-session, admin, log) | `docs/refactor/{as-is,to-be,file-map,dependency-paths,do-not-move,risks}.md` | Baseline terekam; nol perubahan perilaku |
| **F1 Konvensi & Kontrak** | `docs/refactor/STRUCTURE.md`; aturan layer/penamaan/batas domain; alias/path; `shared/contracts/` dari respons aktual | Konvensi + kontrak awal | Build/typecheck/smoke = baseline |
| **F2 UI Klien Terpisah** | Reorg per-feature (`features,components/ui,pages,layouts,services,hooks,types`), sentralisasi API client; (opsional atomik) relokasi ke `client/storefront/` + sesuaikan Vite/TS/scripts/`ReactShell`/Apache/env | UI klien fix terpisah & rapi | `typecheck+build` lulus; alur storefront & CSRF/session/API ok; tanpa regresi |
| **F3 UI Admin Terpisah** | Rapikan & tegaskan batas domain `admin/`; isolasi aset/struktur admin; siapkan `admin/frontend/` hanya bila ada modul React nyata | Batas UI admin jelas (tanpa campur klien) | Admin legacy berjalan; tidak ada ketergantungan UI silang |
| **F4 BE Gabungan (aman)** | Bentuk `backend/{client,admin,shared}`; ekstrak logic ke services/validators di namespace kompatibel; petakan route/endpoint; dokumentasikan | BE terorganisasi per domain, core utuh | `php -l` area berubah; endpoint & alur kritis parity baseline; tanpa error autoload/routing/log baru |
| **F5 Validasi & Stabilisasi** | Regresi akhir; dedupe/dead-code hanya jika terbukti aman; perbarui README & peta realisasi | Laporan hasil, dokumen final Tahap 1 | Kriteria penerimaan terpenuhi |

**Strategi fix-loop (per slice):** ubah → deteksi (TS/Vite build, `php -l`/uji endpoint & log, audit 404 aset/import/path lama, diff kontrak) → triase {path/import/namespace, aset/URL, config/build/serve, tipe/logic, bawaan} → perbaiki (a–d) & catat (e) → commit atomik. Jangan campur refaktor dengan fitur/bugfix.

## 10. Deliverables Tahap 1
1. Dokumen refaktor: `as-is`, `to-be`, `file-map`, `dependency-paths`, `do-not-move`, `risks`, `STRUCTURE` (di `docs/refactor/`).
2. `shared/contracts/` (spesifikasi/tipe API aktual) + alias konsumsi yang relevan.
3. **UI Klien** terstruktur & terpisah fix (dan terelokasi ke `client/storefront/` bila opsi atomik dieksekusi).
4. **UI Admin** dengan batas domain jelas (legacy rapi; `admin/frontend/` hanya bila ada modul nyata).
5. Wadah **`backend/{client,admin,shared}`** terisi pemetaan & logic/ekstraksi yang aman (core kompatibel).
6. Baseline & laporan validasi/regresi + daftar error bawaan vs teratasi.
7. README/dokumen struktur diperbarui.

## 11. Kriteria Penerimaan (Gate)
| ID | Kriteria | Wajib |
|---|---|---|
| AC-01 | Peta as-is→to-be, dependensi, dan do-not-move tersedia & disepakati | Ya |
| AC-02 | UI Klien fix terpisah (komponen/pages/features/services/hooks/types) dan tidak bercampur UI Admin | Ya |
| AC-03 | UI Admin domain terisolasi; komponen UI klien tidak ada di area admin | Ya |
| AC-04 | `backend/` mengelompokkan domain admin & client (pemetaan + logic/ekstraksi aman) tanpa memecah core/autoload | Ya |
| AC-05 | `shared/contracts/` mencerminkan kontrak API aktual yang relevan | Ya |
| AC-06 | React `typecheck` & `build` sukses; bundle terlayani benar (Apache same-origin) | Ya |
| AC-07 | Smoke storefront (home, katalog/list/filter/sort/paginate, PDP, cart add/update/remove+estimasi, login/register/akun/riwayat, checkout) parity baseline | Ya |
| AC-08 | Admin legacy dapat diakses & berfungsi (login/operasi dasar relevan) parity baseline | Ya |
| AC-09 | Tidak ada regresi routing/API/CSRF/session, tidak ada 404 aset kritis, log runtime tanpa error baru | Ya |
| AC-10 | DB & data utuh; `uploads`/path referensi & entry/core tetap kompatibel | Ya |
| AC-11 | Tidak ada folder/file kosong buatan; hapus hanya yang terbukti tanpa dependensi | Ya |
| AC-12 | Dokumentasi struktur & cara kerja diperbarui | Ya |

## 12. Risiko & Mitigasi
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Relokasi/ubah path React (Vite, outDir, `ReactShell`, Apache) | Bundle/route rusak, white screen | Lakukan atomik & tervalidasi; pertahankan base/serve same-origin; rollback per-slice |
| Pecah autoload/namespace/bootstrap saat merapikan BE | Fatal/runtime error | **Tidak** relokasi fisik core; BE gabungan sebagai wadah logis/ekstraksi di namespace kompatibel |
| Path aset/`uploads` (kode/template/DB) berubah | Gambar/file hilang/404 | Inventaris referensi; hindari mass-move; compat (alias/rewrite) + verifikasi |
| Konflik dengan Batch 5 (checkout aktif) | Regresi alur bayar | Hindari sentuh area sensitif paralel; koordinasi & uji smoke checkout |
| Error bawaan tercampur error refaktor | Salah diagnosis | Baseline F0 & pencatatan terpisah |
| Duplikasi/hapus prematur | Fitur hilang | Hapus hanya terbukti tanpa dependensi; commit kecil |

## 13. Keputusan & Dependensi (perlu dikunci)
1. **Relokasi Client UI:** eksekusi langsung ke `client/storefront/` (atomik) pada Tahap 1, atau selesaikan reorg in-place dulu lalu relokasi? *(rekomendasi: reorg in-place → relokasi atomik setelah gate hijau)*.
2. **Timing vs Batch 5:** mulai F0–F1–F2 (non-breaking) sekarang, atau tunggu Batch 5 stabil?
3. **Wadah BE:** konfirmasi nama `backend/` (atau `server/`) sebagai folder gabungan domain admin+client untuk logic/pemetaan.
4. **Admin React:** `admin/frontend/` tetap slot (dibuat hanya jika ada modul nyata) — konfirmasi.
5. **Prioritas eksekusi:** F0 → F1 → F2 (UI Klien) → F3 → F4 → F5.

## 14. Definisi Selesai Tahap 1
Tahap 1 selesai ketika: struktur & peta terdokumentasi, **UI Klien dan UI Admin terpisah fix** sesuai target, **BE tergabung terorganisasi** dalam wadah domain tanpa memecah core, seluruh gate/kriteria penerimaan lulus (parity-or-better terhadap baseline), dan dokumen menjadi acuan tahap berikutnya.
