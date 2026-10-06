import { useEffect, useState } from 'react'
import type { FeaturedProduct } from '../../types/api'
import { ProductCard } from '../product/ProductCard'

type Props = {
  products: FeaturedProduct[]
}

/** Hitung mundur memakai Waktu lokal browser, bukan server. */
function useCountdown(totalSeconds: number) {
  const [seconds, setSeconds] = useState(totalSeconds)

  useEffect(() => {
    setSeconds(totalSeconds)

    const timer = window.setInterval(() => {
      setSeconds((value) => (value <= 0 ? totalSeconds : value - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [totalSeconds])

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(secs).padStart(2, '0'),
  }
}

/**
 * Flash sale.
 *
 * Database tidak punya tabel promotion/diskon, jadi nama "Flash Sale" di sini
 * HANYA gaya visual. Yang ditampilkan tetap produk featured dengan harga
 * aslinya. Yang SENGAJA tidak ada: harga coret, persen diskon, dan badge
 * "diskon" karena angka itu tidak ada di API, jadi akan mengarang data.
 *
 * Hitung mundur juga dekoratif: durasi tetap, bukan batas waktu promo nyata.
 * Kalau promo asli nanti dibuat, sumber waktu harus API/server, bukan angka
 * yang ditulis di frontend.
 */
export function FlashSale({ products }: Props) {
  const { hours, minutes, seconds } = useCountdown(8 * 3600 + 42 * 60 + 15)

  if (products.length === 0) {
    return null
  }

  return (
    <section className="tp-section">
      <div className="tp-flash-header">
        <h2>Flash Sale</h2>
        <div className="tp-flash-timer" aria-hidden="true">
          <span className="tp-flash-timer__block">{hours}</span>
          <span className="tp-flash-timer__sep">:</span>
          <span className="tp-flash-timer__block">{minutes}</span>
          <span className="tp-flash-timer__sep">:</span>
          <span className="tp-flash-timer__block">{seconds}</span>
        </div>
      </div>

      <div className="tp-product-scroll">
        {products.map((product) => (
          // ProductCard sudah membungkus dirinya dengan <a>, jadi tidak ada
          // <a> pembungkus di sini. Dua <a> bersarang tidak valid di HTML.
          <ProductCard key={product.products_id} product={product} variant="scroll" />
        ))}
      </div>
    </section>
  )
}