// Banner branding. File SVG dibuat sendiri, tanpa gambar foto, supaya bebas
// hak cipta dan tetap tajam di semua ukuran layar.
import { assetUrl } from './asset-url'
import { routes } from '../../lib/routes'

export type Banner = {
  src: string
  alt: string
  title: string
  subtitle: string
  cta: string
  href: string
  /**
   * 'channel' = tujuan berada di luar mount kanal saat ini, jadi URL-nya harus
   * relatif ke installBase. 'store' = halaman toko biasa, relatif ke
   * catalogBase supaya shopper tetap di kanal yang sedang dibuka.
   *
   * Tanpa pemisahan ini, banner kanal di /furniture menghasilkan
   * /osc414/furniture/furniture, dan banner "Semua Kanal" justru melempar
   * shopper keluar ke toko utama.
   */
  scope: 'channel' | 'store'
}

const RAW: Array<Omit<Banner, 'src'> & { file: string }> = [
  {
    file: 'img/banner-furniture.svg',
    alt: 'Kanal Furniture',
    title: 'Furniture',
    subtitle: 'Kamar, ruang tamu, dan meja kerja',
    cta: 'Lihat Furniture',
    href: routes.furniture,
    scope: 'channel',
  },
  {
    file: 'img/banner-watch.svg',
    alt: 'Kanal Watch',
    title: 'Watch',
    subtitle: 'Jam tangan original dan aksesori',
    cta: 'Lihat Watch',
    href: routes.watch,
    scope: 'channel',
  },
  {
    file: 'img/banner-b2b.svg',
    alt: 'Kanal b2b supermarket',
    title: 'B2B Supermarket',
    subtitle: 'Kebutuhan harian dalam jumlah grosir',
    cta: 'Lihat B2B',
    href: routes.b2b,
    scope: 'channel',
  },
  {
    file: 'img/banner-printshop.svg',
    alt: 'Kanal Print Shop',
    title: 'Print Shop',
    subtitle: 'Cetak banner, kaos, dan souvenir',
    cta: 'Lihat Print Shop',
    href: routes.printshop,
    scope: 'channel',
  },
  {
    file: 'img/banner-all.svg',
    alt: 'Semua kanal dalam satu toko',
    title: 'Semua Kanal',
    subtitle: 'Satu akun, satu keranjang',
    cta: 'Belanja Sekarang',
    href: routes.search,
    scope: 'store',
  },
]

export const BANNERS: Banner[] = RAW.map(({ file, ...rest }) => ({
  ...rest,
  src: assetUrl(file),
}))