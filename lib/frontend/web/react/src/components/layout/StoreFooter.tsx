import { useState } from 'react'
import {
  EyeIcon,
  FacebookIcon,
  FilterIcon,
  InstagramIcon,
  PinterestIcon,
  QrIcon,
  ScaleIcon,
  ShieldIcon,
  StorefrontIcon,
  StoreLogo,
  TwitterIcon,
} from '../ui/Icon'
import { routeUrl, routes, searchUrl } from '../../lib/routes'
import type { Channel, Product } from '../../types/api'
import { truncate } from '../../lib/utils'
import './footer.css'

type Props = {
  storeName: string
  channels: Channel[]
  featured: Product[]
}

type LinkGroup = {
  title: string
  links: string[]
}

/**
 * Group link footer. Link di dalam grup ini belum diarahkan ke route PHP
 * karena belum ada halaman yang cocok; semuanya diarahkan ke katalog sampai
 * route-nya tersedia.
 */
const HELP_GROUPS: LinkGroup[] = [
  {
    title: 'Promo',
    links: ['Flash Sale', 'Promo Pengguna Baru', 'Kejar Diskon', 'Bangga Buatan Indonesia'],
  },
  {
    title: 'Catalog',
    links: ['Semua Produk', 'Produk Pilihan', 'Stok Tersedia', 'Harga Terbaru'],
  },
  {
    title: 'Beli',
    links: ['Tagihan & Top Up', 'Bebas Ongkir', 'COD', 'Cek Ongkir'],
  },
  {
    title: 'Jual',
    links: ['Buka Toko Online', 'Pusat Edukasi Seller', 'Daftar Kanal', 'Bantuan'],
  },
]

const ABOUT_GROUPS: LinkGroup[] = [
  {
    title: 'Toko',
    links: [
      'Tentang Kami',
      'Kebijakan Privasi',
      'Syarat & Ketentuan',
      'Keamanan & Privasi',
      'Pengiriman',
      'Pengembalian',
    ],
  },
  {
    title: 'Bantuan',
    links: ['Pusat Bantuan', 'Hubungi Kami', 'Status Pesanan', 'Cek Ongkir', 'Buka Tiket'],
  },
  {
    title: 'Seller',
    links: ['Pusat Edukasi Seller', 'Panduan Seller', 'Biaya Layanan', 'Daftar Outlet'],
  },
]

const SOCIALS = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Pinterest', Icon: PinterestIcon },
]

const TRUST = [
  {
    Icon: EyeIcon,
    title: 'Transparan',
    body: 'Harga dan detail produk tampil apa adanya sebelum kamu checkout.',
  },
  {
    Icon: ScaleIcon,
    title: 'Aman',
    body: 'Bandingkan review dan reputasi toko sebelum membeli dari seller mana pun.',
  },
  {
    Icon: ShieldIcon,
    title: 'Satu Keranjang',
    body: 'Belanja dari banyak kanal tetap dalam satu keranjang dan satu akun.',
  },
]

