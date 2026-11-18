import { useState, type ComponentType, type FormEvent } from 'react'
import { catalogUrl } from '../../lib/api-client'
import { categoryPath, routeUrl, routes, searchUrl } from '../../lib/routes'
import { useHomeCategories } from '../../features/catalog/useHomeCategories'
import { submitTopup } from '../../features/topup/topup-api'
import {
  BoltIcon,
  ChevronRightIcon,
  CpuIcon,
  GridIcon,
  LaptopIcon,
  PawIcon,
  SmartphoneIcon,
  WalletIcon,
} from '../ui/Icon'

type IconComponent = ComponentType<{ className?: string }>

type GridItem = {
  key: string
  name: string
  Icon: IconComponent
  tone: string
  href: string
}

/**
 * Daftar cadangan kalau /api/home/categories tidak terbaca atau belum diisi.
 *
 * Tujuan utamanya menjaga desain yang sudah disetujui tidak pernah kosong.
 * Sumber sebenarnya adalah kategori di database (flag show_on_home), dikelola
 * lewat Catalog admin.
 */
const FALLBACK_SERVICES = ['Pulsa', 'Paket Data', 'Listrik PLN', 'Roaming', 'Nomor Telepon']

const FALLBACK_CATEGORIES = [
  'Handphone & Tablet',
  'Top-Up & Tagihan',
  'Elektronik',
  'Perawatan Hewan',
  'Keuangan',
  'Komputer & Laptop',
]

/** Nama kategori yang dianggap sebagai induk layanan top-up. */
const TOPUP_KEYWORD = /top.?up|tagihan/i

/**
 * Pemetaan nama kategori ke ikon + warna.
 *
 * Endpoint kategori tidak mengirim ikon, jadi ikon dipilih dari kata kunci
 * nama. Kategori baru apa pun tetap tampil, memakai GridIcon sebagai default,
 * sehingga menambah kategori di admin tidak pernah menyembunyikan item.
 */
function iconFor(name: string): { Icon: IconComponent; tone: string } {
  const value = name.toLowerCase()

  if (/top.?up|tagihan|pulsa|listrik|roaming|telepon|pln/.test(value)) {
    return { Icon: BoltIcon, tone: 'amber' }
  }
  if (/handphone|tablet|mobile|seluler|\bhp\b|phone|smartphone/.test(value)) {
    return { Icon: SmartphoneIcon, tone: 'blue' }
  }
  if (/elektronik|electronic|cpu/.test(value)) {
    return { Icon: CpuIcon, tone: 'violet' }
  }
  if (/hewan|pet|veterin/.test(value)) {
    return { Icon: PawIcon, tone: 'green' }
  }
  if (/keuangan|finan|wallet|bank|banking/.test(value)) {
    return { Icon: WalletIcon, tone: 'blue' }
  }
  if (/komputer|computer|laptop|notebook/.test(value)) {
    return { Icon: LaptopIcon, tone: 'violet' }
  }

  return { Icon: GridIcon, tone: 'green' }
}

/** Grid "Kategori Populer": item statis "Kategori" + kategori top-level dari DB. */
function gridItems(
  categories: Array<{ category_id: number; name: string }>,
): GridItem[] {
  const items: GridItem[] = [
    {
      key: 'all',
      name: 'Kategori',
      Icon: GridIcon,
      tone: 'green',
      href: catalogUrl(routes.search),
    },
  ]

  if (categories.length === 0) {
    for (const name of FALLBACK_CATEGORIES) {
      const { Icon, tone } = iconFor(name)
      items.push({ key: name, name, Icon, tone, href: searchUrl(name) })
    }

    return items
  }

  for (const category of categories) {
    const { Icon, tone } = iconFor(category.name)
    items.push({
      key: String(category.category_id),
      name: category.name,
      Icon,
      tone,
      // Kategori top-level dibuka di halaman landing kategori React, yang
      // menampilkan banner, deskripsi, sub-kategori, dan produknya. Kategori
      // baru yang belum punya produk tetap punya halaman (deskripsi + anak),
      // jadi tidak pernah mendarat di katalog kosong.
      href: catalogUrl(categoryPath(category.category_id)),
    })
  }

  return items
}

export function PopularCategories() {
  const { categories } = useHomeCategories()

  // Daftar layanan diambil dari anak-anak kategori Top Up & Tagihan. Kalau
  // belum ada, pakai daftar cadangan.
  const topupCategory = categories.find((item) => TOPUP_KEYWORD.test(item.name))
  const services =
    topupCategory && topupCategory.children.length > 0
      ? topupCategory.children.map((child) => child.name)
      : FALLBACK_SERVICES

  const [selected, setSelected] = useState('')
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  // selected bisa jadi basi saat daftar services berubah setelah fetch; ini
  // memastikan layanan yang aktif selalu salah satu dari daftar terkini.
  const service = services.includes(selected) ? selected : services[0]

  const items = gridItems(categories)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (status === 'submitting') {
      return
    }

    setStatus('submitting')
    setMessage('')

    try {
      const payload = await submitTopup({
        service,
        phoneNumber: number,
        amount,
      })

      setStatus('success')
      setMessage(
        payload.items
          ? `Permintaan ${payload.items.service} tersimpan (No. ${payload.items.topup_orders_id}).`
          : 'Permintaan top-up tersimpan.',
      )
      setNumber('')
      setAmount('')
    } catch (cause) {
      setStatus('error')
      setMessage((cause as Error)?.message ?? 'Gagal mengirim permintaan.')
    }
  }

  return (
    <section className="tp-section">
      <div className="tp-section__header">
        <h2>Kategori Populer</h2>
        <a href={routeUrl(routes.search)}>
          Lihat Semua
          <ChevronRightIcon />
        </a>
      </div>

      <div className="tp-popcat__topup">
        <div className="tp-popcat__topup-head">
          <span className="tp-popcat__topup-icon" aria-hidden="true">
            <BoltIcon />
          </span>
          <div>
            <p className="tp-popcat__topup-title">Top Up &amp; Tagihan</p>
            <p className="tp-popcat__topup-sub">Pulsa, paket data, listrik, dan lainnya</p>
          </div>
        </div>

        <div className="tp-popcat__services">
          {services.map((item) => (
            <button
              key={item}
              type="button"
              className={`tp-popcat__service${item === service ? ' is-active' : ''}`}
              onClick={() => setSelected(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <form className="tp-popcat__form" onSubmit={handleSubmit}>
          <input
            className="tp-popcat__input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Masukan Nomor"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            required
          />
          <input
            className="tp-popcat__input"
            type="text"
            inputMode="numeric"
            placeholder="Nominal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <button
            type="submit"
            className="tp-popcat__buy"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Memproses...' : 'Beli'}
          </button>
        </form>

        {message ? (
          <p
            className={`tp-popcat__feedback tp-popcat__feedback--${status}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
      </div>

      <div className="tp-popcat__grid">
        {items.map(({ key, name, Icon, tone, href }) => (
          <button
            key={key}
            type="button"
            className="tp-popcat__item"
            onClick={() => window.location.assign(href)}
          >
            <span className={`tp-popcat__icon tp-popcat__icon--${tone}`} aria-hidden="true">
              <Icon />
            </span>
            <span className="tp-popcat__name">{name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
