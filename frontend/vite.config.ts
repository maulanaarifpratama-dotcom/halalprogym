import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// defineConfig dari vitest/config, bukan vite: dia memperluas opsi Vite dengan blok `test`
// di bawah, jadi konfignya tetap satu berkas.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Proxy /api upstream dihapus bersama api/ — Supabase dipanggil langsung dari klien,
// jadi tidak ada backend sendiri untuk di-proxy. /img dan /gif tetap: nanti dipakai
// menyajikan aset visual kita sendiri saat dev (lihat CLAUDE.md soal lisensi aset).
const media = process.env.MEDIA_TARGET || 'http://127.0.0.1:8888'

// Optional web analytics (Umami). Injected only when BOTH vars are set at build time,
// so a plain `npm run build` — and every self-hosted install — stays telemetry-free.
// Set for the public instance: VITE_UMAMI_SRC=https://stats.example/script.js VITE_UMAMI_ID=<uuid>
const umamiSrc = process.env.VITE_UMAMI_SRC
const umamiId = process.env.VITE_UMAMI_ID

const umami = {
  name: 'halalprogym-umami',
  transformIndexHtml() {
    if (!umamiSrc || !umamiId) return
    return [{
      tag: 'script',
      attrs: { defer: true, src: umamiSrc, 'data-website-id': umamiId },
      injectTo: 'head'
    }]
  }
}

// The version people are asked for in #install-help and on every bug report. Read from
// package.json so it cannot drift from the release it was built in, and inlined at build
// time so no runtime fetch is involved.
const pkgVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkgVersion) },
  plugins: [react(), tailwindcss(), umami],
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    proxy: {
      '/img': { target: media, changeOrigin: true },
      '/gif': { target: media, changeOrigin: true }
    }
  },
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    // Default vitest 5000ms terlalu ketat untuk suite ini. Beberapa tes memindai seluruh
    // korpus 1.324 latihan lewat exercises-data.js yang 888 KB, dan di bawah beban paralel
    // pt-br-instructions.test.js terukur 5163ms — lolos kalau dijalankan sendiri, gagal di
    // run penuh. Itu flake, dan flake di jaring keselamatan utama migrasi ini jauh lebih
    // mahal daripada tes yang lambat. 15s kira-kira 3x kasus terburuk yang terukur: cukup
    // longgar supaya tidak flake, masih cukup ketat supaya hang yang sungguhan tetap gagal.
    testTimeout: 15000
  }
})
