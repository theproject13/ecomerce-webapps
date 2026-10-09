import { useState, type ComponentType, type FormEvent } from 'react'
import { routeUrl, routes, searchUrl } from '../../lib/routes'
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

type CategoryItem = {
  name: string
  Icon: ComponentType<{ className?: string }>
  tone: string
}

const SERVICES = ['Pulsa', 'Paket Data', 'Listrik PLN', 'Roaming', 'Nomor Telepon']

const CATEGORIES: CategoryItem[] = [
  { name: 'Kategori', Icon: GridIcon, tone: 'green' },
  { name: 'Handphone & Tablet', Icon: SmartphoneIcon, tone: 'blue' },
  { name: 'Top-Up & Tagihan', Icon: BoltIcon, tone: 'amber' },
  { name: 'Elektronik', Icon: CpuIcon, tone: 'violet' },
  { name: 'Perawatan Hewan', Icon: PawIcon, tone: 'green' },
  { name: 'Keuangan', Icon: WalletIcon, tone: 'blue' },
  { name: 'Komputer & Laptop', Icon: LaptopIcon, tone: 'violet' },
]

export function PopularCategories() {
  const [service, setService] = useState(SERVICES[0])
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  function openCategory(name: string) {
    window.location.assign(searchUrl(name))
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
          {SERVICES.map((item) => (
            <button
              key={item}
              type="button"
              className={`tp-popcat__service${item === service ? ' is-active' : ''}`}
              onClick={() => setService(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <form className="tp-popcat__form" onSubmit={handleSubmit}>
          <input
            className="tp-popcat__input"
            type="text"
            inputMode="numeric"
            placeholder="Masukan Nomor"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
          <input
            className="tp-popcat__input"
            type="text"
            inputMode="numeric"
            placeholder="Nominal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <button type="submit" className="tp-popcat__buy">
            Beli
          </button>
        </form>
      </div>

      <div className="tp-popcat__grid">
        {CATEGORIES.map(({ name, Icon, tone }) => (
          <button
            key={name}
            type="button"
            className="tp-popcat__item"
            onClick={() => openCategory(name)}
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
