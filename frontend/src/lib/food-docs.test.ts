import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import RETAIL from './food-retail.js'
import USDA from './food-usda.js'

/**
 * ANGKA DI DOKUMENTASI DIPERIKSA KE KENYATAAN.
 *
 * Repo ini berdiri di atas dokumentasi yang padat, dan itu cuma berguna kalau angkanya benar.
 * Presedennya sudah ada: `catalogue-integrity.test.js` memaku angka katalog latihan di komentar
 * `exercise-media.ts` setelah dia basi 11 latihan tanpa ada yang bisa melihatnya.
 *
 * Katalog makanan langsung mengulang kelas yang sama. `CLAUDE.md` menulis "759 produk ritel" di
 * tiga tempat dan "21,5 KB gzip" — sementara kenyataannya 758 dan 23 KB. Selisihnya kecil dan
 * justru itu masalahnya: cukup kecil untuk tidak terlihat, cukup salah untuk membuat sesi
 * berikutnya menghitung dari angka yang bukan angka sebenarnya.
 *
 * Yang menyebabkan pergeserannya bukan kelalaian menulis: kunci dedup diperbaiki (nama + ukuran
 * kemasan, merek dilepas) dan satu near-duplikat lagi runtuh. Jadi angkanya akan bergeser lagi
 * setiap kali saringannya disentuh — dan itu tepat kenapa dia harus dijaga mesin, bukan ingatan.
 *
 * TOLERANSI SENGAJA ADA untuk ukuran, dan sengaja TIDAK ADA untuk jumlah baris. Jumlah baris itu
 * fakta diskret yang bisa dibaca; ukuran gzip bergerak beberapa ratus byte karena hal yang tidak
 * bermakna (urutan kunci, panjang nama), dan penjaga yang merah karena itu akan dimatikan orang.
 */

const AKAR = new URL('../../../', import.meta.url)
const CLAUDE = readFileSync(new URL('CLAUDE.md', AKAR), 'utf8')

const RITEL = (RETAIL as unknown[]).length
const POKOK = (USDA as unknown[]).length
const GZIP_KB = Math.round(
  gzipSync(readFileSync(new URL('./food-retail.js', import.meta.url))).length / 1024
)

describe('angka katalog makanan di CLAUDE.md harus cocok dengan datanya', () => {
  it('jumlah produk ritel disebut, dan angkanya benar', () => {
    // Dicari sebagai angka utuh supaya "1758" tidak lolos sebagai "758".
    const cocok = new RegExp('(^|[^0-9])' + RITEL + '([^0-9]|$)').test(CLAUDE)
    expect(
      cocok,
      'CLAUDE.md tidak menyebut ' + RITEL + ' produk ritel. Angka yang ada di sana sudah basi — '
      + 'perbarui, jangan biarkan sesi berikutnya menghitung dari angka yang salah.'
    ).toBe(true)
  })

  it('tidak ada jumlah produk LAIN yang tertinggal di sekitar kata "produk ritel"', () => {
    // Penjaga di atas cuma membuktikan angka yang BENAR ada; ini yang membuktikan angka yang
    // SALAH tidak ikut tinggal. Tanpa ini, "759 produk ritel" dan "758" bisa hidup bersama.
    const salah: string[] = []
    for (const m of CLAUDE.matchAll(/(\d{3,4})\s+produk ritel/g)) {
      if (Number(m[1]) !== RITEL) salah.push(m[0])
    }
    expect(salah, 'jumlah produk ritel yang basi masih tertulis').toEqual([])
  })

  it('jumlah bahan pokok disebut, dan angkanya benar', () => {
    const cocok = new RegExp('(^|[^0-9])' + POKOK + '([^0-9]|$)').test(CLAUDE)
    expect(cocok, 'CLAUDE.md tidak menyebut ' + POKOK + ' bahan pokok').toBe(true)
  })

  it('ukuran chunk yang disebut masih dalam 3 KB dari kenyataan', () => {
    const m = CLAUDE.match(/\((\d+(?:,\d+)?)\s*KB gzip/)
    expect(m, 'CLAUDE.md tidak menyebut ukuran chunk katalog').toBeTruthy()
    const ditulis = Number((m as RegExpMatchArray)[1]!.replace(',', '.'))
    expect(
      Math.abs(ditulis - GZIP_KB),
      'CLAUDE.md menulis ' + ditulis + ' KB, kenyataannya ' + GZIP_KB + ' KB'
    ).toBeLessThanOrEqual(3)
  })

  it('TIDAK menyebut jumlah test case sebagai angka mati', () => {
    /**
     * "983 test case" pernah tertulis di `## Perintah`, dan dia basi begitu satu tes ditambahkan —
     * artinya dia dijamin salah. Angka yang tidak bisa dirawat lebih buruk daripada tidak ada
     * angka: dia mengajari orang bahwa dokumennya bisa dipercaya, lalu salah.
     *
     * Yang dijaga di sini bentuknya, bukan nilainya — karena nilai apa pun akan salah besok.
     */
    const m = CLAUDE.match(/vitest[^\n]*?(\d{3,5})\s*test case/)
    expect(
      m ? m[0] : null,
      'Jangan tulis jumlah test case di CLAUDE.md — dia basi setiap kali satu tes ditambahkan. '
      + 'Kalau butuh angkanya, jalankan `npm test`.'
    ).toBeNull()
  })
})

describe('aturan a11y baris daftar tercatat di CLAUDE.md', () => {
  /**
   * Aturan arsitektur yang tidak tertulis akan dibatalkan sesi berikutnya, dan yang ini sangat
   * mudah dibatalkan tanpa sadar: `<div className="item" onClick>` terlihat wajar sepenuhnya.
   */
  it('menyebut bahwa baris `.item` yang bisa diketuk harus <button>', () => {
    // Dicocokkan ke KALIMAT ATURANNYA, bukan ke judulnya: judul bisa diubah orang tanpa mengubah
    // aturannya, dan sebaliknya. Yang harus ada adalah `.item` dan `<button>` dalam satu baris —
    // itu yang membuat aturannya terbaca sebagai aturan, bukan sebagai cerita.
    const adaAturan = CLAUDE.split('\n')
      .some(l => l.includes('`.item`') && l.includes('<button>'))
    expect(
      adaAturan,
      'CLAUDE.md tidak menyatakan bahwa baris `.item` yang bisa diketuk harus <button>. '
      + 'Aturan arsitektur yang tidak tertulis akan dibatalkan sesi berikutnya, dan yang ini '
      + 'sangat mudah dibatalkan tanpa sadar: <div className="item" onClick> terlihat wajar.'
    ).toBe(true)
    expect(CLAUDE, 'pola dua-aksi (.imain) harus disebut').toContain('imain')
  })

  it('menyebut bahwa --label-3 sudah dinaikkan dan jangan diturunkan', () => {
    expect(CLAUDE).toContain('--label-3')
    expect(CLAUDE).toMatch(/2,65:1|4,5:1/)
  })
})