export function StoreFooter({ storeName, channels, featured }: Props) {
  const [keyword, setKeyword] = useState('')

  const popularKeywords = Array.from(
    new Set([
      ...channels.map((channel) => channel.name),
      ...featured.map((product) => truncate(product.name, 24)),
    ])
  ).slice(0, 80)

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = keyword.trim()

    if (!value) {
      return
    }

    window.location.href = searchUrl(value)
  }

  return (
    <footer className="tp-footer">
      {/* ---------- cari semua ---------- */}
      <section className="tp-footer__search">
        <form className="tp-footer__search-form" role="search" onSubmit={submitSearch}>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={`Cari Semua di ${storeName}!`}
            aria-label={`Cari semua produk di ${storeName}`}
          />
          <button type="submit" aria-label="Cari">
            <FilterIcon />
          </button>
        </form>
      </section>

      {/* ---------- link columns ---------- */}
      <section className="tp-footer__links">
        {[...HELP_GROUPS, ...ABOUT_GROUPS].map((group) => (
          <div key={group.title} className="tp-footer__group">
            <h3>{group.title}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link}>
                  <a href={routeUrl(routes.search)}>{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ---------- seller CTA ---------- */}
      <section className="tp-footer__seller">
        <div className="tp-footer__seller-copy">
          <h2>Punya Toko Online? Buka cabangnya di {storeName}</h2>
          <p>
            Mudah, nyaman dan bebas biaya layanan transaksi. Jual produk apa saja — furniture,
            watch, kebutuhan B2B, sampai hasil cetak — dan mulai dari toko sendiri.
          </p>
          <div className="tp-footer__seller-actions">
            <a className="tp-footer__cta" href={routeUrl(routes.register)}>
              Buka Toko GRATIS
            </a>
            <a className="tp-footer__cta tp-footer__cta--ghost" href={routeUrl(routes.register)}>
              Pelajari lebih lanjut
            </a>
          </div>
        </div>
        <div className="tp-footer__seller-art" aria-hidden="true">
          <StorefrontIcon />
          <StoreLogo />
        </div>
      </section>

      {/* ---------- deskripsi panjang ---------- */}
      <section className="tp-footer__prose">
        <article>
          <h2>Nikmati Mudahnya Jualan Online di {storeName}</h2>
          <p>
            {storeName} adalah situs jual beli online yang perkembangannya terhitung cepat dan
            punya tujuan memudahkan setiap masyarakat di Indonesia untuk melakukan transaksi jual
            beli secara online. Selain kamu dapat menikmati proses pembelian produk lebih mudah dan
            efisien, kamu sebagai seller juga dapat melakukan jualan online di sini. Kamu bisa
            bergabung dengan komunitas seller untuk memulai bisnis, atau memperluas bisnis yang
            sedang kamu jalankan.
          </p>
          <p>
            Proses pendaftaran menjadi seller juga mudah: cukup masukkan data diri, nama toko, dan
            alamat toko. Setelah itu kamu langsung terdaftar dan bisa mulai mengunggah produk.
          </p>
        </article>

        <article>
          <h2>Marketplace untuk Segala Kebutuhan</h2>
          <p>
            {storeName} adalah marketplace yang menawarkan berbagai macam produk sehingga menjadi
            pilihan belanja bagi banyak masyarakat. Kehadirannya membuat pengalaman belanja lebih
            mudah, aman, dan efisien. Tersedia berbagai metode pembayaran, mulai dari transfer
            bank, e-wallet, hingga cicilan, supaya belanja bisa dilakukan senyaman mungkin.
          </p>
          <p>
            Sistem belanja juga terintegrasi dengan jasa ekspedisi. Kerja sama ini memungkinkan
            pengguna untuk terus melacak status pengiriman produk yang mereka beli, dari produk
            fashion, aksesori, jam, perangkat elektronik, sampai kebutuhan harian.
          </p>
        </article>

        <article>
          <h2>Belanja Produk Original di Official Store</h2>
          <p>
            {storeName} menyediakan produk berkualitas dengan garansi resmi. Kamu dapat
            berbelanja produk kebutuhan pokok, elektronik, fashion, hingga peralatan dengan
            mudah hanya menggunakan aplikasi serta koneksi internet.
          </p>
          <p>
            Official Store menyediakan Aneka produk dengan kualitas original serta garansi resmi,
            mulai dari fashion, elektronik, hingga kebutuhan rumah tangga, sehingga pembeli tidak
            perlu takut membeli barang yang tidak original.
          </p>
        </article>

        <article>
          <h2>Kerja Sama dengan Penjual Lokal dan Brand Ternama</h2>
          <p>
            Banyak penjual dari berbagai daerah bergabung di sini. Selain pemilik usaha pribadi,
            brand besar juga membuka official store masing-masing. Membeli produk resmi langsung
            dari official store menjamin keaslian produk dan menawarkan harga terbaik.
          </p>
        </article>

        <article>
          <h2>Temukan Layanan Menarik Lainnya</h2>
          <p>
            Keamanan transaksi jadi prioritas. {storeName} menyediakan berbagai layanan pendukung
            untuk memudahkan transaksi, mulai dari pengecekan ongkir, pelacakan paket, riwayat
            pesanan, hingga pengelolaan akun seller.
          </p>
          <p>
            Semua layanan bisa diakses dari satu akun yang sama, jadi pembeli bisa memantau
            pesanan dari beberapa kanal sekaligus tanpa berpindah aplikasi.
          </p>
        </article>
      </section>

      {/* ---------- top pencarian ---------- */}
      {popularKeywords.length > 0 ? (
        <section className="tp-footer__searches">
          <h2>Top Pencarian Populer di {storeName}!</h2>
          <p className="tp-footer__tagline">
            Temukan produk dari ribuan toko online terpercaya, dan baca review-nya di sini
          </p>
          <ul>
            {popularKeywords.map((word) => (
              <li key={word}>
                <a href={searchUrl(word)}>{word}</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------- trust ---------- */}
      <section className="tp-footer__trust">
        {TRUST.map(({ Icon, title, body }) => (
          <div key={title} className="tp-footer__trust-item">
            <Icon />
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ---------- sosial ---------- */}
      <section className="tp-footer__social">
        <h2>Ikuti Kami</h2>
        <div>
          {SOCIALS.map(({ label, Icon }) => (
            <a key={label} href={routeUrl(routes.home)} aria-label={label}>
              <Icon />
            </a>
          ))}
        </div>
      </section>

      {/* ---------- promo app ---------- */}
      <section className="tp-footer__app">
        <div className="tp-footer__app-copy">
          <h2>Nikmati keuntungan spesial di aplikasi:</h2>
          <ul>
            <li>Promo khusus aplikasi</li>
            <li>Bebas Ongkir tiap hari</li>
            <li>Akses kanal tanpa batas</li>
          </ul>
          <p>Pelajari Selengkapnya</p>
        </div>
        <div className="tp-footer__qr" aria-hidden="true">
          <QrIcon />
          <span>Buka aplikasi dengan scan QR</span>
        </div>
      </section>

      <div className="tp-footer__copy">
        © {new Date().getFullYear()}, {storeName}. All Rights Reserved.
      </div>
    </footer>
  )
}