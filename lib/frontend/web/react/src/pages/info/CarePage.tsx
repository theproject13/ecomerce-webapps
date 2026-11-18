import { Link } from 'react-router-dom'
import {
  BoxIcon,
  CalendarIcon,
  ChevronRightIcon,
  CreditCardIcon,
  HeadsetIcon,
  ReceiptIcon,
  ShieldIcon,
  ShoppingBagIcon,
} from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { routeUrl, routes } from '../../lib/routes'
import './info.css'

const HELP_LINKS: Array<{
  Icon: typeof ReceiptIcon
  label: string
  description: string
  href: string
  external?: boolean
}> = [
  {
    Icon: ReceiptIcon,
    label: 'Status Pesanan',
    description: 'Lacak pesanan dan lihat riwayat transaksi.',
    href: '/orders',
  },
  {
    Icon: ShoppingBagIcon,
    label: 'Keranjang & Checkout',
    description: 'Periksa keranjang sebelum menyelesaikan pesanan.',
    href: `/${routes.cart}`,
  },
  {
    Icon: BoxIcon,
    label: 'Pengiriman',
    description: 'Informasi pemrosesan dan pelacakan paket.',
    href: routeUrl(routes.contact),
    external: true,
  },
  {
    Icon: CreditCardIcon,
    label: 'Pembayaran',
    description: 'Metode pembayaran dan konfirmasi transaksi.',
    href: routeUrl(routes.contact),
    external: true,
  },
]

const FAQ = [
  {
    question: 'Bagaimana cara melacak pesanan saya?',
    answer:
      'Buka halaman Status Pesanan setelah masuk ke akun. Setiap pesanan menampilkan status dan nomor resi jika sudah dikirim.',
  },
  {
    question: 'Metode pembayaran apa saja yang tersedia?',
    answer:
      'Tersedia transfer bank, e-wallet, dan cicilan. Pilihan yang tampil mengikuti metode yang aktif di toko.',
  },
  {
    question: 'Bagaimana cara mengajukan pengembalian?',
    answer:
      'Ajukan pengembalian dari halaman detail pesanan, lalu ikuti instruksi yang muncul. Tim kami akan meninjau pengajuan tersebut.',
  },
  {
    question: 'Apakah saya bisa berjualan di sini?',
    answer:
      'Bisa. Buka halaman Seller Center untuk melihat langkah pendaftaran dan keuntungan berjualan.',
  },
  {
    question: 'Bagaimana cara mengubah data akun?',
    answer:
      'Masuk ke akun, lalu buka menu Profil Saya untuk mengubah data diri, alamat, dan kata sandi.',
  },
]

export function CarePage() {
  const { meta } = useStorefront()

  return (
    <div className="tp-info">
      <section className="tp-info__hero">
        <p className="tp-info__eyebrow">Pusat Bantuan</p>
        <h1>{meta.store_name} Care</h1>
        <p className="tp-info__lead">
          Butuh bantuan soal pesanan, pembayaran, atau pengiriman? Temukan jawabannya di sini atau
          hubungi tim kami.
        </p>
        <div className="tp-info__actions">
          <Link className="tp-info__btn" to="/orders">
            <ReceiptIcon />
            Cek Pesanan
          </Link>
          <a className="tp-info__btn tp-info__btn--ghost" href={routeUrl(routes.contact)}>
            Hubungi Kami
            <ChevronRightIcon />
          </a>
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Bantuan Cepat</h2>
        <p>Pilih topik yang paling sesuai dengan kebutuhanmu.</p>
        <div className="tp-info__links">
          {HELP_LINKS.map(({ Icon, label, description, href, external }) => {
            const content = (
              <>
                <span className="tp-info__link-main">
                  <Icon />
                  <span>
                    {label}
                    <span className="tp-info__link-desc">{description}</span>
                  </span>
                </span>
                <ChevronRightIcon />
              </>
            )

            return external ? (
              <a key={label} className="tp-info__link" href={href}>
                {content}
              </a>
            ) : (
              <Link key={label} className="tp-info__link" to={href}>
                {content}
              </Link>
            )
          })}
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Pertanyaan Umum</h2>
        <p>Jawaban singkat untuk pertanyaan yang paling sering ditanyakan.</p>
        <div className="tp-info__faq">
          {FAQ.map((item) => (
            <details key={item.question} className="tp-info__faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="tp-info__section">
        <h2>Masih Butuh Bantuan?</h2>
        <p>Kirim pertanyaanmu dan tim {meta.store_name} akan membantu menyelesaikannya.</p>
        <div className="tp-info__actions">
          <a className="tp-info__btn tp-info__btn--solid" href={routeUrl(routes.contact)}>
            <HeadsetIcon />
            Hubungi Tim Care
          </a>
          <Link className="tp-info__btn" to={`/${routes.about}`}>
            <ShieldIcon />
            Tentang {meta.store_name}
          </Link>
          <Link className="tp-info__btn" to={`/${routes.sellerCenter}`}>
            <CalendarIcon />
            Panduan Seller
          </Link>
        </div>
      </section>
    </div>
  )
}
