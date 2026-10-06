import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../../lib/api-client'
import { productPath, routeUrl, routes } from '../../lib/routes'
import { formatCurrency } from '../../lib/utils'
import { removeCartLine, updateCartLine } from '../../features/cart/cart-api'
import type { CartPayload } from '../../features/cart/cart-api'
import { useCart } from '../../features/cart/useCart'
import { StateMessage } from '../../components/ui/StateMessage'
import { Skeleton } from '../../components/ui/Skeleton'
import './cart.css'

/** Batas yang sama dengan CartController::MAX_QTY. */
const MAX_QTY = 99

/**
 * Halaman keranjang React.
 *
 * Data diambil dari GET /api/cart/index, jadi yang tampil adalah session PHP
 * yang sama dengan tema. Harga per baris dikirim server apa adanya; subtotal
 * dijumlahkan dari `final_price` baris itu di sini karena itu hanya menjumlah
 * angka yang sudah dihitung server, bukan menghitung harga baru.
 *
 * Yang BELUM pindah ke sini: kupon, gift voucher, estimasi ongkir, dan modul
 * order total. Semuanya milik ShoppingCartController PHP. Karena itu halaman
 * ini menyediakan link ke keranjang PHP untuk fitur yang belum ada di React.
 */
export function CartPage() {
  const { payload, loading, setPayload, refresh } = useCart()
  const [busyUprid, setBusyUprid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Provider sudah mengambil keranjang saat mount, jadi payload biasanya sudah
  // ada untuk shopper yang datang dari tombol "Tambah ke keranjang". Fetch
  // ulang hanya kalau belum ada, supaya tidak ada dua request untuk data yang
  // sama.
  useEffect(() => {
    if (!payload) {
      refresh()
    }
  }, [payload, refresh])

  const items = payload?.items ?? []

  const subtotal = useMemo(
    () => items.reduce((sum, line) => sum + line.final_price * line.qty, 0),
    [items]
  )

  const run = useCallback(
    async (uprid: string, task: () => Promise<CartPayload>) => {
      setBusyUprid(uprid)
      setError(null)

      try {
        const next = await task()
        // Respons endpoint sudah berisi seluruh isi keranjang yang baru, jadi
        // tidak perlu fetch lagi: badge ikut terupdate dari payload ini.
        setPayload(next)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal memperbarui keranjang.')
      } finally {
        setBusyUprid(null)
      }
    },
    [setPayload]
  )

  /**
   * Kirim qty baru hanya kalau angkanya benar-benar berubah.
   *
   * Nilai mentah dari input kadang tidak valid ("", "e", "0"), jadi dijepit
   * dulu ke 1..MAX_QTY. Kalau hasil jepitnya sama dengan qty yang sedang
   * tersimpan, request tidak dikirim: blur karena klik ke tempat lain tidak
   * boleh mengubah isi keranjang.
   */
  const commit = useCallback(
    (uprid: string, raw: string, currentQty: number) => {
      const next = Math.min(MAX_QTY, Math.max(1, Math.trunc(Number(raw) || 1)))
      if (next === currentQty || busyUprid !== null) {
        return
      }
      void run(uprid, () => updateCartLine(uprid, next))
    },
    [busyUprid, run]
  )

  if (!payload && loading) {
    return <CartSkeleton />
  }

  if (!payload) {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            tone="error"
            title="Keranjang tidak bisa dimuat"
            description={error ?? 'Terjadi kesalahan saat mengambil isi keranjang.'}
            action={{ label: 'Muat ulang', onClick: refresh }}
          />
        </div>
      </div>
    )
  }

  if (payload.meta.is_empty) {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            title="Keranjangmu masih kosong"
            description="Cari produk dulu, lalu tekan Tambah ke keranjang di halaman detail."
            action={{ label: 'Lihat katalog', onClick: () => window.location.assign(routeUrl(routes.search)) }}
          />
        </div>
      </div>
    )
  }

  // Checkout masih dilayani PHP, jadi pakai <a> biasa: <Link> hanya boleh
  // untuk path yang terdaftar di router React, kalau tidak React Router akan
  // mencoba menebak route dan shopper mendarat di halaman kosong.
  const checkoutUrl = payload.redirect.checkout

  return (
    <div className="container section">
      <h1 className="cart__title">Keranjang</h1>

      {error ? (
        <p className="cart__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="cart__layout">
        <ul className="cart__lines">
          {items.map((line) => (
            <li className="cart-line" key={line.uprid}>
              <Link className="cart-line__media" to={productPath(line.products_id)}>
                {line.image ? (
                  <img src={imageUrl(line.image)} alt={line.name} loading="lazy" />
                ) : null}
              </Link>

              <div className="cart-line__body">
                <Link className="cart-line__name" to={productPath(line.products_id)}>
                  {line.name}
                </Link>
                <p className="cart-line__price">{formatCurrency(line.final_price)}</p>

                <div className="cart-line__controls">
                  <label className="cart-line__qty">
                    <span>Qty</span>
                    <input
                      // Input tidak dikontrol state, jadi key ikut qty dari
                      // server. Tanpa itu, kalau stok membatasi qty lebih kecil
                      // dari yang diketik, angka di kotak tidak pernah kembali
                      // ke nilai sebenarnya.
                      key={`${line.uprid}-${line.qty}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QTY}
                      step={1}
                      defaultValue={line.qty}
                      disabled={busyUprid === line.uprid}
                      onKeyDown={(event) => {
                        // Enter committing, karena blur saja tidak pernah terjadi
                        // untuk shopper yang pakai keyboard atau tombol "+" di
                        // keypad Android.
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          commit(line.uprid, event.currentTarget.value, line.qty)
                        }
                      }}
                      onBlur={(event) => commit(line.uprid, event.target.value, line.qty)}
                    />
                  </label>

                  <button
                    type="button"
                    className="cart-line__remove"
                    disabled={busyUprid === line.uprid}
                    onClick={() => void run(line.uprid, () => removeCartLine(line.uprid))}
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <p className="cart-line__total">{formatCurrency(line.final_price * line.qty)}</p>
            </li>
          ))}
        </ul>

        <aside className="cart__summary">
          <p className="cart__summary-row">
            <span>Subtotal</span>
            <b>{formatCurrency(subtotal)}</b>
          </p>
          <p className="cart__summary-note">
            Ongkir dan pajak dihitung di halaman checkout, jadi angkanya belum termasuk di sini.
          </p>

          <a className="cart__checkout" href={checkoutUrl}>
            Lanjut ke checkout
          </a>

          {/*
            Kupon, gift voucher, dan estimasi ongkir belum dipindahkan ke
            React. Karena /furniture/shopping-cart sekarang dilayani React,
            keranjang PHP untuk kanal ini tidak bisa lagi jadi jalan keluar,
            jadi catatan ini hanya informsional, bukan link.
          */}
          <p className="cart__php-fallback">
            Kupon dan estimasi ongkir belum tersedia di halaman ini.
          </p>
        </aside>
      </div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="container section">
      <Skeleton className="cart__title-skeleton" style={{ width: '160px', height: 26 }} />
      <Skeleton className="cart__row-skeleton" style={{ height: 84 }} />
      <Skeleton className="cart__row-skeleton" style={{ height: 84 }} />
      <p className="visually-hidden" role="status">
        Memuat keranjang
      </p>
    </div>
  )
}
