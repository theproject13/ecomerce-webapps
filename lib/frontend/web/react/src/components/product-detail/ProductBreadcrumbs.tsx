import { Fragment } from 'react'
import { catalogUrl } from '../../lib/api-client'
import { ChevronRightIcon, HomeIcon } from '../ui/Icon'
import type { ProductCategoryRef } from '../../types/api'

type Props = {
  trail: ProductCategoryRef[]
  productName: string
}

/**
 * Breadcrumb.
 *
 * URL kategori sudah dikirim backend sebagai path relatif terhadap base
 * install, jadi cukup dilewatkan ke catalogUrl(). Kategori tanpa URL
 * (mis. produk yang belum punya parent yang terlihat) tetap ditampilkan
 * sebagai teks supaya jalurnya tidak terlihat terputus di tengah.
 *
 * Elemen terakhir adalah nama produk dan sengaja bukan link: halaman ini
 * sudah halaman produk itu.
 */
export function ProductBreadcrumbs({ trail, productName }: Props) {
  return (
    <nav className="tp-breadcrumb" aria-label="Remah roti">
      <ol className="tp-breadcrumb__list">
        <li className="tp-breadcrumb__item">
          <a className="tp-breadcrumb__link" href={catalogUrl('')} aria-label="Beranda">
            <HomeIcon className="tp-breadcrumb__home" />
          </a>
        </li>

        {trail.map((item, index) => {
          const isLastCrumb = index === trail.length - 1

          return (
            <Fragment key={`${item.category_id}-${item.name}`}>
              <li className="tp-breadcrumb__sep" aria-hidden="true">
                <ChevronRightIcon />
              </li>
              <li className="tp-breadcrumb__item">
                {item.url && !isLastCrumb ? (
                  <a className="tp-breadcrumb__link" href={catalogUrl(item.url)}>
                    {item.name}
                  </a>
                ) : (
                  <span className="tp-breadcrumb__text">{item.name}</span>
                )}
              </li>
            </Fragment>
          )
        })}

        <li className="tp-breadcrumb__sep" aria-hidden="true">
          <ChevronRightIcon />
        </li>
        <li className="tp-breadcrumb__item">
          <span className="tp-breadcrumb__text tp-breadcrumb__text--current" aria-current="page">
            {productName}
          </span>
        </li>
      </ol>
    </nav>
  )
}