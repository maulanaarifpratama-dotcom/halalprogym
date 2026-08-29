import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Dua `vercel.json`, dan kenapa duplikasi ini disengaja.
 *
 * Vercel membaca `vercel.json` dari **Root Directory** project — dan Root Directory itu setelan
 * dasbor yang tidak terlihat sama sekali dari dalam repo. Ada dua kemungkinan, dan keduanya harus
 * menghasilkan deploy yang benar:
 *
 *   · Root Directory = AKAR REPO. `vercel.json` di akar dibaca lengkap: `buildCommand`
 *     (`cd frontend && …`), `outputDirectory`, dan headers.
 *   · Root Directory = `frontend`. Yang di akar TIDAK PERNAH DIBACA. Vercel mendeteksi Vite
 *     sendiri dan membangunnya dengan benar — tapi seluruh headers hilang TANPA SUARA.
 *
 * Yang hilang bukan hiasan. `sw.js` tanpa `Cache-Control: max-age=0, must-revalidate` akan
 * di-cache CDN, dan service worker yang di-cache berarti orang terjebak di versi lama app —
 * selamanya, karena SW lama yang menyajikan shell lama. Ditambah `Service-Worker-Allowed` dan
 * empat header keamanan.
 *
 * Jadi `frontend/vercel.json` ada, membawa HANYA headers. Build config sengaja TIDAK diduplikasi:
 * di skenario kedua Vercel sudah mendeteksi Vite dengan benar, dan menuliskan perintah build
 * kedua kalinya berarti dua tempat yang bisa menyimpang tanpa ada yang tahu.
 *
 * Berkas ini yang membuat duplikasi headers-nya aman: dia menuntut keduanya IDENTIK.
 */

const baca = (rel: string) =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))

const AKAR = baca('../../../vercel.json')
const FRONTEND = baca('../../vercel.json')

describe('dua vercel.json harus membawa headers yang sama', () => {
  it('headers identik, byte per byte', () => {
    // Perbandingan struktural, bukan "panjangnya sama": urutan header di dalam satu source pun
    // berarti, dan nilai yang menyimpang adalah persis kegagalan sunyi yang berkas ini cegah.
    expect(FRONTEND.headers).toEqual(AKAR.headers)
  })

  it('keduanya benar-benar punya headers, bukan array kosong', () => {
    // Penjaga yang membandingkan dua array kosong akan hijau selamanya tanpa memeriksa apa pun.
    expect(Array.isArray(AKAR.headers)).toBe(true)
    expect(AKAR.headers.length).toBeGreaterThan(3)
  })

  it('aturan sw.js ada, dan dia yang paling penting', () => {
    // Service worker yang di-cache berarti app yang tidak pernah update. Ini satu-satunya header
    // di daftar itu yang kegagalannya permanen dan tidak terlihat.
    const sw = AKAR.headers.find((h: { source: string }) => h.source === '/sw.js')
    expect(sw, 'aturan /sw.js hilang dari vercel.json').toBeTruthy()
    const keys = sw.headers.map((x: { key: string }) => x.key)
    expect(keys).toContain('Cache-Control')
    expect(keys).toContain('Service-Worker-Allowed')
    const cc = sw.headers.find((x: { key: string }) => x.key === 'Cache-Control')
    expect(cc.value).toContain('max-age=0')
  })

  it('frontend/vercel.json TIDAK menduplikasi perintah build', () => {
    // Kalau dia menduplikasinya, ada dua definisi cara membangun produksi, dan yang menyimpang
    // tidak akan pernah terlihat dari salah satunya.
    expect('buildCommand' in FRONTEND, 'jangan duplikasi buildCommand').toBe(false)
    expect('outputDirectory' in FRONTEND).toBe(false)
  })

  it('yang di akar tetap memegang perintah build', () => {
    expect(AKAR.buildCommand).toContain('cd frontend')
    expect(AKAR.outputDirectory).toBe('frontend/dist')
  })
})

describe('vercel.json harus SAH menurut skema Vercel', () => {
  /**
   * Skema `vercel.json` punya `additionalProperties: false` — satu kunci asing membuat Vercel
   * MENOLAK KONFIGURASINYA sebelum build dijalankan sama sekali. Gejalanya "Deployment failed"
   * tanpa log build, dan itu sangat mudah disalahartikan sebagai build yang gagal.
   *
   * Ini bukan hipotesis: `frontend/vercel.json` sempat dikirim dengan kunci `"//"` sebagai
   * komentar, dan JSON memang tidak punya komentar. Diverifikasi ke skema resmi Vercel
   * (openapi.vercel.sh/vercel.json) bahwa kunci itu di luar skema.
   *
   * Yang dilarang di sini kunci gaya-komentar, bukan daftar-putih kunci yang sah: daftar-putih
   * akan basi setiap kali Vercel menambah fitur, dan penjaga yang basi akan dimatikan orang.
   */
  const GAYA_KOMENTAR = /^(\/\/|#|_comment|comment)$/i

  for (const [nama, cfg] of [['vercel.json', AKAR], ['frontend/vercel.json', FRONTEND]] as const) {
    it(nama + ' tidak punya kunci gaya-komentar', () => {
      const salah = Object.keys(cfg).filter(k => GAYA_KOMENTAR.test(k))
      expect(
        salah,
        'JSON tidak punya komentar, dan skema Vercel additionalProperties:false menolak kunci '
        + 'asing — konfigurasinya ditolak sebelum build jalan. Taruh penjelasannya di tes ini.'
      ).toEqual([])
    })
  }

  it('keduanya cuma memakai kunci yang memang dipakai repo ini', () => {
    // Daftar sempit dan sengaja: kalau ada yang menambah kunci Vercel baru, dia harus lewat
    // sini dan memastikan kunci itu benar-benar ada di skema.
    const DIPAKAI = ['$schema', 'buildCommand', 'outputDirectory', 'installCommand', 'framework', 'headers']
    for (const cfg of [AKAR, FRONTEND]) {
      for (const k of Object.keys(cfg)) expect(DIPAKAI, 'kunci tak dikenal: ' + k).toContain(k)
    }
  })
})
