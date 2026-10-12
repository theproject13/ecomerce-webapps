import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const deployBase = env.VITE_BASE_PATH || '/ecomerce-webapps/react-assets/'
  const devProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost'

  return {
    plugins: [react()],
    base: mode === 'production' ? deployBase : '/',
    // Aset statis (favicon, banner) ditaruh di `static/`, bukan `public/`.
    // `public/` adalah outDir build dan kosongkan tiap build, jadi file yang
    // diletakkan di sana akan terhapus.
    publicDir: 'static',
    build: {
      outDir: 'public',
      emptyOutDir: true,
      assetsDir: 'assets',
      sourcemap: false,
      target: 'es2019',
    },
    server: {
      port: 5173,
      strictPort: true,
      // Di mode development, React dilayani Vite di port 5173 sementara API,
      // halaman PHP, dan aset gambar tetap dilayani Apache di port 80.
      //
      // Vite meneruskan path request apa adanya tanpa memotong prefix, jadi
      // target HARUS origin polos tanpa path. Kalau target berisi /ecomerce-webapps
      // maka /ecomerce-webapps/api/x diteruskan menjadi /ecomerce-webapps/ecomerce-webapps/api/x dan 404.
      //
      // Negatif lookahead (?!$) sengaja dipakai agar /ecomerce-webapps/ tanpa nama file
      // tetap dilayani React (index.html dev) dan bukan dialihkan ke PHP.
      proxy: {
        '^/ecomerce-webapps/(?!$)': {
          target: devProxyTarget,
          changeOrigin: false,
          ws: false,
        },
      },
    },
  }
})