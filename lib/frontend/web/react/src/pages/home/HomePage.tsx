import { CategorySections } from '../../components/home/CategorySections'
import { ChannelEntries } from '../../components/home/ChannelEntries'
import { FlashSale } from '../../components/home/FlashSale'
import { HeroSlider } from '../../components/home/HeroSlider'
import { PromoBanner } from '../../components/home/PromoBanner'
import { ProductCard } from '../../components/product/ProductCard'
import { ProductGridSkeleton } from '../../components/ui/Skeleton'
import { StateMessage } from '../../components/ui/StateMessage'
import { BoltIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon } from '../../components/ui/Icon'
import { useStorefront } from '../../app/providers'
import { routeUrl, routes } from '../../lib/routes'
import './home.css'

export function HomePage() {
  const { meta, channels, categories, featured, loading, error, reload } = useStorefront()

  const items = loading ? [] : featured
  const recommended = items.slice(0, 10)
  const flashSale = items.slice(0, 8)

  return (
    <div className="tp-page">
      <HeroSlider />

      {loading ? null : <ChannelEntries channels={channels} />}

      {loading ? null : (
        <PromoBanner channelCount={channels.length} featuredCount={meta.featured_count} />
      )}

      {loading || flashSale.length === 0 ? null : <FlashSale products={flashSale} />}

      {loading ? null : <CategorySections categories={categories} />}

      <section className="tp-section">
        <div className="tp-section__header">
          <h2>Rekomendasi</h2>
          <a href={routeUrl(routes.featured)} className="tp-section__more">
            Lihat semua
            <ChevronRightIcon />
          </a>
        </div>

        <div className="tp-filter-bar">
          <button type="button" className="tp-chip tp-chip--active">
            Semua
          </button>
          <button type="button" className="tp-chip">
            Terlaris
          </button>
          <button type="button" className="tp-chip">
            Termurah
          </button>
          <button type="button" className="tp-chip">
            Terbaru
          </button>
          <span className="tp-filter-bar__spacer" />
          <button type="button" className="tp-chip tp-chip--icon">
            <FilterIcon />
            Filter
          </button>
        </div>

        <div className="tp-rail">
          <button type="button" className="tp-rail__nav" aria-label="Geser kiri">
            <ChevronLeftIcon />
          </button>

          {error ? (
            <div className="tp-rail__body">
              <StateMessage
                tone="error"
                title="Gagal memuat produk"
                description={error}
                action={{ label: 'Coba lagi', onClick: reload }}
              />
            </div>
          ) : null}

          {!error && loading ? (
            <div className="tp-rail__body">
              <ProductGridSkeleton count={10} />
            </div>
          ) : null}

          {!error && !loading && recommended.length === 0 ? (
            <div className="tp-rail__body">
              <StateMessage
                title="Belum ada produk"
                description="Admin belum menandai produk sebagai featured."
              />
            </div>
          ) : null}

          {!error && !loading && recommended.length > 0 ? (
            <>
              <div className="tp-product-grid">
                {recommended.map((product) => (
                  <ProductCard key={product.products_id} product={product} />
                ))}
              </div>
              <div className="tp-rail__body tp-rail__body--empty" aria-hidden="true" />
            </>
          ) : null}

          <button type="button" className="tp-rail__nav" aria-label="Geser kanan">
            <ChevronRightIcon />
          </button>
        </div>

        {!loading && recommended.length > 0 ? (
          <p className="tp-section__foot">
            <BoltIcon />
            {recommended.length} dari {meta.featured_count} produk pilihan
          </p>
        ) : null}
      </section>

      <div className="tp-spacer-bottom" />
    </div>
  )
}