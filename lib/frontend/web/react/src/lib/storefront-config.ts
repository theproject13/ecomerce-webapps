export type StorefrontConfig = {
  platformId: number
  platformName: string
  catalogBase: string
  apiBase: string
  installBase: string
  storeName: string
}

const FALLBACK: StorefrontConfig = {
  platformId: 1,
  platformName: '',
  catalogBase: '/',
  apiBase: '/api',
  installBase: '/',
  storeName: 'osStore',
}

declare global {
  interface Window {
    __OSC_STOREFRONT__?: Partial<StorefrontConfig>
  }
}

/**
 * Nilai ini datang dari ReactShell.php lewat tag <script> di index.html.
 * Kalau tag-nya hilang (mis. shell dibuka langsung dari file), pakai default
 * supaya halaman tetap render dengan path toko utama.
 */
export function storefrontConfig(): StorefrontConfig {
  const injected = typeof window === 'undefined' ? null : window.__OSC_STOREFRONT__
  if (!injected) {
    return FALLBACK
  }

  const apiBase = normalize(injected.apiBase, FALLBACK.apiBase)
  const catalogBase = normalize(injected.catalogBase, FALLBACK.catalogBase)
  const installBase = normalize(injected.installBase, FALLBACK.installBase)

  return {
    platformId: Number(injected.platformId ?? FALLBACK.platformId),
    platformName: String(injected.platformName ?? FALLBACK.platformName),
    catalogBase,
    apiBase,
    installBase,
    storeName: String(injected.storeName ?? FALLBACK.storeName),
  }
}

/** Buang slash di ekor supaya penggabungan path tidak menghasilkan `//`. */
function normalize(value: string | undefined, fallback: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback
  }

  const trimmed = value.trim().replace(/\/+$/, '')

  return trimmed === '' ? '/' : trimmed
}
