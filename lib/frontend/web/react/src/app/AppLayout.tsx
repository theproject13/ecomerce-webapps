import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/layout/BottomNav'
import { StoreFooter } from '../components/layout/StoreFooter'
import { StoreHeader } from '../components/layout/StoreHeader'
import { useStorefront } from './providers'
import { useCart } from '../features/cart/useCart'
import '../components/layout/layout.css'

/**
 * Kerangka halaman toko: header sticky, konten, footer, dan bottom nav.
 *
 * Halaman autentikasi (Daftar, Masuk) sengaja tidak memakai kerangka ini,
 * karena tampilannya layar penuh tanpa header dan footer.
 */
export function AppLayout() {
  const { meta, channels, featured, session } = useStorefront()
  // Badge keranjang dibaca dari satu provider supaya header dan bottom nav
  // tidak punya hitungan sendiri yang bisa berbeda.
  const { count } = useCart()

  return (
    <>
      <StoreHeader
        storeName={meta.store_name}
        cartCount={count}
        channels={channels}
        session={session}
      />

      <main>
        <Outlet />
      </main>

      <StoreFooter storeName={meta.store_name} channels={channels} featured={featured} />

      <BottomNav cartCount={count} />
    </>
  )
}