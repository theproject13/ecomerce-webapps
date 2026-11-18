import { Link } from 'react-router-dom'
import {
  CheckCircleIcon,
  ChevronRightIcon,
  GlobeIcon,
  ShieldIcon,
  StorefrontIcon,
  WalletIcon,
} from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { routes } from '../../lib/routes'
import './info.css'

const VALUES = [
  {
    Icon: ShieldIcon,
    title: 'Aman & Terpercaya',
    body: 'Transaksi dilindungi, penjual diverifikasi, dan setiap pesanan bisa dilacak dari satu akun.',
  },
  {
    Icon: WalletIcon,
    title: 'Harga Bersaing',
    body: 'Bandingkan harga dan promo dari banyak toko tanpa berpindah aplikasi.',
  },
  {
    Icon: GlobeIcon,
    title: 'Satu Kanal, Banyak Pilihan',
    body: 'Semua kanal toko dikumpulkan dalam satu keranjang dan satu riwayat pesanan.',
  },
]

export function AboutPage() {
  const { meta, channels, categories } = useStorefront()

  return (
    <div className="tp-info">
      <section className="tp-info__hero">
        <p className="tp-info__eyebrow">Tentang</p>
        <h1>Belanja Lebih Mudah di {meta.store_name}</h1>
        <p className="tp-info__lead">
          {meta.store_name} adalah marketplace yang menghubungkan pembeli dengan penjual lokal dan
          brand ternama. Temukan produk kebutuhan harian sampai peralatan khusus, semuanya dalam
          satu tempat.
        </p>
        <div className="tp-info__actions">
          <Link className="tp-info__btn" to={`/${routes.search}`}>
            Mulai Belanja
            <ChevronRightIcon />
          </Link>
          <Link className="tp-info__btn tp-info__btn--ghost" to={`/${routes.sellerCenter}`}>
            Mulai Berjualan
          </Link>
        </div>
      </section>

      <section className="tp-info__stats" aria-label="Ringkasan toko">
        <div className="tp-info__stat">
          <strong>{channels.length || '-'}</strong>
          <span>Kanal toko</span>
        </div>
        <div className="tp-info__stat">
          <strong>{categories.length || '-'}</strong>
          <span>Kategori produk</span>
        </div>
        <div className="tp-info__stat">
          <strong>{meta.featured_count || '-'}</strong>
          <span>Produk pilihan</span>
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Misi Kami</h2>
        <p>
          Membuat jual beli online di Indonesia lebih mudah, aman, dan terjangkau bagi pembeli
          maupun penjual.
        </p>
        <ul className="tp-info__list">
          <li>
            <CheckCircleIcon />
            <span>Menghubungkan penjual lokal dengan pembeli dari berbagai daerah.</span>
          </li>
          <li>
            <CheckCircleIcon />
            <span>Menjaga transparansi harga, stok, dan status pengiriman.</span>
          </li>
          <li>
            <CheckCircleIcon />
            <span>Menyediakan satu akun untuk semua kanal dan semua pesanan.</span>
          </li>
        </ul>
      </section>

      <section className="tp-info__section">
        <h2>Kenapa Belanja di Sini?</h2>
        <p>Pengalaman belanja yang dirancang sederhana dari pencarian sampai pesanan diterima.</p>
        <div className="tp-info__grid">
          {VALUES.map(({ Icon, title, body }) => (
            <article key={title} className="tp-info__card">
              <span className="tp-info__card-icon">
                <Icon />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      {channels.length > 0 ? (
        <section className="tp-info__section">
          <h2>Kanal yang Tersedia</h2>
          <p>Setiap kanal punya kurasi produknya sendiri, tetapi tetap dalam satu akun.</p>
          <div className="tp-info__channels">
            {channels.map((channel) => (
              <span key={channel.platform_id} className="tp-info__channel">
                {channel.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="tp-info__section">
        <h2>Punya Toko Online?</h2>
        <p>
          Buka cabangnya di {meta.store_name} dan jangkau pembeli baru tanpa biaya layanan
          transaksi.
        </p>
        <div className="tp-info__actions">
          <Link className="tp-info__btn tp-info__btn--solid" to={`/${routes.sellerCenter}`}>
            <StorefrontIcon />
            Buka Toko Gratis
          </Link>
        </div>
      </section>
    </div>
  )
}
