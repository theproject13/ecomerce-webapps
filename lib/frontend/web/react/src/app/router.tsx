import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { CatalogPage } from '../pages/catalog/CatalogPage'
import { CategoryPage } from '../pages/category/CategoryPage'
import { CartPage } from '../pages/cart/CartPage'
import { CheckoutPage } from '../pages/checkout/CheckoutPage'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/login/LoginPage'
import { ProductDetailPage } from '../pages/product-detail/ProductDetailPage'
import { RegisterPage } from '../pages/register/RegisterPage'
import { AccountLayout } from '../pages/account/AccountLayout'
import { OrdersPage } from '../pages/orders/OrdersPage'
import { AboutPage } from '../pages/info/AboutPage'
import { SellerCenterPage } from '../pages/info/SellerCenterPage'
import { SellerOnboardingPage } from '../pages/info/SellerOnboardingPage'
import { SellerDashboardPage } from '../pages/info/SellerDashboardPage'
import { CarePage } from '../pages/info/CarePage'
import { StateMessage } from '../components/ui/StateMessage'
import { routerBasename } from '../lib/app-base'

function PendingPage({ title }: { title: string }) {
  return (
    <div className="container section">
      <div className="surface">
        <StateMessage
          title={title}
          description="Halaman ini masih tahap pengerjaan. Untuk sementara shoppers diarahkan ke kanal terkait."
        />
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      {/* Halaman toko: memakai header, footer, dan bottom nav. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        {/*
          Katalog. Path-nya sama dengan routes.search/routes.featured di
          lib/routes.ts supaya link homepage ("Lihat semua") tidak perlu diubah.
          Di kanal furniture maupun toko utama keduanya dilayani React
          (ReactShell::$channelSubtrees untuk kanal, $mainReactPaths untuk toko
          utama). /catalog/list-product tetap milik PHP karena tidak ada di
          daftar itu.
        */}
        <Route path="/catalog/all-products" element={<CatalogPage />} />
        <Route
          path="/catalog/featured-products"
          element={<CatalogPage defaultScope="featured" />}
        />
        {/* ID produk lewat query string (?id=), bukan segmen path. Path SEO
            produk tetap dipegang tema PHP, dan ReactShell hanya mencocokkan
            nama path, bukan pola. */}
        <Route path="/product-detail" element={<ProductDetailPage />} />
        {/* Landing kategori. ID lewat query string (?id=<categories_id>),
            bukan segmen path, supaya nama path ini tetap bisa dicocokkan
            sebagai daftar nama di ReactShell::$reactPaths. URL kategori SEO
            (/ecomerce-webapps/<slug>) tetap dilayani tema PHP. */}
        <Route path="/category-detail" element={<CategoryPage />} />
        <Route path="/shopping-cart" element={<CartPage />} />
        <Route path="/search" element={<PendingPage title="Pencarian" />} />
        <Route path="/wishlist" element={<PendingPage title="Wishlist" />} />
        <Route path="/addresses" element={<PendingPage title="Alamat" />} />
        <Route path="/cart" element={<PendingPage title="Keranjang" />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        {/* Halaman statis yang ditautkan dari utility header. Ketiganya juga
            didaftarkan di ReactShell::$reactPaths supaya request langsung
            (bukan hanya navigasi internal) dilayani shell React. */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/seller-center" element={<SellerCenterPage />} />
        <Route path="/seller-center/daftar-toko" element={<SellerOnboardingPage />} />
        <Route path="/seller-center/toko" element={<SellerDashboardPage />} />
        <Route path="/care" element={<CarePage />} />

        {/* Area akun: sidebar profil + konten (desain Daftar Transaksi). */}
        <Route element={<AccountLayout />}>
          <Route path="/account" element={<OrdersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>
        <Route path="/order-detail" element={<PendingPage title="Detail Pesanan" />} />
      </Route>

      {/* Halaman autentikasi: layar penuh, tanpa header dan footer. */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="*" element={<Navigate to={routerBasename} replace />} />
    </Routes>
  )
}