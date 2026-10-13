# Rencana Batch - Pergantian Bahasa Admin (Indonesia / English)

Status: **RANCANA. B1 selesai (fondasi, header, dashboard, menu sidebar). B2+ belum.**
Dibuat: 2026-10-13

Acuan: `docs/README.md`, `docs/architecture.md`, `docs/migrasi-kanal-react.md`.
Dokumen ini adalah acuan kerja untuk menyelesaikan pergantian bahasa (English/UK ↔
Bahasa Indonesia) di seluruh sisi **admin**, dibagi menjadi beberapa **batch**
supaya bisa dikerjakan & diverifikasi bertahap.

> Halaman storefront (entity `main`, `account`, `checkout`, `payment`, `shipping`,
> `ordertotal`, `catalog/product`, `js`, `pos/main`, `keys`, `configuration`) di luar
> lingkup dokumen ini. Ada catatan khusus di §6.4.

---

## 0. Ringkasan Keputusan

| Topik | Keputusan |
| --- | --- |
| Mekanisme | Konstanta `TEXT_*` / `BOX_*` didefinisikan dari tabel `translation` per bahasa via `\common\helpers\Translation::init()` (entity `admin/<controller>`, `admin/<controller>/<action>`, `admin/main`, `main`) |
| Default bahasa | English (`language_id=1`). Bahasa Indonesia = `language_id=2` |
| Currency sink | `languages_formats.LANGUAGE_CURRENCY`: en→GBP, id→IDR (sinkron via `AdminFactory`) — sudah selesai |
| Cara isi | Insert baris `language_id=2` dengan `ON DUPLICATE KEY UPDATE`; `hash = MD5(key.'-'.entity)`; `translated=1` |
| Setelah isi | Wajib flush cache translasi (FileCache `lib/{backend,frontend}/runtime/cache`) |
| Sumber lain | `orders_status` (nama status pesanan) BUKAN dari `translation` → diisi terpisah (B3) |
| Probe/bukti | Buka admin → ubah bahasa ke *Bahasa Indonesia* → cek string target; `Ctrl+Shift+R` |

---

## 1. Mekanisme (Kenapa Awalnya Tidak Berubah)

`Translation::init($entity, $language_id)` (`lib/common/helpers/Translation.php`):

1. Memuat baris `translation_entity = $entity AND language_id = bahasa aktif` → `define()` konstanta.
2. Jika bahasa aktif ≠ default, memuat **juga** baris default (English) untuk key yang **belum** terdefinisi (fallback).

Konsekuensi: selama satu key belum punya baris `language_id=2`, **selalu tampil English**, meskipun
bahasa aktif = Indonesia. Itulah kenapa label menu tidak ikut berubah — belum ada baris Indonesianya.
Locale (entity + jumlah string English, diukur 2026-10-13):

```
entity                            en    id    sisa
admin/main                        2005  155   1850   <- label umum lintas halaman
admin/design                       705    0    705
admin/categories                   381    0    381
admin/orders                       160    0    160
admin/easypopulate                  92    0     92
admin/coupon_admin                  91    0     91
admin/customers                     88    0     88
admin/banner_manager                69    0     69
admin/js                            67    0     67   <- JS global, dibundel client-side
admin/departments                   62    0     62
... (entity admin/* lain) — detail §4
```

---

## 2. Peta Batch

Prioritas = dampak paling terlihat bagi admin per hari, lalu dikerjakan per modul.

