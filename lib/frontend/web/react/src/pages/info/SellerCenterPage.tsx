import { Link } from 'react-router-dom'
import {
  CheckCircleIcon,
  ChevronRightIcon,
  HeadsetIcon,
  ReceiptIcon,
  ShieldIcon,
  StorefrontIcon,
  TagIcon,
  WalletIcon,
} from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { routes } from '../../lib/routes'
import './info.css'

const BENEFITS = [
  {
    Icon: StorefrontIcon,
    title: 'Toko Sendiri',
    body: 'Buka toko dengan nama dan alamat sendiri, lalu atur produk sesuai kebutuhan.',
  },
  {
    Icon: TagIcon,
    title: 'Tanpa Biaya Layanan',
    body: 'Mulai berjualan tanpa biaya layanan transaksi dan tanpa biaya pendaftaran.',
  },
  {
    Icon: WalletIcon,
    title: 'Pembayaran Mudah',
    body: 'Terima pembayaran lewat transfer bank, e-wallet, sampai cicilan.',
  },
  {
    Icon: ShieldIcon,
    title: 'Pembeli Terlindungi',
    body: 'Sistem pesanan dan pelacakan yang sama membuat transaksi lebih aman untuk kedua pihak.',
  },
]

const STEPS = [
  {
    title: 'Daftar akun',
    body: 'Buat akun pembeli terlebih dahulu, lalu lanjutkan pendaftaran sebagai penjual.',
  },
  {
    title: 'Lengkapi data toko',
    body: 'Isi nama toko, alamat, dan informasi kontak supaya pembeli mengenali toko kamu.',
  },
  {
    title: 'Unggah produk',
    body: 'Tambahkan produk, foto, harga, dan stok. Toko kamu siap menerima pesanan.',
  },
]

export function SellerCenterPage() {
  const { meta, session } = useStorefront()

  // Shopper yang sudah login langsung masuk ke form data toko. Yang belum
  // login diarahkan ke daftar dulu, lalu dikembalikan ke form yang sama
  // lewat ?next= supaya tidak perlu klik "Buka Toko" dua kali.
  const sellerTarget = session.logged_in
    ? `/${routes.sellerOnboarding}`
    : `/register?next=${encodeURIComponent(routes.sellerOnboarding)}`

  return (
    <div className="tp-info">
      <section className="tp-info__hero">
        <p className="tp-info__eyebrow">Seller Center</p>
        <h1>Mulai Berjualan di {meta.store_name}</h1>
        <p className="tp-info__lead">
          Jual produk apa saja — furniture, watch, kebutuhan B2B, sampai hasil cetak — dan mulai
          dari toko sendiri. Pendaftaran gratis, tanpa biaya layanan transaksi.
        </p>
        <div className="tp-info__actions">
          <Link className="tp-info__btn" to={sellerTarget}>
            Buka Toko Gratis
            <ChevronRightIcon />
          </Link>
          {session.logged_in ? (
            <Link className="tp-info__btn" to={`/${routes.sellerDashboard}`}>
              Kelola Toko Saya
            </Link>
          ) : null}
          <Link className="tp-info__btn tp-info__btn--ghost" to={`/${routes.care}`}>
            Hubungi Kami
          </Link>
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Keuntungan Bergabung</h2>
        <p>Semua yang kamu butuhkan untuk mulai berjualan online ada di satu tempat.</p>
        <div className="tp-info__grid">
          {BENEFITS.map(({ Icon, title, body }) => (
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

      <section className="tp-info__section">
        <h2>Cara Membuka Toko</h2>
        <p>Tiga langkah sederhana sebelum produk pertamamu tayang.</p>
        <div className="tp-info__steps">
          {STEPS.map((step) => (
            <article key={step.title} className="tp-info__step">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Yang Perlu Disiapkan</h2>
        <ul className="tp-info__list">
          <li>
            <CheckCircleIcon />
            <span>Akun dengan email aktif dan nomor telepon yang bisa dihubungi.</span>
          </li>
          <li>
            <CheckCircleIcon />
            <span>Nama toko dan alamat asal pengiriman.</span>
          </li>
          <li>
            <CheckCircleIcon />
            <span>Foto produk yang jelas beserta harga dan stok awal.</span>
          </li>
          <li>
            <CheckCircleIcon />
            <span>Rekening bank untuk mencairkan hasil penjualan.</span>
          </li>
        </ul>
      </section>

      <section className="tp-info__section">
        <h2>Butuh Bantuan?</h2>
        <p>Tim {meta.store_name} Care siap membantu proses pendaftaran dan pengelolaan toko.</p>
        <div className="tp-info__actions">
          <Link className="tp-info__btn tp-info__btn--solid" to={sellerTarget}>
            <StorefrontIcon />
            Daftar Sekarang
          </Link>
          <Link className="tp-info__btn" to={`/${routes.care}`}>
            <HeadsetIcon />
            Pusat Bantuan
          </Link>
          <Link className="tp-info__btn" to="/orders">
            <ReceiptIcon />
            Status Pesanan
          </Link>
        </div>
      </section>
    </div>
  )
}
