import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import { assetUrl } from './features/catalog/asset-url'
import './styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemen #root tidak ditemukan pada index.html.')
}

/**
 * Favicon dipasang lewat JS, bukan tag <link> di index.html.
 *
 * Alasannya: base path produksi adalah /osc414/react-assets/, sedangkan di dev
 * adalah /. Path absolut seperti /favicon.svg akan salah di salah satu mode.
 * assetUrl() mengikuti BASE_URL, jadi dua-duanya benar.
 */
const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/svg+xml'
favicon.href = assetUrl('favicon.svg')
document.head.appendChild(favicon)

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)