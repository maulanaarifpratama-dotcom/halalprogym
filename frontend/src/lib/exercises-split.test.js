import { describe, expect, it } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { EXDB } from './exercises-data.js'
import EN from './exercises-instructions.js'

/**
 * Menjaga pemisahan katalog / instruksi.
 *
 * Instruksi 1.324 latihan itu **71% dari katalog** dan cuma dibaca di satu layar: sheet detail
 * latihan. Selama dia menempel di katalog, setiap pembukaan app mengunduh dan mem-parse 867 KB
 * untuk memakai 180 KB.
 *
 * Yang membuat tes ini perlu: pemisahan seperti ini gampang dibatalkan tanpa sadar. Satu skrip
 * generator yang dijalankan dari sumber lama, satu merge yang salah, atau satu orang yang
 * "merapikan" dengan menggabungkannya kembali — dan tidak ada yang gagal. Bundle-nya cuma
 * membesar 96 KB gzip, diam-diam, dan tidak ada yang memperhatikan sampai seseorang mengeluh
 * app-nya lambat dibuka.
 */
const kb = n => Math.round(n / 1024)
const bytesOf = url => statSync(new URL(url, import.meta.url)).size

describe('pemisahan katalog dan instruksi', () => {
  it('katalog TIDAK membawa instruksi', () => {
    const carriers = EXDB.filter(e => e.st !== undefined)
    expect(carriers.map(e => e.id), 'jalankan scripts/split-exercise-data.mjs').toEqual([])
  })

  it('katalog TIDAK membawa nama berkas media warisan', () => {
    // `img`/`gif` menunjuk media © Gym visual, dan memakainya untuk produk komersial dilarang
    // (CLAUDE.md). Menyimpan penunjuknya adalah ranjau yang menunggu seseorang menyalakannya.
    const carriers = EXDB.filter(e => e.img !== undefined || e.gif !== undefined)
    expect(carriers.map(e => e.id), 'media © Gym visual tidak boleh kembali').toEqual([])
  })

  it('setiap latihan katalog tetap punya instruksinya di berkas terpisah', () => {
    // Pemisahan tidak boleh berarti kehilangan. Kalau angka ini turun, ada latihan yang
    // instruksinya hilang — dan itu tidak akan terlihat sampai seseorang membuka sheet-nya.
    const tanpa = EXDB.filter(e => !Array.isArray(EN[e.id]) || EN[e.id].length === 0)
    expect(tanpa.map(e => e.id)).toEqual([])
    expect(Object.keys(EN)).toHaveLength(EXDB.length)
  })

  it('katalog tetap kecil, dan angkanya dipatok', () => {
    // 867 KB -> 181 KB. Pin ini yang meneriakkan kalau instruksinya masuk lagi diam-diam.
    const size = bytesOf('./exercises-data.js')
    expect(kb(size), 'katalog ' + kb(size) + ' KB').toBeLessThan(260)
  })

  it('penghematan di muat pertama masih nyata', () => {
    // Yang benar-benar dirasakan orang adalah byte terkompresi, bukan ukuran berkas. Kalau
    // suatu saat angka ini mendekati nol, pemisahannya sudah tidak membeli apa pun lagi dan
    // kerumitannya tidak layak dipertahankan.
    const catalogue = gzipSync(readFileSync(new URL('./exercises-data.js', import.meta.url))).length
    const instructions = gzipSync(readFileSync(new URL('./exercises-instructions.js', import.meta.url))).length
    expect(kb(instructions), 'instruksi ' + kb(instructions) + ' KB gzip').toBeGreaterThan(60)
    expect(kb(catalogue), 'katalog ' + kb(catalogue) + ' KB gzip').toBeLessThan(30)
  })

  it('instruksi TIDAK diimpor statis dari mana pun', () => {
    // Satu impor statis membatalkan seluruh pemisahan: bundler akan menariknya kembali ke
    // chunk utama, dan tidak ada yang gagal. Yang boleh cuma import() dinamis di i18n-core.
    const core = readFileSync(new URL('./i18n-core.js', import.meta.url), 'utf8')
    expect(core).toContain("import('./exercises-instructions.js')")
    expect(core).not.toMatch(/^import .*exercises-instructions/m)
  })
})
