import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, catalogUrl } from '../../lib/api-client'
import { StateMessage } from '../../components/ui/StateMessage'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  fetchCheckoutSummary,
  placeOrder,
  selectCheckout,
} from '../../features/checkout/checkout-api'
import type {
  CheckoutPayload,
  CheckoutSelection,
  CheckoutState,
} from '../../features/checkout/checkout-api'
import './checkout.css'

type Done = {
  orderId: number
  successUrl: string
}

/**
 * Checkout React (Batch 5).
 *
 * Semua angka (ongkir, pajak, total) dan aturan checkout tetap diputuskan
 * server lewat /api/checkout/*. Halaman ini hanya menampilkan state yang
 * dikirim balik dan mengirim pilihan pelanggan: alamat dari address book,
 * metode kirim, dan metode bayar offline.
 *
 * Modul pembayaran online tidak diproses di sini. Saat place mengembalikan 409,
 * pelanggan dialihkan ke checkout PHP (redirect.php_checkout) yang meneruskan
 * ke gateway.
 */
export function CheckoutPage() {
  const [payload, setPayload] = useState<CheckoutPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [guest, setGuest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [billingSame, setBillingSame] = useState(true)

  useEffect(() => {
    let active = true

    fetchCheckoutSummary()
      .then((next) => {
        if (!active) {
          return
        }
        setPayload(next)
        if (!next.ok) {
          setError(next.error ?? 'Checkout tidak bisa dimulai.')
        }
      })
      .catch((cause) => {
        if (!active) {
          return
        }
        if (cause instanceof ApiError && cause.status === 401) {
          setGuest(true)
          return
        }
        setError(cause instanceof Error ? cause.message : 'Checkout tidak bisa dimuat.')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const apply = useCallback(async (selection: CheckoutSelection) => {
    setBusy(true)
    setMessage(null)
    try {
      const next = await selectCheckout(selection)
      if (next.state) {
        setPayload(next)
      }
      if (!next.ok && next.error) {
        setMessage(next.error)
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Pilihan tidak bisa disimpan.')
    } finally {
      setBusy(false)
    }
  }, [])

  async function handlePlace(state: CheckoutState) {
    setPlacing(true)
    setMessage(null)

    try {
      const { status, payload: result } = await placeOrder({
        sendto: state.sendto || undefined,
        billto: billingSame ? undefined : state.billto || undefined,
        shipping: state.shipping.selected ?? undefined,
        payment: state.payment.selected ?? undefined,
      })

      if (result.ok && result.redirect.success) {
        setDone({ orderId: result.order_id ?? 0, successUrl: result.redirect.success })
        return
      }

      // Modul online: checkout React tidak memproses gateway, jadi alihkan ke
      // halaman PHP yang sama dengan tema.
      if (status === 409) {
        window.location.assign(result.redirect.php_checkout)
        return
      }

      setMessage(result.error ?? 'Pesanan gagal dibuat. Silakan coba lagi.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Pesanan gagal dibuat.')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return <CheckoutSkeleton />
  }

  if (guest) {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            title="Masuk dulu untuk checkout"
            description="Checkout memakai alamat dari buku alamat akun Anda."
            action={{ label: 'Masuk', onClick: () => window.location.assign(catalogUrl('login')) }}
          />
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="container section">
        <div className="surface checkout-done">
          <h1 className="checkout__title">Pesanan diterima</h1>
          <p className="checkout__done-text">
            Pesanan #{done.orderId} sudah dibuat. Terima kasih!
          </p>
          <a className="checkout__primary" href={done.successUrl}>
            Lihat detail pesanan
          </a>
        </div>
      </div>
    )
  }

  if (error || !payload?.state) {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            title="Checkout tidak bisa dimulai"
            description={error ?? 'Keranjang mungkin kosong atau sesi berakhir.'}
            tone="error"
            action={{ label: 'Ke keranjang', onClick: () => window.location.assign(catalogUrl('shopping-cart')) }}
          />
        </div>
      </div>
    )
  }

  const state = payload.state
  const shippingReady = !state.shipping.required || state.shipping.selected !== null
  const paymentReady = state.payment.methods.length === 0 || state.payment.selected !== null
  const canPlace = shippingReady && paymentReady && !placing && !busy

  return (
    <div className="container section">
      <div className="checkout">
        <div className="checkout__head">
          <h1 className="checkout__title">Checkout</h1>
          <Link className="checkout__back" to="/shopping-cart">
            Kembali ke keranjang
          </Link>
        </div>

        {message ? (
          <p className="checkout__error" role="alert">
            {message}
          </p>
        ) : null}

        <section className="checkout__block">
          <h2 className="checkout__heading">Alamat pengiriman</h2>
          {state.addresses.length === 0 ? (
            <p className="checkout__hint">
              Belum ada alamat di buku alamat. Tambahkan dulu di halaman akun.
            </p>
          ) : (
            <ul className="checkout__options">
              {state.addresses.map((address) => (
                <li className="checkout__option" key={address.address_book_id}>
                  <label>
                    <input
                      type="radio"
                      name="sendto"
                      checked={state.sendto === address.address_book_id}
                      disabled={busy}
                      onChange={() => void apply({ sendto: address.address_book_id })}
                    />
                    <span>{address.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <label className="checkout__check">
            <input
              type="checkbox"
              checked={billingSame}
              disabled={busy}
              onChange={(event) => setBillingSame(event.target.checked)}
            />
            <span>Alamat penagihan sama dengan pengiriman</span>
          </label>

          {!billingSame && state.addresses.length > 0 ? (
            <ul className="checkout__options">
              {state.addresses.map((address) => (
                <li className="checkout__option" key={`bill-${address.address_book_id}`}>
                  <label>
                    <input
                      type="radio"
                      name="billto"
                      checked={state.billto === address.address_book_id}
                      disabled={busy}
                      onChange={() => void apply({ billto: address.address_book_id })}
                    />
                    <span>{address.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {state.shipping.required ? (
          <section className="checkout__block">
            <h2 className="checkout__heading">Metode pengiriman</h2>
            <ul className="checkout__options">
              {state.shipping.quotes.map((quote) =>
                quote.methods.map((method) => (
                  <li className="checkout__option" key={method.code}>
                    <label>
                      <input
                        type="radio"
                        name="shipping"
                        checked={state.shipping.selected === method.code}
                        disabled={busy}
                        onChange={() => void apply({ shipping: method.code })}
                      />
                      <span>{method.title || quote.title}</span>
                      <b>{method.cost_f}</b>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        {state.payment.methods.length > 0 ? (
          <section className="checkout__block">
            <h2 className="checkout__heading">Metode pembayaran</h2>
            <ul className="checkout__options">
              {state.payment.methods.map((method) => (
                <li className="checkout__option" key={method.code}>
                  <label className={method.online ? 'checkout__option--disabled' : undefined}>
                    <input
                      type="radio"
                      name="payment"
                      checked={state.payment.selected === method.code}
                      disabled={busy || method.online}
                      onChange={() => void apply({ payment: method.code })}
                    />
                    <span>{method.title}</span>
                    {method.online ? (
                      <em className="checkout__badge">bayar online</em>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
            {state.payment.methods.some((method) => method.online) ? (
              <p className="checkout__hint">
                Metode berlabel "bayar online" diteruskan ke halaman checkout lama saat
                pesanan dibuat.
              </p>
            ) : null}
          </section>
        ) : null}

        <aside className="checkout__summary">
          <ul className="checkout__totals">
            {state.totals.map((total) => (
              <li className="checkout__summary-row" key={total.code}>
                <span>{total.title}</span>
                <b>{total.text}</b>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="checkout__primary"
            disabled={!canPlace}
            onClick={() => void handlePlace(state)}
          >
            {placing ? 'Memproses...' : 'Buat pesanan'}
          </button>

          {!shippingReady ? (
            <p className="checkout__hint">Pilih metode pengiriman dulu.</p>
          ) : null}
          {!paymentReady ? <p className="checkout__hint">Pilih metode pembayaran dulu.</p> : null}
        </aside>
      </div>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="container section">
      <div className="checkout">
        <Skeleton className="checkout__skeleton-title" />
        <Skeleton className="checkout__skeleton-block" />
        <Skeleton className="checkout__skeleton-block" />
      </div>
    </div>
  )
}