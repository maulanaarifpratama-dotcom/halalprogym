/* Halal Pro Gym — service worker.
 *
 * SATU ATURAN YANG MENENTUKAN SETIAP KEPUTUSAN DI BERKAS INI: app tidak boleh menunggu jaringan.
 *
 * Versi sebelumnya (warisan openGym) network-first untuk semuanya, dan itu salah untuk app ini.
 * Bukan karena offline — offline justru ditangani, karena fetch yang gagal langsung jatuh ke
 * cache. Yang salah adalah kasus yang JAUH lebih sering di gym: sinyal ADA tapi buruk. `fetch()`
 * tidak punya timeout, jadi satu request yang menggantung berarti layar yang menggantung, dan
 * orang menatap layar putih sambil memegang barbell.
 *
 * Jadi: cache dulu, jaringan belakangan.
 *
 * TIGA STRATEGI, dan masing-masing dipilih dari sifat sumbernya:
 *
 *   ASET BER-HASH (assets/index-AbC123.js)   cache-first, tanpa revalidasi.
 *       Nama berkasnya sudah memuat hash isinya, jadi isi yang sama tidak pernah berubah nama
 *       dan nama yang sama tidak pernah berubah isi. Memeriksa ulang ke jaringan itu request
 *       yang jawabannya sudah pasti.
 *
 *   HTML / NAVIGASI                          stale-while-revalidate.
 *       Disajikan dari cache SEKETIKA, lalu diperbarui di latar. Konsekuensinya jujur: sekali
 *       buka setelah deploy masih versi lama, dan buka berikutnya sudah baru. Itu pertukaran
 *       yang benar untuk app yang janji utamanya "terbuka seketika".
 *
 *   FOTO DEMO DARI CDN                       cache-first, lintas-origin.
 *       Ini yang paling penting, dan versi sebelumnya MELEWATKANNYA SAMA SEKALI — dia menolak
 *       semua request lintas-origin, sementara seluruh foto gerakan datang dari jsDelivr. Jadi
 *       di basement tanpa sinyal, app ini menampilkan nol foto gerakan. Untuk app latihan itu
 *       bukan kekurangan kecil; itu kegagalan fitur intinya.
 *       URL-nya memuat commit yang di-pin, jadi isinya juga tidak pernah berubah.
 */
const VERSION = 'v2'
const SHELL = 'hpg-shell-' + VERSION
const MEDIA = 'hpg-media-' + VERSION

/** Host CDN foto demo. Dijaga sempit — bukan "semua lintas-origin". */
const MEDIA_HOSTS = ['cdn.jsdelivr.net']

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

/* Notifikasi LOKAL saja — alarm timer istirahat memakai registration.showNotification.
   Handler `push` dicabut bersama web push: aturan #2 melarang rest timer memakai server push,
   dan tidak ada server yang mengirimnya. */
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(clients => {
    const c = clients.find(x => 'focus' in x)
    return c ? c.focus() : self.clients.openWindow('./')
  }))
})

/**
 * Perintah dari halaman. Dipakai untuk MENYIAPKAN foto sesi sebelum orang berangkat ke gym —
 * lihat lib/prefetch.js. Sengaja dibatasi ke host media: sebuah pesan tidak boleh bisa menyuruh
 * service worker mengambil sembarang URL.
 */
self.addEventListener('message', e => {
  const data = e.data || {}
  if (data.type !== 'prefetch-media' || !Array.isArray(data.urls)) return
  e.waitUntil(caches.open(MEDIA).then(cache => Promise.all(
    data.urls.slice(0, 200).filter(isMediaUrl).map(u =>
      cache.match(u).then(hit => (hit ? null : fetchAndPut(cache, u).catch(() => null)))
    )
  )))
})

function isMediaUrl(u) {
  try { return MEDIA_HOSTS.includes(new URL(u).host) } catch (err) { return false }
}

/**
 * Mengambil lalu menyimpan. Lintas-origin diminta dengan mode `cors`, BUKAN membiarkan request
 * `no-cors` asli lewat: response opaque tetap bisa disajikan ke <img>, tapi dia menghabiskan
 * kuota penyimpanan dengan padding yang besar (browser menyembunyikan ukuran aslinya), dan
 * ratusan foto akan menabrak kuota jauh sebelum ukurannya masuk akal. jsDelivr mengirim
 * `Access-Control-Allow-Origin: *`, jadi cors berhasil dan yang tersimpan response sungguhan.
 */
function fetchAndPut(cache, url) {
  return fetch(url, { mode: 'cors', credentials: 'omit' }).then(res => {
    if (res && res.ok) cache.put(url, res.clone())
    return res
  })
}

const isHashedAsset = url =>
  url.origin === location.origin && /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname)

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // Foto demo dari CDN. Cache-first: URL-nya memuat commit yang di-pin, jadi tidak ada yang
  // perlu direvalidasi.
  if (MEDIA_HOSTS.includes(url.host)) {
    e.respondWith(caches.open(MEDIA).then(cache =>
      cache.match(e.request).then(hit =>
        hit || fetchAndPut(cache, e.request.url).catch(() => fetch(e.request))
      )
    ))
    return
  }

  if (url.origin !== location.origin) return

  // Aset ber-hash: isi dan nama terikat, jadi cache adalah jawaban akhir.
  if (isHashedAsset(url)) {
    e.respondWith(caches.open(SHELL).then(cache =>
      cache.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone())
          return res
        })
      )
    ))
    return
  }

  // Sisanya (HTML, manifest, ikon): sajikan cache seketika, perbarui di latar.
  e.respondWith(caches.open(SHELL).then(cache =>
    cache.match(e.request).then(hit => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok) cache.put(e.request, res.clone())
        return res
      })
      // Kalau ada di cache, jaringan TIDAK ditunggu — kegagalannya pun tidak boleh menolak
      // promise ini, karena tidak ada yang menangkapnya.
      if (hit) { fresh.catch(() => {}); return hit }
      // Belum pernah di-cache: jaringan satu-satunya jalan, dengan index.html sebagai
      // penyelamat untuk navigasi (hash routing, jadi semua rute berbagi satu dokumen).
      return fresh.catch(() =>
        cache.match('index.html').then(idx => idx || caches.match('index.html'))
      )
    })
  ))
})
