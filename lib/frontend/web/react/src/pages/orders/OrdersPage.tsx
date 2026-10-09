import { useEffect, useMemo, useState } from 'react'
import { routeUrl, routes, searchUrl } from '../../lib/routes'
import { ApiError, catalogUrl } from '../../lib/api-client'
import { StateMessage } from '../../components/ui/StateMessage'
import { useToast } from '../../components/ui/Toast'
import { fetchOrders, type OrderItem } from '../../features/account/account-api'
import {
  BoxIcon,
  CalendarIcon,
  ChevronDownIcon,
  CreditCardIcon,
  CpuIcon,
  LaptopIcon,
  SearchIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  SparkleIcon,
  TagIcon,
} from '../../components/ui/Icon'
import '../account/account.css'

type LoadState = 'loading' | 'ready' | 'error' | 'guest'

const STATUS_TABS = [
  'Semua',
  'Belum Bayar',
  'Sedang Dikemas',
  'Dikirim',
  'Selesai',
  'Dibatalkan',
  'Pengembalian',
] as const

const STATUS_KEYWORDS: Record<string, string[]> = {
  'Belum Bayar': ['belum', 'menunggu', 'pending', 'unpaid'],
  'Sedang Dikemas': ['kemas', 'proses', 'packing', 'process'],
  Dikirim: ['kirim', 'shipping', 'shipped', 'transit'],
  Selesai: ['selesai', 'complete', 'delivered', 'done'],
  Dibatalkan: ['batal', 'cancel'],
  Pengembalian: ['kembali', 'refund', 'return'],
}

const SUGGESTIONS: Array<{ label: string; keywords: string; Icon: typeof SparkleIcon }> = [
  { label: 'Skincare', keywords: 'skincare', Icon: SparkleIcon },
  { label: 'Handphone', keywords: 'handphone', Icon: SmartphoneIcon },
  { label: 'Sepatu', keywords: 'sepatu', Icon: TagIcon },
  { label: 'Laptop', keywords: 'laptop', Icon: LaptopIcon },
  { label: 'Fashion', keywords: 'fashion', Icon: TagIcon },
  { label: 'Elektronik', keywords: 'elektronik', Icon: CpuIcon },
]

function matchesStatus(status: string, tab: string): boolean {
  if (tab === 'Semua') {
    return true
  }
  const keywords = STATUS_KEYWORDS[tab] ?? []
  const value = status.toLowerCase()
  return keywords.some((keyword) => value.includes(keyword))
}

/**
 * Riwayat pesanan milik user yang sedang login.
 *
 * Data datang dari /api/account/orders yang meniru query
 * AccountController::actionHistory (orders JOIN orders_total JOIN
 * orders_status). Detail pesanan dan reorder tetap halaman tema PHP; tiap
 * baris menautkan ke sana supaya batch ini tidak menduplikasi logika pesanan.
 */
