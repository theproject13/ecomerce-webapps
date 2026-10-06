import { useToast } from '../ui/Toast'
import { routeUrl, routes } from '../../lib/routes'

type Props = {
  channelCount: number
  featuredCount: number
}

type PromoCard = {
  title: string
  label: string
  note: string
}

type MiniBanner = {
  label: string
  className: string
}

/**
 * Banner promosi.
 *
 * Database tidak punya tabel promotion, voucher, atau ongkir, jadi tidak ada
 * angka diskon/cashback/gratis ongkir yang bisa ditampilkan. Klaim seperti
 * itu akan jadi data karangan dan menyesatkan pembeli.
 *
 * Yang tampil di sini hanya fakta yang memang ada di toko: jumlah kanal,
 * jumlah produk pilihan, dan katalog lengkap. Kalau nanti ada program promo
 * sungguhan, ganti isi cards dengan data dari API promo.
 */
export function PromoBanner({ channelCount, featuredCount }: Props) {
  const { showToast } = useToast()

  const cards: PromoCard[] = [
    {
      title: `${channelCount} Kanal`,
      label: 'Furniture, Watch, B2B, Print Shop',
      note: 'Satu akun',
    },
    {
      title: `${featuredCount} Produk Pilihan`,
      label: 'Rekomendasi untuk Anda',
      note: 'Stok tersedia',
    },
    {
      title: 'Katalog',
      label: 'Lihat semua produk',
      note: `${channelCount} kanal`,
    },
  ]

  const miniBanners: MiniBanner[] = [
    { label: 'Belanja Furniture', className: 'tp-mini-banner--violet' },
    { label: 'Jam Watch Terlaris', className: 'tp-mini-banner--green' },
    { label: 'Kebutuhan B2B', className: 'tp-mini-banner--orange' },
    { label: 'Cetak & Print', className: 'tp-mini-banner--blue' },
  ]

  return (
    <>
      <div className="tp-promo-banner">
        <div className="tp-promo-banner__title">Semua kebutuhan dalam satu toko</div>
        <div className="tp-promo-banner__sub">
          Empat kanal, satu keranjang dan satu akun
        </div>
        <div className="tp-promo-cards">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              className="tp-promo-card"
              onClick={() => showToast(card.label)}
            >
              <div className="tp-promo-card__title">{card.title}</div>
              <div className="tp-promo-card__label">{card.label}</div>
              <div className="tp-promo-card__note">{card.note}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="tp-banner-row">
        {miniBanners.map((banner) => (
          <a
            key={banner.label}
            className={`tp-mini-banner ${banner.className}`}
            href={routeUrl(routes.featured)}
          >
            {banner.label}
          </a>
        ))}
      </div>
    </>
  )
}