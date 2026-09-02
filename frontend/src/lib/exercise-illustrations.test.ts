import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import MAP from './exercise-illustrations.json'
import FOTO from './exercise-media.json'
import { REPDB_COMMIT, ILLUSTRATION_COUNT, hasIllustration, illustrationFrames } from './exercise-illustrations.js'
import { demoFrames, DEMO_COUNT, PHOTO_COUNT } from './exercise-media.js'

/**
 * Ilustrasi RepDB: peta, commit yang di-pin, urutan resolusi, dan atribusi.
 *
 * Empat hal dijaga di sini, dan tiga di antaranya punya kegagalan yang SUNYI — tidak ada error,
 * tidak ada peringatan build, cuma app yang salah di layar orang.
 */

const AKAR = new URL('../../../', import.meta.url)
const baca = (rel: string, dari: URL = new URL('./', import.meta.url)): string =>
  readFileSync(new URL(rel, dari), 'utf8')

const peta = MAP as Record<string, string[]>
const foto = FOTO as Record<string, string[]>

describe('peta ilustrasi — bentuk data', () => {
  it('tidak kosong, dan jumlahnya wajar', () => {
    expect(ILLUSTRATION_COUNT).toBeGreaterThan(50)
    expect(ILLUSTRATION_COUNT).toBeLessThan(1324)
    expect(Object.keys(peta).length).toBe(ILLUSTRATION_COUNT)
  })

  it('setiap entri punya TEPAT dua bingkai', () => {
    /**
     * UI ini dibangun di sekitar dua posisi yang bisa dibolak-balik — awal dan puncak. Satu
     * gambar diam menjawab pertanyaan yang berbeda dari yang dijanjikan, dan tiga bingkai berarti
     * ketukan ketiga tidak melakukan apa-apa.
     */
    for (const [id, f] of Object.entries(peta)) {
      expect(Array.isArray(f), id).toBe(true)
      expect(f.length, id + ' harus start + peak').toBe(2)
    }
  })

  it('bingkainya berupa jalur webp flat, bukan URL', () => {
    // URL absolut di dalam peta berarti basisnya tidak bisa di-override, dan build APK yang
    // membundel gambarnya sendiri diam-diam berhenti bekerja.
    for (const [id, f] of Object.entries(peta)) {
      for (const rel of f) {
        expect(rel, id).toMatch(/^images\/flat\/[a-z0-9-]+\.webp$/)
        expect(/^https?:/.test(rel), id + ' jalur absolut').toBe(false)
      }
    }
  })

  it('bingkai pertama START, kedua PEAK — urutannya membawa arti', () => {
    // Terbalik berarti demo yang dimulai dari posisi akhir, dan itu mengajarkan gerakan terbalik.
    for (const [id, f] of Object.entries(peta)) {
      expect(f[0], id).toMatch(/-start\.webp$/)
      expect(f[1], id).toMatch(/-peak\.webp$/)
    }
  })

  it('id-nya berbentuk id katalog', () => {
    for (const id of Object.keys(peta)) expect(id, id).toMatch(/^\d{4}$/)
  })
})

describe('commit RepDB di-pin, dan HARUS sama di dua tempat', () => {
  /**
   * Kalau peta menunjuk satu commit dan gambar datang dari commit lain, yang muncul di layar
   * adalah GERAKAN YANG SALAH — tanpa error dan tanpa peringatan. Alasan yang sama dengan
   * `FEDB_COMMIT`, dan alasan itu sudah terbukti cukup penting untuk dipaku di sana.
   */
  it('bentuknya SHA lengkap, bukan `main` yang bergerak', () => {
    expect(REPDB_COMMIT).toMatch(/^[0-9a-f]{40}$/)
  })

  it('skrip pembuatnya memakai commit yang sama', () => {
    const skrip = baca('build-repdb-illustrations.mjs', new URL('../../../scripts/', import.meta.url))
    const m = skrip.match(/REPDB_COMMIT = '([0-9a-f]{40})'/)
    expect(m, 'REPDB_COMMIT tidak ketemu di skrip pembuatnya').toBeTruthy()
    expect(
      (m as RegExpMatchArray)[1],
      'commit di skrip build dan di lib menyimpang — peta dan gambar akan datang dari commit '
      + 'yang berbeda, dan yang tampil di layar adalah gerakan yang salah'
    ).toBe(REPDB_COMMIT)
  })

  it('pembundel APK MEMBACA commit itu, tidak menyimpan salinannya', () => {
    // Tempat ketiga yang menyimpan salinan = tempat ketiga yang bisa menyimpang. Cara terbaik
    // menjaga tiga tempat sinkron adalah membuat salah satunya bukan tempat penyimpanan.
    //
    // Perhatikan path-nya: `fetch-demo-media.mjs` hidup di `frontend/scripts/`, sementara
    // pembuat petanya di `scripts/` AKAR REPO. Dua direktori berbeda, dan memakai path yang
    // salah membuat tes ini merah dengan pesan yang menyesatkan — seolah commit-nya menyimpang
    // padahal berkasnya cuma tidak ketemu.
    const b = baca('fetch-demo-media.mjs', new URL('../../scripts/', import.meta.url))
    expect(b).toContain("REPDB_COMMIT = '([0-9a-f]{40})'")
    expect(b).toContain('exercise-illustrations.ts')
  })
})

