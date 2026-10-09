import { useCallback, useEffect, useRef, useState } from 'react'
import { BANNERS } from '../../features/catalog/banners'
import { channelRouteUrl, routeUrl } from '../../lib/routes'
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icon'
import './hero.css'

const AUTOPLAY_MS = 5000

/**
 * Banner slide otomatis, muncul tepat di bawah header.
 *
 * Catatan perilaku:
 * - Auto-slide berjalan tiap 5 detik dan berhenti saat kursor di atas banner
 *   atau saat fokus masuk ke banner, supaya orang yang lagi baca atau pakai
 *   keyboard tidak kehilangan slide.
 * - Slide diubah hanya lewat transform, bukan height, supaya tidak bikin
 *   layout di bawahnya bergeser.
 */
export function HeroSlider() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)

  const count = BANNERS.length
  const go = useCallback((step: number) => {
    setIndex((current) => (current + step + count) % count)
  }, [count])

  useEffect(() => {
    if (paused || count < 2) {
      return
    }

    const timer = window.setInterval(() => go(1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [go, paused, count])

  if (count === 0) {
    return null
  }

  return (
    <section
      className="tp-hero"
      aria-roledescription="carousel"
      aria-label="Promo toko"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchX.current
        const end = event.changedTouches[0]?.clientX
        touchX.current = null

        if (start === null || end === undefined) {
          return
        }

        const delta = end - start
        if (Math.abs(delta) > 40) {
          go(delta < 0 ? 1 : -1)
        }
      }}
    >
      <div className="tp-hero__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {BANNERS.map((banner, slideIndex) => (
          <a
            key={banner.src}
            className="tp-hero__slide"
            href={
            banner.scope === 'channel' ? channelRouteUrl(banner.href) : routeUrl(banner.href)
          }
            aria-hidden={slideIndex !== index}
            tabIndex={slideIndex === index ? 0 : -1}
          >
            <img src={banner.src} alt={banner.alt} loading={slideIndex === 0 ? 'eager' : 'lazy'} />
            <div className="tp-hero__caption">
              <h2>{banner.title}</h2>
              <p>{banner.subtitle}</p>
              <span className="tp-hero__cta">{banner.cta}</span>
            </div>
          </a>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button type="button" className="tp-hero__nav tp-hero__nav--prev" onClick={() => go(-1)}>
            <ChevronLeftIcon />
            <span className="visually-hidden">Banner sebelumnya</span>
          </button>
          <button type="button" className="tp-hero__nav tp-hero__nav--next" onClick={() => go(1)}>
            <ChevronRightIcon />
            <span className="visually-hidden">Banner berikutnya</span>
          </button>

          <div className="tp-hero__dots">
            {BANNERS.map((banner, dotIndex) => (
              <button
                key={banner.src}
                type="button"
                className={`tp-hero__dot${dotIndex === index ? ' tp-hero__dot--active' : ''}`}
                onClick={() => setIndex(dotIndex)}
              >
                <span className="visually-hidden">{banner.title}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}