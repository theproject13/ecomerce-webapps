import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { StorefrontProvider } from './providers'
import { CartProvider } from '../features/cart/useCart'
import { ToastProvider } from '../components/ui/Toast'
import { routerBasename } from '../lib/app-base'

export function App() {
  return (
    <StorefrontProvider>
      {/* CartProvider di dalam ToastProvider supaya halaman yang menambah item
          bisa menampilkan toast sambil memperbarui badge. */}
      <ToastProvider>
        <CartProvider>
          <BrowserRouter basename={routerBasename}>
            <AppRouter />
          </BrowserRouter>
        </CartProvider>
      </ToastProvider>
    </StorefrontProvider>
  )
}