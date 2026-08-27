import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Service worker — diuji dengan MENJALANKAN berkas aslinya.
 *
 * `public/sw.js` sengaja berdiri sendiri: dia harus ada di URL yang tetap (`/sw.js`), tidak
 * boleh ikut di-hash bundler, dan tidak boleh punya impor. Jadi dia tidak bisa diimpor seperti
 * modul biasa.
 *
 * Menyalin logikanya ke sini untuk diuji akan menghasilkan tes yang hijau di atas salinan,
 * bukan di atas yang dikirim — persis kesalahan yang sudah pernah terjadi di repo ini (tes yang
 * memaku teks sumber lalu hijau di atas simbol yang tidak ada). Jadi berkasnya dibaca,
 * dijalankan di dalam `self` palsu, dan handler yang dia daftarkan itu yang dipanggil.
 *
 * KENAPA INI LAYAK DITES SAMA SEKALI: berkas ini yang menentukan apakah janji "jalan di
 * basement gym" benar atau cuma tertulis. Kegagalannya tidak terlihat di meja — dia terlihat
 * saat seseorang sudah di gym tanpa sinyal.
 */
const SRC = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8')

/** Response palsu yang cukup mirip untuk yang dibaca sw.js. */
const res = (body, ok = true) => ({ ok, body, clone: () => res(body, ok) })

function loadSW({ fetchImpl, cacheSeed = {} } = {}) {
  const listeners = {}
  const stores = new Map()
  const puts = []

  const openCache = name => {
    if (!stores.has(name)) stores.set(name, new Map(Object.entries(cacheSeed[name] || {})))
    const store = stores.get(name)
    return Promise.resolve({
      match: req => Promise.resolve(store.get(typeof req === 'string' ? req : req.url) || undefined),
      put: (req, r) => {
        const key = typeof req === 'string' ? req : req.url
        puts.push({ name, key })
        store.set(key, r)
        return Promise.resolve()
      },
    })
  }

  const deleted = []
  const self_ = {
    addEventListener: (type, fn) => { listeners[type] = fn },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(() => Promise.resolve()), matchAll: vi.fn(() => Promise.resolve([])), openWindow: vi.fn() },
    registration: { showNotification: vi.fn() },
  }
  const caches_ = {
    open: openCache,
    keys: () => Promise.resolve([...stores.keys(), 'hpg-shell-v1', 'opengym-rt-v1']),
    delete: k => { deleted.push(k); return Promise.resolve(true) },
    match: k => openCache('hpg-shell-v2').then(c => c.match(k)),
  }

  const location_ = { origin: 'https://gym.example.com' }
  const fetch_ = fetchImpl || vi.fn(() => Promise.resolve(res('network')))

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'location', 'fetch', 'URL', SRC)(self_, caches_, location_, fetch_, URL)
  return { listeners, stores, puts, deleted, fetch: fetch_, self: self_ }
}

/** Menjalankan handler fetch dan mengembalikan apa yang dijawabkan ke browser. */
async function handleFetch(sw, url, init = {}) {
  let responded = null
  const event = {
    request: { url, method: init.method || 'GET' },
    respondWith: p => { responded = p },
    waitUntil: () => {},
  }
  sw.listeners.fetch(event)
  return responded === null ? null : await responded
}

const SHELL = 'hpg-shell-v2'
const MEDIA = 'hpg-media-v2'
const PHOTO = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@abc/exercises/Bench/0.jpg'
const ASSET = 'https://gym.example.com/assets/index-AbC12345.js'
const HTML = 'https://gym.example.com/index.html'

