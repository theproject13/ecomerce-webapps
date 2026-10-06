import type { ProductSpecification } from '../../types/api'

type Props = {
  specifications: ProductSpecification[]
}

/**
 * Tabel spesifikasi dari properties_to_products.
 *
 * Satu properti bisa punya beberapa nilai, jadi nilainya dirender sebagai
 * daftar terpisah dengan koma. Baris dengan nilai kosong sudah dibuang di
 * layer normalisasi, jadi di sini tidak perlu memfilter lagi.
 */
export function ProductSpecTable({ specifications }: Props) {
  if (specifications.length === 0) {
    return null
  }

  return (
    <div className="tp-specs surface">
      <h2 className="tp-specs__title">Spesifikasi</h2>
      <dl className="tp-specs__list">
        {specifications.map((spec) => (
          <div className="tp-specs__row" key={spec.name}>
            <dt className="tp-specs__key">{spec.name}</dt>
            <dd className="tp-specs__val">{spec.values.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}