| Batch | Area | Entity | Sisa en | Sasaran utama | Status |
| --- | --- | --- | ---: | --- | --- |
| B1 | Fondasi, header, dashboard, menu sidebar | `admin/main` (label menu), `admin/index`, `AdminFactory`/`InitFactory` | 7 | Dashboard, header (search/clock/flag), seluruh menu sidebar, sinkron currency | **SELESAI** |
| B2 | Katalog / Produk & Filter | `admin/categories` (381) + `admin/categories/productedit` (10) + `admin/categories/categoryedit` (4) + `admin/productsattributes` (17) + `admin/options-templates` (10) + `admin/products-groups` (8) + `admin/manufacturers` (6) + `admin/google-categories` (18) + `admin/easypopulate` (92) + `admin/features` (7) | ~553 | Halaman **Products/Categories** + filter (yang masih English), form produk, atribut/opsi, impor/ekspor | BELUM |
| B3 | Pelanggan & Pesanan | `admin/customers` (88) + `admin/customers/customeredit` (2) + `admin/orders` (160) + `admin/orders/order-edit` (20) + `admin/orders/create` (5) + `admin/orders_status` (16) + `admin/orders_status_groups` (9) + `admin/orders-comment-template` (14) + `admin/orders-ga` (15) + `admin/orders_products_status` (6) + `admin/orders_products_status_manual` (9) + `admin/coupon_admin` (91) + `admin/gv_sent` (13) + `admin/gv_queue` (2) + `admin/gv_mail` (5) | ~455 | Daftar & detail Pelanggan, Pesanan (order/view, order/edit), status pesanan (termasuk isi tabel `orders_status` id=bahasa), kupon/gift voucher | BELUM |
| B4 | Pemasaran & Promo | `admin/specials` (7) + `admin/specials/specialedit` (1) + `admin/specials-types` (4) + `admin/featured` (7) + `admin/giveaway` (5) + `admin/sales_statistics` (46) + `admin/socials` (8) + `admin/socials/edit` (6) + `admin/recovery-cart` (1) | ~85 | Sales statistics, Specials, Featured, Give away, Socials | BELUM |
| B5 | SEO & Konten/CMS | `admin/information_manager` (33) + `admin/meta-tags` (32) + `admin/menus` (14) + `admin/faqdesk` (11) + `admin/elements` (9) + `admin/texts` (28, tool terjemahan) + `admin/sitemap` (7) | ~134 | Halaman/konten, meta tags, menu CMS, FAQ, Terjemahan | BELUM |
| B6 | Design & Theme | `admin/design` (705) + `admin/classes` (6) + `admin/samples` (4) + `admin/related-templates` (1) | ~716 | Design editor (designer box, theme editor), Classes | BELUM |
| B7 | Modul & Platform | `admin/modules` (34) + `admin/modules/edit` (3) + `admin/platforms` (63) + `admin/platforms/edit` (16) + `admin/install` (54) + `admin/departments` (62) + `admin/printers` (14) + `extensions/osclink` (62) + `admin/cleaner` (1) | ~309 | Payment/Shipping/OT modules, Sales channels/platforms, Departments, App Shop, Printer cloud | BELUM |
| B8 | Lokasi, Pajak, Mata Uang | `admin/currencies` (41) + `admin/languages` (20) + `admin/countries` (18) + `admin/geo_zones` (20) + `admin/zones` (5) + `admin/tax_rates` (12) + `admin/tax_classes` (6) + `admin/cities` (8) + `admin/postal-codes` (4) + `admin/address-formats` (2) + `admin/ip-restriction` (3) | ~139 | Localization (mata uang, bahasa, negara/zona, pajak), kota, kode pos | BELUM |
| B9 | Konfigurasi, Tools, Security | `admin/groups` (25) + `admin/adminmembers` (22) + `admin/admin_account` (22) + `admin/adminfiles` (6) + `admin/admin-menu/*` (4) + `admin/cache_control` (15) + `admin/server_info` (11) + `admin/backup` (37) + `admin/banner_manager` (69) + `admin/logging` (1) + `admin/logout` (1) + `admin/whos-online` (8) + `extensions/error-log-viewer` (33) + `admin/admin-login-view` (8) + `admin/admin-session-view` (6) + `admin/admin-login-session-view` (7) + `admin/admin-device-view` (10) + `admin/two-step-authorization-interval` (7) | ~292 | Access (Managers, menu, boxes), Config panel, Backup, Banner, Server info, Session/login view | BELUM |
| B10 | Label umum `admin/main` (sisa) | `admin/main` | ~1850 | Tombol & label generik yang muncul di semua halaman (Save, Cancel, Status, Actions, dst.) — **dikerjakan menyerempet tiap batch**, diselesaikan di batch ini | BELUM |

