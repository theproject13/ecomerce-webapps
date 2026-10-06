import { useEffect, useMemo, useState } from 'react'
import { imageUrl } from '../../lib/api-client'
import { cn } from '../../lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icon'
import type { ProductImage } from '../../types/api'

type Props = {
  images: ProductImage[]
  /** Nama produk, dipakai sebagai alt gambar utama yang belum punya alt. */
  name: string
}

/**
 * Galeri produk: satu gambar besar dan deretan thumbnail.
 *
 * Kalau cuma ada satu gambar, strip thumbnail disembunyikan karena tidak ada
 * yang bisa dipilih. Navigasi panah memakai tombol, bukan geser, supaya bisa
 * dipakai dengan keyboard dan tetap punya area sentuh yang cukup.
 */
export function ProductGallery({ images, name }: Props) {
  const [activeId, setActiveId] = useState<number | null>(null)

  const activeIndex = useMemo(() => {
    if (images.length === 0) {
      return -1
    }

    const found = images.findIndex((image) => image.id === activeId)
    return found >= 0 ? found : 0
  }, [images, activeId])

  // Reset ke gambar pertama kalau daftar gambarnya berubah, misal karena
  // shopper membuka produk lain tanpa halaman dimuat ulang.
  useEffect(() => {
    setActiveId(null)
  }, [images])

  if (images.length === 0) {
    return (
      <div className="tp-gallery tp-gallery--empty surface">
        <span className="tp-gallery__placeholder" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="3" y="4.5" width="18" height="15" rx="2" />
            <path d="m4.5 16 4.5-4.5 3.5 3.5 3-3 4 4" />
            <circle cx="9" cy="9.5" r="1.3" />
          </svg>
        </span>
        <p className="tp-gallery__placeholder-text">Gambar produk belum tersedia.</p>
      </div>
    )
  }

  const active = images[activeIndex]
  const hasMultiple = images.length > 1

  const move = (delta: number) => {
    setActiveId(images[(activeIndex + delta + images.length) % images.length].id)
  }

  return (
    <div className="tp-gallery">
      <div className="tp-gallery__stage surface">
        <img
          className="tp-gallery__main"
          src={imageUrl(active.url)}
          alt={active.alt || name}
          loading="eager"
          decoding="async"
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              className="tp-gallery__nav tp-gallery__nav--prev"
              onClick={() => move(-1)}
              aria-label="Gambar sebelumnya"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              className="tp-gallery__nav tp-gallery__nav--next"
              onClick={() => move(1)}
              aria-label="Gambar berikutnya"
            >
              <ChevronRightIcon />
            </button>
          </>
        ) : null}

        {hasMultiple ? (
          <span className="tp-gallery__counter" aria-live="polite">
            {activeIndex + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {hasMultiple ? (
        <ul className="tp-gallery__thumbs">
          {images.map((image, index) => {
            const selected = index === activeIndex

            return (
              <li key={image.id || index}>
                <button
                  type="button"
                  className={cn('tp-gallery__thumb', selected && 'is-active')}
                  onClick={() => setActiveId(image.id)}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={`Lihat gambar ${index + 1}`}
                >
                  <img src={imageUrl(image.thumb)} alt="" loading="lazy" decoding="async" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}