import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, catalogUrl } from '../../lib/api-client'
import { StateMessage } from '../../components/ui/StateMessage'
import { fetchOrders, type OrderItem } from '../../features/account/account-api'
import '../account/account.css'

type LoadState = 'loading' | 'ready' | 'error' | 'guest'

/**
 * Riwayat pesanan milik user yang sedang login.
 *
 * Data datang dari /api/account/orders yang meniru query
 * AccountController::actionHistory (orders JOIN orders_total JOIN
 * orders_status). Detail pesanan dan reorder tetap halaman tema PHP; tiap
 * baris menautkan ke sana supaya batch ini tidak menduplikasi logika pesanan.
 */
export function OrdersPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    fetchOrders()
      .then((payload) => {
        if (!active) {
          return
        }
        setOrders(payload.items)
        setState('ready')
      })
      .catch((error) => {
        if (!active) {
          return
        }
        if (error instanceof ApiError && error.status === 401) {
          setState('guest')
          return
        }
        setMessage(error instanceof Error ? error.message : 'Riwayat pesanan tidak bisa dimuat.')
        setState('error')
      })

    return () => {
      active = false
    }
  }, [])

  if (state === 'loading') {
    return (
      <div className="container section">
        <div className="surface">
          <p className="account-loading">Memuat pesanan...</p>
        </div>
      </div>
    )
  }

  if (state === 'guest') {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage
            title="Belum masuk"
            description="Masuk dulu untuk melihat riwayat pesanan Anda."
            action={{
              label: 'Masuk',
              onClick: () => window.location.assign(catalogUrl('login')),
            }}
          />
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="container section">
        <div className="surface">
          <StateMessage title="Gagal memuat pesanan" description={message ?? undefined} tone="error" />
        </div>
      </div>
    )
  }

  return (
    <div className="container section">
      <div className="surface account-page">
        <h1 className="account-heading">Pesanan Saya</h1>

        {orders.length === 0 ? (
          <StateMessage
            title="Belum ada pesanan"
            description="Pesanan yang Anda buat akan muncul di sini."
          />
        ) : (
          <div className="account-orders">
            {orders.map((order) => (
              <article className="account-order" key={order.orders_id}>
                <div className="account-order__main">
                  <p className="account-order__id">Pesanan #{order.orders_id}</p>
                  <p className="account-order__sub">
                    {order.date_long} &middot; {order.count} item
                  </p>
                  {order.shipped_to ? (
                    <p className="account-order__sub">
                      {order.type} {order.shipped_to}
                    </p>
                  ) : null}
                </div>

                <div className="account-order__side">
                  {order.status ? <span className="account-order__status">{order.status}</span> : null}
                  <span className="account-order__total">{order.total}</span>
                  <a className="account-order__link" href={order.url}>
                    Lihat detail
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="account-actions">
          <Link className="account-btn" to="/account">
            Kembali ke Akun
          </Link>
        </div>
      </div>
    </div>
  )
}