describe('ILUSTRASI MENANG ATAS FOTO', () => {
  /**
   * Ini aturan brand, bukan selera. Foto free-exercise-db adalah foto orang sungguhan dan sebagian
   * bertelanjang dada, yang `DESIGN.md` larang eksplisit. Urutannya hidup di `demoFrames` supaya
   * `Media.jsx`, `prefetch.ts`, dan seluruh tesnya tidak perlu tahu ada dua sumber.
   */
  const keduanya = Object.keys(peta).filter(id => foto[id])

  it('ada latihan yang tercakup KEDUA sumber — kalau tidak, tes ini tidak menguji apa pun', () => {
    expect(keduanya.length).toBeGreaterThan(10)
  })

  it('untuk latihan itu, demoFrames mengembalikan ILUSTRASI', () => {
    for (const id of keduanya.slice(0, 40)) {
      const f = demoFrames({ id })
      expect(f.length, id).toBe(2)
      expect(f[0], id + ' harus ilustrasi, bukan foto').toMatch(/\.webp$/)
      expect(illustrationFrames({ id })[0]).toBe(f[0])
    }
  })

  it('latihan yang HANYA punya foto tetap dapat fotonya', () => {
    const hanyaFoto = Object.keys(foto).filter(id => !peta[id])
    expect(hanyaFoto.length).toBeGreaterThan(100)
    for (const id of hanyaFoto.slice(0, 20)) {
      const f = demoFrames({ id })
      expect(f.length, id).toBeGreaterThan(0)
      expect(f[0], id + ' seharusnya foto').toMatch(/\.jpg$/)
    }
  })

  it('latihan tanpa keduanya tetap kosong — supaya diagram otot yang tampil', () => {
    expect(demoFrames({ id: '9999' })).toEqual([])
    expect(hasIllustration({ id: '9999' })).toBe(false)
  })
})

describe('DEMO_COUNT adalah GABUNGAN, bukan penjumlahan', () => {
  it('tidak melebihi jumlah id unik dari kedua peta', () => {
    /**
     * Angka ini tampil di header Latihan ("1324 exercises · N with demo photos"), jadi salahnya
     * terlihat pengguna. Menjumlahkan dua peta akan mengklaim cakupan yang tidak ada, karena
     * puluhan latihan tercakup keduanya.
     */
    const gabungan = new Set([...Object.keys(peta), ...Object.keys(foto)]).size
    expect(DEMO_COUNT).toBe(gabungan)
    expect(DEMO_COUNT).toBeLessThan(ILLUSTRATION_COUNT + PHOTO_COUNT)
  })
})

describe('atribusi RepDB — term 2 lisensinya, bukan sopan santun', () => {
  /**
   * RepDB Free Tier v1.0 term 2: "Place a visible link — 'Exercise data by RepDB (repdb.co)' — in
   * your app's about/credits screen, your project's README, or your website footer."
   *
   * Dijaga di dua tempat, dan keduanya perlu: NOTICE.md untuk yang membaca repo, layar Pengaturan
   * untuk yang memakai app-nya. Yang kedua yang diminta lisensinya secara harfiah.
   */
  it('ada di NOTICE.md, lengkap dengan nama lisensinya', () => {
    const s = baca('NOTICE.md', AKAR)
    expect(s).toContain('RepDB')
    expect(s).toContain('repdb.co')
    expect(s, 'nama lisensinya harus disebut').toContain('Free Tier License v1.0')
  })

  it('NOTICE.md menyatakan term 3 — kenapa gambarnya tidak di-commit', () => {
    // Kalau alasan ini hilang, seseorang akan meng-commit gambarnya "supaya tidak bergantung CDN"
    // dan melanggar lisensinya tanpa sadar.
    const s = baca('NOTICE.md', AKAR)
    expect(/redistribut\w*[\s\S]{0,200}dataset/i.test(s)).toBe(true)
  })

  it('ada tautan terlihat di layar Pengaturan', () => {
    const s = baca('../views/Settings.jsx')
    expect(s).toContain('repdb.co')
  })

  it('gambarnya TIDAK ikut ter-commit — term 3', () => {
    // Penjaga paling langsung: kalau direktori gambarnya ada di repo, kita melanggar term 3.
    let ada = true
    try { readFileSync(new URL('./images/flat', import.meta.url)) } catch { ada = false }
    expect(ada, 'gambar RepDB ter-commit di repo — itu melanggar term 3').toBe(false)
  })
})