describe('service worker — aset ber-hash', () => {
  it('disajikan dari cache TANPA menyentuh jaringan', async () => {
    // Nama berkasnya memuat hash isinya, jadi request revalidasi adalah request yang jawabannya
    // sudah pasti. Di sinyal buruk itu bukan cuma boros — itu penundaan.
    const sw = loadSW({ cacheSeed: { [SHELL]: { [ASSET]: res('cached-js') } } })
    const out = await handleFetch(sw, ASSET)
    expect(out.body).toBe('cached-js')
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('diambil dan disimpan saat belum ada di cache', async () => {
    const sw = loadSW()
    const out = await handleFetch(sw, ASSET)
    expect(out.body).toBe('network')
    expect(sw.puts).toContainEqual({ name: SHELL, key: ASSET })
  })
})

describe('service worker — HTML dan navigasi', () => {
  it('menyajikan cache SEKETIKA tanpa menunggu jaringan', async () => {
    // Ini inti aturan #1. Versi sebelumnya network-first, jadi tiap pembukaan menunggu — dan
    // fetch tidak punya timeout, jadi sinyal yang buruk berarti layar yang menggantung.
    let selesai = false
    const lambat = vi.fn(() => new Promise(r => setTimeout(() => { selesai = true; r(res('fresh')) }, 10_000)))
    const sw = loadSW({ fetchImpl: lambat, cacheSeed: { [SHELL]: { [HTML]: res('cached-html') } } })
    const out = await handleFetch(sw, HTML)
    expect(out.body).toBe('cached-html')
    expect(selesai).toBe(false)     // jaringannya masih menggantung, dan itu tidak apa-apa
  })

  it('tetap memperbarui di latar', async () => {
    const sw = loadSW({ cacheSeed: { [SHELL]: { [HTML]: res('cached-html') } } })
    await handleFetch(sw, HTML)
    await Promise.resolve(); await Promise.resolve()
    expect(sw.fetch).toHaveBeenCalled()
  })

  it('jaringan yang GAGAL di latar tidak boleh melempar', async () => {
    // Promise latar itu tidak ada yang menangkapnya di luar; unhandled rejection di service
    // worker bisa mematikannya.
    const sw = loadSW({
      fetchImpl: vi.fn(() => Promise.reject(new Error('offline'))),
      cacheSeed: { [SHELL]: { [HTML]: res('cached-html') } },
    })
    const out = await handleFetch(sw, HTML)
    expect(out.body).toBe('cached-html')
  })

  it('belum pernah di-cache dan offline: jatuh ke index.html', async () => {
    const sw = loadSW({
      fetchImpl: vi.fn(() => Promise.reject(new Error('offline'))),
      cacheSeed: { [SHELL]: { 'index.html': res('shell') } },
    })
    const out = await handleFetch(sw, 'https://gym.example.com/apa-saja')
    expect(out.body).toBe('shell')
  })
})

describe('service worker — foto demo lintas-origin', () => {
  it('DI-CACHE, bukan dilewatkan', async () => {
    // Versi sebelumnya menolak semua request lintas-origin, sementara seluruh foto gerakan
    // datang dari jsDelivr. Akibatnya: nol foto di basement tanpa sinyal, di app yang justru
    // ada untuk menunjukkan gerakannya.
    const sw = loadSW()
    const out = await handleFetch(sw, PHOTO)
    expect(out.body).toBe('network')
    expect(sw.puts).toContainEqual({ name: MEDIA, key: PHOTO })
  })

  it('disajikan dari cache tanpa jaringan pada kunjungan berikutnya', async () => {
    const sw = loadSW({ cacheSeed: { [MEDIA]: { [PHOTO]: res('cached-photo') } } })
    const out = await handleFetch(sw, PHOTO)
    expect(out.body).toBe('cached-photo')
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('diminta dengan mode cors, bukan dibiarkan opaque', async () => {
    // Response opaque bisa disajikan ke <img>, tapi menghabiskan kuota dengan padding besar.
    // Ratusan foto akan menabrak kuota jauh sebelum ukuran aslinya masuk akal.
    const sw = loadSW()
    await handleFetch(sw, PHOTO)
    expect(sw.fetch).toHaveBeenCalledWith(PHOTO, expect.objectContaining({ mode: 'cors' }))
  })

  it('host lintas-origin LAIN tidak disentuh sama sekali', async () => {
    // Gerbangnya sempit dengan sengaja: service worker tidak boleh jadi proksi umum.
    const sw = loadSW()
    const out = await handleFetch(sw, 'https://analytics.example.net/track.js')
    expect(out).toBe(null)
    expect(sw.fetch).not.toHaveBeenCalled()
  })
})

describe('service worker — pesan prefetch', () => {
  const msg = (sw, data) => {
    const waits = []
    sw.listeners.message({ data, waitUntil: p => waits.push(p) })
    return Promise.all(waits)
  }

  it('mengambil foto yang diminta halaman', async () => {
    const sw = loadSW()
    await msg(sw, { type: 'prefetch-media', urls: [PHOTO] })
    expect(sw.puts).toContainEqual({ name: MEDIA, key: PHOTO })
  })

  it('yang sudah ada di cache TIDAK diambil ulang', async () => {
    const sw = loadSW({ cacheSeed: { [MEDIA]: { [PHOTO]: res('sudah ada') } } })
    await msg(sw, { type: 'prefetch-media', urls: [PHOTO] })
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('MENOLAK URL di luar host media', async () => {
    // Sebuah pesan tidak boleh bisa menyuruh service worker mengambil sembarang URL.
    const sw = loadSW()
    await msg(sw, { type: 'prefetch-media', urls: ['https://jahat.example.net/x.jpg'] })
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('mengabaikan pesan berbentuk lain tanpa melempar', async () => {
    const sw = loadSW()
    await msg(sw, { type: 'lain' })
    await msg(sw, {})
    await msg(sw, { type: 'prefetch-media', urls: 'bukan array' })
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('satu foto yang gagal tidak menggagalkan sisanya', async () => {
    const P2 = PHOTO.replace('/0.jpg', '/1.jpg')
    const sw = loadSW({
      fetchImpl: vi.fn(u => (u === PHOTO ? Promise.reject(new Error('x')) : Promise.resolve(res('ok')))),
    })
    await msg(sw, { type: 'prefetch-media', urls: [PHOTO, P2] })
    expect(sw.puts).toContainEqual({ name: MEDIA, key: P2 })
  })
})

describe('service worker — daur hidup', () => {
  it('membuang cache versi lama saat aktivasi', async () => {
    const sw = loadSW()
    const waits = []
    sw.listeners.activate({ waitUntil: p => waits.push(p) })
    await Promise.all(waits)
    expect(sw.deleted).toContain('opengym-rt-v1')
    expect(sw.deleted).toContain('hpg-shell-v1')
    expect(sw.deleted).not.toContain(SHELL)
  })

  it('TIDAK punya handler push — rest timer tidak pakai server push', () => {
    // Aturan #2 CLAUDE.md. Handler-nya warisan dari lapis web push yang sudah dicabut, dan
    // menghidupkannya kembali berarti menambah titik gagal jaringan tepat saat timer habis.
    expect(sw_listeners()).not.toContain('push')
  })

  it('MASIH punya notificationclick — alarm lokal memakainya', () => {
    expect(sw_listeners()).toContain('notificationclick')
  })
})

function sw_listeners() {
  return Object.keys(loadSW().listeners)
}