export function OrdersPage() {
  const { showToast } = useToast()
  const [state, setState] = useState<LoadState>('loading')
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<string>('Semua')

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

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (!matchesStatus(order.status || '', activeTab)) {
        return false
      }
      if (!needle) {
        return true
      }
      return (
        String(order.orders_id).includes(needle) ||
        (order.shipped_to ?? '').toLowerCase().includes(needle) ||
        (order.status ?? '').toLowerCase().includes(needle) ||
        (order.type ?? '').toLowerCase().includes(needle)
      )
    })
  }, [orders, activeTab, query])

  if (state === 'loading') {
    return (
      <div className="account-main__view">
        <div className="account-page-header">
          <h1>Daftar Transaksi</h1>
          <p>Pantau status pesanan dan riwayat transaksi kamu</p>
        </div>
        <div className="account-body">
          <p className="account-loading">Memuat pesanan...</p>
        </div>
      </div>
    )
  }

  if (state === 'guest') {
    return (
      <div className="account-main__view">
        <div className="account-page-header">
          <h1>Daftar Transaksi</h1>
          <p>Pantau status pesanan dan riwayat transaksi kamu</p>
        </div>
        <div className="account-body">
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
      <div className="account-main__view">
        <div className="account-page-header">
          <h1>Daftar Transaksi</h1>
          <p>Pantau status pesanan dan riwayat transaksi kamu</p>
        </div>
        <div className="account-body">
          <StateMessage title="Gagal memuat pesanan" description={message ?? undefined} tone="error" />
        </div>
      </div>
    )
  }

  return (
    <div className="account-main__view">
      <div className="account-page-header">
        <h1>Daftar Transaksi</h1>
        <p>Pantau status pesanan dan riwayat transaksi kamu</p>
      </div>

      <div className="account-filter-bar">
        <label className="account-filter-search">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama produk atau toko"
            aria-label="Cari transaksi"
          />
        </label>

        <button type="button" className="account-filter-dropdown" onClick={() => showToast('Filter produk belum tersedia')}>
          <BoxIcon /> Produk <ChevronDownIcon className="account-filter-caret" />
        </button>
        <button type="button" className="account-filter-dropdown" onClick={() => showToast('Filter tanggal belum tersedia')}>
          <CalendarIcon /> Tanggal <ChevronDownIcon className="account-filter-caret" />
        </button>
        <button type="button" className="account-filter-dropdown" onClick={() => showToast('Filter pembayaran belum tersedia')}>
          <CreditCardIcon /> Pembayaran <ChevronDownIcon className="account-filter-caret" />
        </button>
      </div>

      <div className="account-status-tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`account-status-tab${activeTab === tab ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="account-empty">
          <div className="account-empty__illus" aria-hidden="true">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="55" y="30" width="90" height="130" rx="8" fill="white" stroke="#e0e0e0" strokeWidth="1.5" />
              <line x1="72" y1="55" x2="128" y2="55" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" />
              <line x1="72" y1="70" x2="120" y2="70" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" />
              <line x1="72" y1="85" x2="110" y2="85" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" />
              <circle cx="110" cy="118" r="18" fill="#e8f5e9" stroke="#42b549" strokeWidth="1.5" />
              <path d="M103 118 L108 123 L118 113" stroke="#42b549" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="80" cy="48" r="10" fill="#fff3e0" />
              <text x="80" y="52" textAnchor="middle" fill="#f9a825" fontSize="14" fontWeight="800">?</text>
              <circle cx="140" cy="42" r="3" fill="#42b549" opacity="0.4" />
              <circle cx="48" cy="90" r="2.5" fill="#f9a825" opacity="0.4" />
              <circle cx="150" cy="130" r="2" fill="#e91e63" opacity="0.3" />
              <g transform="translate(20, 120) scale(0.6)">
                <path d="M5 7h3l3 16h17l3-12H11" stroke="#42b549" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="15" cy="28" r="2.5" fill="#42b549" opacity="0.6" />
                <circle cx="24" cy="28" r="2.5" fill="#42b549" opacity="0.6" />
              </g>
            </svg>
          </div>

          <h2 className="account-empty__title">Kamu belum pernah bertransaksi</h2>
          <p className="account-empty__subtitle">
            Yuk, mulai belanja sekarang! Jutaan produk menanti kamu dengan harga terbaik dan gratis ongkir.
          </p>
          <button
            type="button"
            className="account-btn-shop"
            onClick={() => window.location.assign(routeUrl(routes.home))}
          >
            <ShoppingBagIcon />
            Mulai Belanja
          </button>

          <div className="account-empty__suggestions">
            <h4>Coba cari produk populer:</h4>
            <div className="account-chips">
              {SUGGESTIONS.map(({ label, keywords, Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="account-chip"
                  onClick={() => window.location.assign(searchUrl(keywords))}
                >
                  <Icon /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="account-body">
          {visibleOrders.length === 0 ? (
            <StateMessage
              title="Tidak ada transaksi"
              description="Tidak ada transaksi yang cocok dengan filter atau pencarian kamu."
            />
          ) : (
            <div className="account-orders">
              {visibleOrders.map((order) => (
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
        </div>
      )}
    </div>
  )
}
