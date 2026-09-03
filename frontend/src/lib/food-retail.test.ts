import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import RETAIL from './food-retail.js'
import USDA from './food-usda.js'

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


describe('penanda cair (`l`) — dia yang menentukan "350 ml" atau "350 g"', () => {
  /**
   * `l: 1` membuat UI menulis satuan ml. Kalau penandanya hilang saat katalog dibangun ulang,
   * setiap minuman tampil "350 g" — salah, dan tidak ada error di mana pun. Sebelum tes ini,
   * field itu punya NOL tes di tingkat data.
   *
   * Deteksinya memakai tiga sinyal terstruktur, semuanya ditulis kontributor sendiri: tag
   * kategori OFF, satuan di ekor NAMA ("Frestea madu 500 Ml"), dan satuan di `serving_size`.
   * Kata kunci nama TIDAK dipakai, dan itu yang menjaga "kopi tubruk gadjah 150 gr" tetap gram.
   */
  const cair = rows.filter(r => (r as { l?: number }).l === 1)

  it('ada yang ditandai cair, dan jumlahnya wajar', () => {
    // Nol berarti deteksinya mati; setengah katalog berarti dia terlalu longgar.
    expect(cair.length).toBeGreaterThan(40)
    expect(cair.length).toBeLessThan(rows.length / 2)
  })

  it('`l` hanya pernah bernilai 1 — tidak pernah 0, false, atau string', () => {
    // Nilai selain 1 berarti pembuatnya menulis field yang tidak dibaca UI, dan itu bug yang
    // tampil sebagai satuan yang salah, bukan sebagai error.
    const nilai = new Set(rows.map(r => (r as { l?: unknown }).l).filter(v => v !== undefined))
    expect([...nilai]).toEqual([1])
  })

  it('bubuk dan sachet TIDAK ditandai cair', () => {
    // Uji arah sebaliknya, dan ini yang paling mudah rusak kalau seseorang menambahkan kata
    // kunci nama: "kopi" dan "teh" muncul di produk bubuk maupun minuman siap saji.
    const salah = cair.filter(r => /\b(bubuk|powder|tubruk|sachet|instan|instant)\b/i.test(r.n))
    expect(salah.map(r => r.n), 'produk bubuk ditandai cair').toEqual([])
  })

  it('yang jelas minuman kemasan dalam ml memang tertandai', () => {
    // Cakupan, bukan bentuk. Kalau ini kosong, deteksinya hijau sambil tidak menandai apa pun
    // yang berguna.
    const contoh = rows.filter(r => /pocari|frestea|buavita|teh pucuk melati/i.test(r.n))
    expect(contoh.length, 'contoh minuman tidak ada di katalog').toBeGreaterThan(2)
    const tertandai = contoh.filter(r => (r as { l?: number }).l === 1)
    expect(tertandai.length, 'nol minuman kemasan tertandai cair').toBeGreaterThan(0)
  })
})

/**
 * ANGKA DI DOKUMENTASI DIPERIKSA KE DATANYA.
 *
 * `CLAUDE.md` menyebut "59 bahan pokok" dan "758 produk ritel" di beberapa tempat, dan sampai
 * 2026-09-03 tidak ada satu pun tes yang memakunya. Repo ini sudah pernah membayar kelas itu:
 * komentar `exercise-media.ts` menulis "329 dari 1.324" sementara petanya berisi 340 — basi 11
 * latihan, dan tidak ada yang bisa melihatnya.
 *
 * Dua berkas ini DIBUAT MESIN, jadi jumlahnya bergerak setiap kali skripnya dijalankan ulang.
 * Yang dijaga di sini bukan angkanya sakral — yang dijaga adalah **angka di dokumen sama dengan
 * angka di data**. Kalau `npm run food:retail` mengubahnya, perbarui KEDUANYA di satu commit.
 */
describe('jumlah katalog makanan sama dengan yang ditulis dokumentasi', () => {
  const CLAUDE = readFileSync(new URL('../../../CLAUDE.md', import.meta.url), 'utf8')

  it('USDA: 59 bahan pokok, dan dokumennya menyebut angka yang sama', () => {
    expect(USDA.length).toBe(59)
    expect(CLAUDE, 'CLAUDE.md menyebut jumlah USDA yang berbeda dari datanya')
      .toContain(USDA.length + ' bahan pokok')
  })

  it('ritel: 758 produk, dan dokumennya menyebut angka yang sama', () => {
    expect(RETAIL.length).toBe(758)
    expect(CLAUDE, 'CLAUDE.md menyebut jumlah produk ritel yang berbeda dari datanya')
      .toContain(RETAIL.length + ' produk ritel')
  })

  it('keduanya berkas TERPISAH, dan itu soal lisensi bukan kerapian', () => {
    // USDA = CC0, Open Food Facts = ODbL. Mencampurnya berarti seluruh berkas harus ODbL —
    // termasuk baris yang sebenarnya CC0 — dan lebih buruk, tidak ada lagi cara melihat mana
    // yang mana. Penjaga ini menagih pemisahan itu tetap ada.
    const usdaSrc = readFileSync(new URL('./food-usda.js', import.meta.url), 'utf8')
    const ritelSrc = readFileSync(new URL('./food-retail.js', import.meta.url), 'utf8')
    expect(usdaSrc).toMatch(/CC0/)
    expect(ritelSrc).toMatch(/ODbL/)
    // Setiap baris USDA membawa FDC id-nya: itu yang membuat klaim CC0 bisa diperiksa
    // PER-BARIS ke sumbernya, bukan cuma dinyatakan di kepala berkas.
    //
    // Fieldnya bernama `id`, bukan `fdcId` — CLAUDE.md menyebutnya "fdcId" secara konsep, dan
    // asersi pertama saya mencari nama itu lalu melaporkan 59 baris "tanpa fdcId". Salah alarm
    // dari tesnya, bukan cacat di datanya. Catatan ini ada supaya pencarian `fdcId` berikutnya
    // mendarat di sini alih-alih menyimpulkan hal yang sama.
    const bukanFdc = (USDA as Array<{ id?: unknown; nama?: string }>)
      .filter(f => !/^\d{5,7}$/.test(String(f.id ?? '')))
    expect(bukanFdc.map(f => f.nama), 'baris USDA tanpa FDC id yang berbentuk benar').toEqual([])
  })
})
