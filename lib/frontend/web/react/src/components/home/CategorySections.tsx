import { catalogUrl } from '../../lib/api-client'
import { initials, truncate } from '../../lib/utils'
import type { Category } from '../../types/api'

type Props = {
  categories: Category[]
}

/**
 * Grid kategori.
 *
 * Endpoint kategori sekarang belum mengirim nama, jadi `name` bisa kosong.
 * Tile hanya dirender kalau nama tersedia; kalau tidak, section dilewati.
 * backend mulai mengirim nama, grid langsung nyambung tanpa ubah layout.
 */
export function CategorySections({ categories }: Props) {
  const named = categories.filter((category) => Boolean(category.name))

  if (named.length === 0) {
    return null
  }

  return (
    <section className="tp-section">
      <div className="tp-section__header">
        <h2>Kategori</h2>
      </div>

      <div className="tp-categories">
        {named.map((category) => (
          <a
            key={category.category_id ?? category.name}
            className="tp-category"
            href={category.url ? catalogUrl(category.url) : '#'}
          >
            <span className="tp-category__media">
              {category.image ? (
                <img src={catalogUrl(category.image)} alt="" loading="lazy" />
              ) : (
                <span aria-hidden="true">{initials(category.name ?? '?')}</span>
              )}
            </span>
            <span className="tp-category__name">{truncate(category.name ?? '', 16)}</span>
            {category.product_count ? (
              <span className="tp-category__count">{category.product_count} produk</span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  )
}