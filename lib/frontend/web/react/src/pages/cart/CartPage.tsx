import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { imageUrl } from '../../lib/api-client'
import { productPath, routeUrl, routes } from '../../lib/routes'
import { formatCurrency } from '../../lib/utils'
import { fetchEstimate, postEstimate } from '../../features/cart/cart-api'
import { removeCartLine, updateCartLine } from '../../features/cart/cart-api'
import type {
  CartPayload,
  EstimatePayload,
} from '../../features/cart/cart-api'
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
 * Estimasi ongkir dihitung di GET/POST /api/cart/estimate yang membungkus
 * OrderManager (alur yang sama dengan widget ShippingEstimator/OrderTotal PHP).
 * Browser hanya menampilkan kuotasi dan total yang dikirim server.
 *
 * Yang BELUM pindah ke sini: kupon dan gift voucher. Keduanya tetap milik
 * ShoppingCartController PHP sampai batch promo dibuka.
 */
export function CartPage() {
  const { payload, loading, setPayload, refresh } = useCart()
  const [busyUprid, setBusyUprid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<EstimatePayload | null>(null)
  const [estimateBusy, setEstimateBusy] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)
  const [countryId, setCountryId] = useState('')
  const [postcode, setPostcode] = useState('')

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

  const isCartEmpty = payload ? payload.meta.is_empty : true

  const reloadEstimate = useCallback(async () => {
    setEstimateBusy(true)
    setEstimateError(null)
    try {
      const next = await fetchEstimate()
      setEstimate(next)
      setCountryId(String(next.estimate?.country_id ?? ''))
      setPostcode(next.estimate?.postcode ?? '')
    } catch (cause) {
      setEstimateError(cause instanceof Error ? cause.message : 'Ongkir tidak bisa dihitung.')
    } finally {
      setEstimateBusy(false)
    }
  }, [])

  // Estimasi ongkir diambil otomatis selama keranjang tidak kosong. Totalnya
  // berubah tiap ada update baris, jadi ikut di-refresh lewat reloadEstimate
  // (lihat run()).
  useEffect(() => {
    if (!isCartEmpty) {
      void reloadEstimate()
    }
  }, [reloadEstimate, isCartEmpty])

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
        // Baris berubah → total estimasi ongkir ikut dihitung ulang.
        void reloadEstimate()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal memperbarui keranjang.')
      } finally {
        setBusyUprid(null)
      }
    },
    [setPayload, reloadEstimate]
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

  const applyGuestEstimate = useCallback(async () => {
    setEstimateBusy(true)
    setEstimateError(null)
    try {
      setEstimate(await postEstimate({ country_id: countryId, post_code: postcode }))
    } catch (cause) {
      setEstimateError(cause instanceof Error ? cause.message : 'Ongkir tidak bisa dihitung.')
    } finally {
      setEstimateBusy(false)
    }
  }, [countryId, postcode])

  const chooseShipping = useCallback(
    async (code: string) => {
      setEstimateBusy(true)
      setEstimateError(null)
      try {
        setEstimate(await postEstimate({ shipping: code }))
      } catch (cause) {
        setEstimateError(cause instanceof Error ? cause.message : 'Ongkir tidak bisa dipilih.')
      } finally {
        setEstimateBusy(false)
      }
    },
    []
  )

  const chooseAddress = useCallback(
    async (addressBookId: number) => {
      setEstimateBusy(true)
      setEstimateError(null)
      try {
        setEstimate(await postEstimate({ sendto: String(addressBookId) }))
      } catch (cause) {
        setEstimateError(cause instanceof Error ? cause.message : 'Alamat tidak bisa dipakai.')
      } finally {
        setEstimateBusy(false)
      }
    },
    []
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

  // Checkout sudah dilayani React untuk toko utama dan kanal (lihat
  // ReactShell::$reactPaths), jadi pakai <Link> supaya navigasinya SPA dan
  // prefix mount kanal tetap benar.
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

          {estimate ? (
            <ul className="cart__totals">
              {estimate.totals.map((total) => (
                <li className="cart__summary-row" key={total.code}>
                  <span>{total.title}</span>
                  <b>{total.text}</b>
                </li>
              ))}
            </ul>
          ) : null}

          <Link className="cart__checkout" to="/checkout">
            Lanjut ke checkout
          </Link>

          <CartEstimate
            estimate={estimate}
            busy={estimateBusy}
            error={estimateError}
            countryId={countryId}
            postcode={postcode}
            onCountryChange={(value) => {
              setCountryId(value)
              if (value !== String(estimate?.estimate?.country_id ?? '')) {
                setEstimateError(null)
              }
            }}
            onPostcodeChange={(value) => {
              setPostcode(value)
              setEstimateError(null)
            }}
            onApplyGuest={applyGuestEstimate}
            onChooseAddress={chooseAddress}
            onChooseShipping={chooseShipping}
          />

          {/*
            Kupon dan gift voucher belum dipindahkan ke React. Keranjang PHP
            tidak bisa jadi jalan keluar untuk toko utama/kanal yang sudah
            dilayani React, jadi catatan ini hanya informsional, bukan link.
          */}
          <p className="cart__php-fallback">
            Kupon dan gift voucher belum tersedia di halaman ini.
          </p>
        </aside>
      </div>
    </div>
  )
}

