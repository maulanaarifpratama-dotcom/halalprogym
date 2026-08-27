import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
// Tailwind DULU, index.css belakangan: selama migrasi CSS tangan warisan harus
// menang atas utility kalau keduanya menyentuh properti yang sama.
import './styles/tailwind.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// Service worker: yang membuat app ini benar-benar terbuka seketika dan benar-benar jalan tanpa
// sinyal. Tidak di build mobile — shell native sudah menyajikan semuanya dari disk.
//
// Gerbangnya `isSecureContext`, BUKAN `protocol === 'https:'`. Yang kedua ikut menolak
// `http://localhost`, yang sebenarnya secure context — akibatnya service worker tidak pernah
// jalan di `npm run preview`, jadi satu-satunya cara mengujinya adalah men-deploy dulu. Perilaku
// offline yang cuma bisa diuji di produksi adalah perilaku yang tidak diuji.
//
// `import.meta.env.DEV` tetap dikecualikan: cache-first di server dev berarti mengejar perubahan
// yang sudah kamu simpan tapi tidak kamu lihat.
if (!MOBILE && !import.meta.env.DEV && 'serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
