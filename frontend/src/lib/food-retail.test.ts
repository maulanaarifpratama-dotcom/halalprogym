import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import RETAIL from './food-retail.js'

/**
 * `food-retail.js` DIBUAT MESIN, dan berkas yang di-generate paling mudah rusak diam-diam: satu
 * field yang lupa disalin tidak menggagalkan build, typecheck, maupun tes mana pun — yang terjadi
 * `undefined` yang mengalir ke layar. Alasan yang sama dengan `catalogue-integrity.test.js` untuk
 * 1.324 latihan.
 */

interface Baris {
  c: string; n: string; b: string; k: number
  p?: number; ca?: number; f?: number; s?: number
}

const rows = RETAIL as Baris[]

describe('katalog ritel — bentuk data', () => {
  it('jumlahnya wajar, dan tidak nol', () => {
    // Nol berarti build-nya gagal sunyi dan seluruh fitur mati tanpa error. Batas atas ada
    // karena chunk ini diunduh orang: kalau naik drastis, itu keputusan yang harus disengaja.
    expect(rows.length).toBeGreaterThan(500)
    expect(rows.length).toBeLessThan(6000)
  })

  it('barcode unik dan berbentuk barcode', () => {
    // Barcode adalah id-nya, dan juga pintu masuk pemindai barcode nanti. Duplikat berarti dua
    // baris berebut satu id, dan `adopt` akan menganggap yang kedua sudah ada.
    for (const r of rows) expect(r.c, r.n).toMatch(/^\d{6,14}$/)
    expect(new Set(rows.map(r => r.c)).size).toBe(rows.length)
  })

  it('nama ada, tidak diawali tanda baca, dan bukan cuma angka', () => {
    for (const r of rows) {
      expect(r.n.length, r.c).toBeGreaterThanOrEqual(3)
      expect(r.n, r.c).not.toMatch(/^[\s\-–—_.,:;'"`([]/)
      expect(/[a-z]{3}/i.test(r.n), r.c + ' ' + r.n).toBe(true)
    }
  })

  it('kalori per 100 g masuk akal, dan NOL diterima', () => {
    // Nol itu data (air mineral, teh tawar), bukan data yang hilang. Versi pertama menolaknya dan
    // akibatnya Aqua tidak ada di katalog.
    let adaNol = false
    for (const r of rows) {
      expect(typeof r.k, r.n).toBe('number')
      expect(r.k, r.n).toBeGreaterThanOrEqual(0)
      expect(r.k, r.n).toBeLessThanOrEqual(900)
      if (r.k === 0) adaNol = true
    }
    expect(adaNol, 'nol kalori seharusnya diterima — cek saringan kcal di skrip build').toBe(true)
  })

  it('makro yang tidak ada BENAR-BENAR tidak ada, bukan nol', () => {
    // Nol berarti "produk ini benar-benar nol protein"; itu klaim yang berbeda dari "kemasannya
    // tidak menyatakannya". Setidaknya satu baris harus membuktikan bedanya terjaga.
    const adaYangKosong = rows.some(r => r.p === undefined || r.ca === undefined || r.f === undefined)
    expect(adaYangKosong).toBe(true)
    for (const r of rows) {
      for (const v of [r.p, r.ca, r.f]) {
        if (v === undefined) continue
        expect(v, r.n).toBeGreaterThanOrEqual(0)
        expect(v, r.n).toBeLessThanOrEqual(100)
      }
    }
  })

  it('tidak ada satu pun URL — apalagi URL gambar', () => {
    // Gambar OFF berlisensi CC BY-SA 3.0 dan share-alike-nya menular. Diperiksa atas TEKS
    // berkasnya, bukan atas tipenya, supaya field baru apa pun ikut tertangkap.
    const s = readFileSync(new URL('./food-retail.js', import.meta.url), 'utf8')
    const isi = s.slice(s.indexOf('export default'))
    expect(/https?:\/\//.test(isi), 'ada URL di dalam data — periksa skrip build').toBe(false)
  })

  it('kepala berkasnya membawa pemberitahuan lisensinya sendiri', () => {
    const s = readFileSync(new URL('./food-retail.js', import.meta.url), 'utf8')
    const kepala = s.slice(0, s.indexOf('export default'))
    expect(kepala).toContain('ODbL')
    expect(kepala).toContain('Open Food Facts')
    // Kelengkapan wajib dinyatakan: katalog sebagian yang tidak mengaku sebagian adalah bug yang
    // tidak akan dilaporkan siapa pun.
    expect(kepala).toContain('KELENGKAPAN')
  })
})

describe('katalog ritel — ukuran unduhannya', () => {
  it('tetap kecil, karena orang mengunduhnya di sinyal gym basement', () => {
    // Chunk terpisah, tapi tetap chunk yang harus turun ke perangkat. Kalau batas ini terlampaui,
    // itu keputusan yang harus disengaja — naikkan angkanya di sini dan sebutkan alasannya.
    const gz = gzipSync(readFileSync(new URL('./food-retail.js', import.meta.url))).length
    expect(Math.round(gz / 1024), 'KB gzip').toBeLessThan(60)
  })

  it('dimuat lewat import DINAMIS, bukan ikut bundel utama', () => {
    // Orang yang tidak pernah membuka lembar pencarian makanan tidak boleh mengunduhnya.
    const s = readFileSync(new URL('./food-db.ts', import.meta.url), 'utf8')
    expect(s).toContain("await import('./food-retail.js')")
    expect(
      /^import .*food-retail/m.test(s),
      'food-retail diimpor statis — dia akan masuk bundel utama'
    ).toBe(false)
  })
})

describe('produk yang benar-benar dicari orang Indonesia ada di dalamnya', () => {
  /**
   * Penjaga cakupan, bukan penjaga bentuk. Katalog yang lulus semua tes bentuk di atas tapi tidak
   * memuat Indomie adalah katalog yang gagal menjawab pertanyaan yang membuatnya dibangun.
   *
   * Daftarnya sengaja pendek dan sengaja merek yang sangat umum. Kalau salah satunya hilang
   * setelah menyegarkan data, itu pertanda saringannya berubah terlalu ketat — bukan pertanda
   * merek itu berhenti dijual.
   */
  const teks = rows.map(r => (r.n + ' ' + r.b).toLowerCase()).join('\n')

  for (const merek of ['indomie', 'pocari', 'teh pucuk', 'energen', 'aqua']) {
    it('memuat ' + merek, () => {
      expect(teks.includes(merek), merek + ' hilang dari katalog').toBe(true)
    })
  }
})
