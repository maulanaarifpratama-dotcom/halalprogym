import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Atribusi data makanan adalah SYARAT LISENSI, bukan sopan santun — dan berkas ini yang membuatnya
 * tidak bergantung pada ingatan siapa pun.
 *
 * Open Food Facts melisensikan databasenya **ODbL 1.0**, dan ODbL mewajibkan atribusi pada setiap
 * penggunaan publik dari database turunan. `lib/food-retail.js` ADALAH database turunan itu. Kalau
 * barisnya hilang dari UI karena seseorang merapikan footer, kita melanggar lisensi — dan tidak
 * ada satu pun tes atau build yang akan memberi tahu. Persis kelas kegagalan yang sama dengan
 * tautan kode sumber AGPL di layar Pengaturan, yang juga dijaga karena alasan itu.
 *
 * USDA FoodData Central domain publik (CC0 1.0): atribusinya DIMINTA, bukan diwajibkan. Dia tetap
 * dipaku di sini, karena tahu dari mana sebuah dataset datang adalah yang memungkinkan orang
 * berikutnya memverifikasinya.
 *
 * Diperiksa di TIGA tempat, dan ketiganya perlu:
 *   · NOTICE.md      — untuk orang yang membaca repo
 *   · Pengaturan     — untuk orang yang memakai app dan mencari asal datanya
 *   · lembar pencarian makanan — untuk orang yang sedang MEMAKAI datanya saat itu
 *
 * Yang ketiga paling gampang dianggap berlebihan dan justru paling penting: atribusi yang cuma ada
 * di layar Tentang tidak terlihat oleh siapa pun yang benar-benar memakai datanya.
 */

const baca = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8')

describe('atribusi Open Food Facts (ODbL) tidak boleh hilang', () => {
  it('ada di NOTICE.md, lengkap dengan nama lisensinya', () => {
    const s = baca('../../../NOTICE.md')
    expect(s).toContain('Open Food Facts')
    expect(s, 'nama lisensinya harus disebut, bukan cuma "open data"').toContain('ODbL 1.0')
  })

  it('ada di layar Pengaturan', () => {
    const s = baca('../views/Settings.jsx')
    expect(s).toContain('Open Food Facts')
    expect(s).toContain('ODbL 1.0')
  })

  it('ada di lembar tempat datanya DIPAKAI, bukan cuma di Tentang', () => {
    const s = baca('../components/FoodDbSheet.jsx')
    expect(s).toContain('Open Food Facts')
    expect(s).toContain('ODbL 1.0')
  })

  it('NOTICE.md menyatakan bahwa database turunannya juga ODbL', () => {
    // Ini kewajiban share-alike-nya. Menyebut sumbernya tanpa menyebut ini setengah jalan.
    const s = baca('../../../NOTICE.md')
    expect(/derived database[\s\S]{0,400}ODbL 1\.0/i.test(s)).toBe(true)
  })
})

describe('atribusi USDA (CC0) diberikan walau tidak diwajibkan', () => {
  it('ada di NOTICE.md dengan sitasi resminya', () => {
    const s = baca('../../../NOTICE.md')
    expect(s).toContain('FoodData Central')
    expect(s).toContain('CC0 1.0')
    expect(s, 'sitasi resmi USDA').toContain('Agricultural Research Service')
  })

  it('ada di layar Pengaturan dan di lembar makanan', () => {
    expect(baca('../views/Settings.jsx')).toContain('FoodData Central')
    expect(baca('../components/FoodDbSheet.jsx')).toContain('USDA FoodData Central')
  })

  it('berkas datanya membawa fdcId supaya angkanya bisa diverifikasi', () => {
    const s = baca('./food-usda.js')
    expect(s).toContain('fdcId')
    expect(s).toContain('CC0 1.0')
  })
})

describe('TKPI harus tetap tercatat sebagai TIDAK BOLEH, bukan "belum jelas"', () => {
  /**
   * Selama berbulan-bulan repo ini mencatat lisensi TKPI sebagai "harus dipastikan dulu", dan
   * catatan itu membuat setiap sesi berikutnya mengira ini pekerjaan yang menunggu keputusan.
   * Jawabannya sudah diperiksa ke repositori resmi Kemenkes: "All Rights Reserved", nol lisensi
   * terbuka. Kalau kalimat itu melunak lagi jadi "belum jelas", seseorang akan mengecek ulang
   * pertanyaan yang sudah dijawab — atau lebih buruk, meng-commit datanya.
   */
  it('NOTICE.md menyebut TKPI dan menyatakan alasannya tidak dipakai', () => {
    const s = baca('../../../NOTICE.md')
    expect(s).toContain('TKPI')
    expect(s).toContain('All Rights Reserved')
  })

  it('tidak ada satu pun berkas data TKPI yang ikut ter-commit', () => {
    // Penjaga yang paling langsung: kalau berkasnya ada, dia akan ketemu di sini.
    const dilarang = ['food-tkpi.js', 'food-tkpi.json', 'tkpi.js', 'tkpi.json']
    for (const f of dilarang) {
      let ada = true
      try { readFileSync(new URL('./' + f, import.meta.url)) } catch { ada = false }
      expect(ada, 'berkas data TKPI ter-commit: ' + f).toBe(false)
    }
  })
})