> Urutan teknis: **B1 → B2 → B3 → B4 → B5 → B8 → B7 → B6 → B9 → B10**. B6 (design)
> dan B10 bisa dijalankan paralel/oleh orang kedua karena tidak saling bergantung.
> B3 membutuhkan kerja tambahan di tabel `orders_status` (bukan `translation`).

---

## 3. Status per Batch (Detail)

### B1 — Fondasi, header, dashboard, menu sidebar — SELESAI
- Sinkron bahasa↔currency global (backend `AdminFactory`, frontend `InitFactory`) — `languages_formats.LANGUAGE_CURRENCY`: en→GBP, id→IDR.
- Dashboard (`admin/index`): 20 key utama (Widget label + bulan/hari) dua bahasa.
- Header & kontrol layout: `admin/main` — placeholder search, toggle nav, hari/bulan, current/server time, dst.
- Menu sidebar: 128 konstanta `admin_boxes` + `TEXT_DASHBOARD` di `admin/main` (id).
- CSS: `BACKEND_CSS_VERSION` s/d 42.

### B2 — Katalog / Produk & Filter
- Halaman yang masih English dari pantauan: filter produk (Search by, Brand, Status, Stock,
  Price, Weight, Low stock, Featured, Gift wrap, Virtual, All bundles, Listing/Master/Child/Sale,
  dan tabel "No data available in table").
- Entity: `admin/categories` dan turunannya; `admin/easypopulate` untuk Impor/Ekspor.
- Verifikasi: Buka **Products/Categories** → ubah bahasa → semua filter & toolbar Indonesia;
  lihat juga halaman edit produk.

### B3 — Pelanggan & Pesanan
- Selain `translation`, isi tabel **`orders_status`** untuk `language_id=2` (nama status pesanan),
  karena di widget Recent Orders sudah memakai fallback `coalesce` status per bahasa.
- Verifikasi: order list & order detail, halaman customer, kupon.

### B10 — `admin/main` (label umum)
- Menyerempet dikerjakan: tiap batch menarik key `admin/main` yang dipakai halaman tsb.
- Sisa dirapikan dengan menerjemahkan semua key yang belum punya `language_id=2`.

---

## 4. Konvensi & Pitfall

1. **PK tabel**: `(language_id, translation_key, translation_entity)`. Gunakan
   `INSERT ... ON DUPLICATE KEY UPDATE translation_value=VALUES(...)`.
2. **Hash**: `hash = MD5(CONCAT(translation_key,'-',translation_entity))` wajib diisi untuk baris baru.
3. **Translated**: set `translated=1` pada baris baru id.
4. **Cache**: setelah batch, hapus cache translasi:
   ```powershell
   Get-ChildItem lib\frontend\runtime\cache,lib\backend\runtime\cache -Recurse | Remove-Item -Recurse -Force
   ```
   (TagDependency di `Translation::resetCacheEnity()` juga bisa dipakai.)
5. **Fallback (`Translation` §1)**: jika satu key belum ada baris id → English. Jadi hasil batch
   sementara akan tampil campur English/Indonesia sampai batch-nya tuntas. Itu wajar.
6. **Jangan sentuh** entity storefront (`main`, `account`, `payment`, `shipping`, `ordertotal`,
   `checkout`, `catalog/product`, `pos/main`, `keys`, `configuration`, `js`) tanpa keputusan —
   `main` & `js` juga ikut dimuat backend, jadi garda hati-hati (lihat §6.4).
