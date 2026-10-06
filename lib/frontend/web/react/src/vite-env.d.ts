/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_API_TARGET?: string
  readonly VITE_CATALOG_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}