type CartEstimateProps = {
  estimate: EstimatePayload | null
  busy: boolean
  error: string | null
  countryId: string
  postcode: string
  onCountryChange: (value: string) => void
  onPostcodeChange: (value: string) => void
  onApplyGuest: () => void
  onChooseAddress: (addressBookId: number) => void
  onChooseShipping: (code: string) => void
}

function CartEstimate({
  estimate,
  busy,
  error,
  countryId,
  postcode,
  onCountryChange,
  onPostcodeChange,
  onApplyGuest,
  onChooseAddress,
  onChooseShipping,
}: CartEstimateProps) {
  if (!estimate || estimate.shipping_quotes.length === 0) {
    return <p className="cart__estimate-note">Pelajari opsi ongkir: estimasi belum tersedia.</p>
  }

  return (
    <div className="cart__estimate">
      <h2 className="cart__estimate-title">Estimasi ongkir</h2>

      {error ? (
        <p className="cart__estimate-error" role="alert">
          {error}
        </p>
      ) : null}

      {!estimate.is_logged_customer ? (
        <div className="cart__estimate-form">
          <label>
            <span>Negara tujuan</span>
            <select
              value={countryId}
              disabled={busy}
              onChange={(event) => onCountryChange(event.target.value)}
            >
              <option value="">Pilih negara</option>
              {estimate.countries.map((country) => (
                <option key={country.countries_id} value={country.countries_id}>
                  {country.countries_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Kode pos</span>
            <input
              type="text"
              value={postcode}
              disabled={busy}
              onChange={(event) => onPostcodeChange(event.target.value)}
            />
          </label>
          <button type="button" disabled={busy} onClick={onApplyGuest}>
            {busy ? 'Menghitung...' : 'Hitung ongkir'}
          </button>
        </div>
      ) : null}

      {estimate.is_logged_customer && estimate.addresses.length > 0 ? (
        <div className="cart__estimate-addresses">
          <span className="cart__estimate-label">Alamat pengiriman</span>
          {estimate.addresses.map((address) => (
            <label className="cart__estimate-address" key={address.address_book_id}>
              <input
                type="radio"
                name="estimate-sendto"
                disabled={busy}
                defaultChecked={address.address_book_id === estimate.addresses_selected_value}
                onChange={() => onChooseAddress(address.address_book_id)}
              />
              <span>{address.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {estimate.cart_weight ? (
        <p className="cart__estimate-weight">
          Berat {estimate.cart_weight} {estimate.weight_unit}
        </p>
      ) : null}

      {estimate.shipping_quotes.length > 0 ? (
        <div className="cart__estimate-quotes">
          <span className="cart__estimate-label">Metode pengiriman</span>
          {estimate.shipping_quotes.map((quote) =>
            quote.methods.map((method) => (
              <label className="cart__estimate-method" key={method.code}>
                <input
                  type="radio"
                  name="estimate-shipping"
                  disabled={busy}
                  checked={method.selected}
                  onChange={() => onChooseShipping(method.code)}
                />
                <span>
                  {method.title || quote.module}
                  <b>{method.cost_f}</b>
                </span>
              </label>
            ))
          )}
        </div>
      ) : (
        <p className="cart__estimate-note">Tidak ada metode pengiriman untuk lokasi ini.</p>
      )}
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