7. **Nama data bukan terjemahan**: nama platform/kanal penjualan ("osCommerce Test Store",
   "Furniture", …), nama brand, nama produk = data, tidak diterjemahkan via `translation`.
8. **Smarty**: string statis di tpl pakai `{$smarty.const.TEXT_X}` (bukan `{TEXT_X}` —
   akan kosong/undefined variable). Pattern ini wajib saat menyentuh `.tpl`.
9. **Backend layout**: `lib/backend/themes/basic/layouts/main.tpl` — setelah edit `.tpl`,
   hapus `lib/backend/runtime/Smarty/compile/*`.
10. **CSS keys**: `BACKEND_CSS_VERSION` (DB `configuration`) dinaikkan bila ada perubahan css.

---

## 5. Tooling & Template Kerja

Cek sisa per entity:
```sql
SELECT translation_entity,
       SUM(language_id=1) en,
       SUM(language_id=2) id,
       SUM(language_id=1) - SUM(language_id=2) sisa
FROM   translation
WHERE  translation_entity IN (<entity1>, <entity2>, ...)
GROUP  BY translation_entity
ORDER  BY sisa DESC;
```

Contoh insert (satu baris):
```sql
INSERT INTO translation (language_id, translation_key, translation_entity, translation_value, hash, not_used, translated, checked)
VALUES (2, 'KEY_NEW', 'admin/categories', 'Nilai Baru',
        MD5(CONCAT('KEY_NEW','-','admin/categories')), 0, 1, 0)
ON DUPLICATE KEY UPDATE translation_value = VALUES(translation_value), hash = VALUES(hash), translated = VALUES(translated);
```

Skrip batch: tulis file `.sql` ke `C:\Users\iQ06\AppData\Local\Temp\opencode\`, lalu jalankan:
```powershell
Get-Content -Raw "tr_batchN.sql" | & "C:\xampp\mysql\bin\mysql.exe" -u root osc414
```
Lalu flush cache (§4.4) dan buka halaman target dengan bahasa Indonesia.

---

## 6. Catatan & Lingkup Luar

### 6.1 CSRF/sesi
Switch bahasa lewat query param `language` di URL (dropdown flag) normal — tidak ada masalah CSRF
karena sudah diatur Sceleton/session same-origin. Jangan mengubah perilaku ini.

### 6.2 Dokumentasi terkait
- `docs/architecture.md`, `docs/README.md` — aturan & gate proyek.
- `docs/migrasi-kanal-react.md` — gaya tabel batch & smoke test.

### 6.3 Risiko
- Menerjemahkan `admin/main` (B10) paling besar: 1850+ key; jangan dikejar cepat-cepat karena
  terkait label tombol yang dipakai banyak halaman (regresi muncul bila salah set).
- `admin/design` (B6) 705 key; sebagian key adalah label visual dari komponen tema.

### 6.4 Storefront (di luar scope)
Entity storefront tetap English. Catatan: karena backend juga memuat `main` dan `admin/js`,
bila suatu saat storefront diterjemahkan, pastikan tidak mengubah nilai key yang dipakai backend
secara bersamaan (uji halaman admin + storefront setelah batch storefront).

---

## 7. Definition of Done

Per batch:
- [ ] Semua key entity dari tabel §2 untuk batch tsb sudah `language_id=2` (sisa = 0).
- [ ] `hash` & `translated` benar; tidak ada duplikat PK.
- [ ] Cache diterjemahkan ke cache di-flush.
- [ ] Proba manual: bahasa Indonesia → halaman target tampil Indonesia (hard refresh).
- [ ] Proba regresi: bahasa English → tampilan tidak berubah/rusak.
- [ ] (B3) Tabel `orders_status` memiliki baris bahasa Indonesia.

Batch berikutnya yang dikerjakan: **B2 — Katalog / Produk & Filter** (menunggu persetujuan).