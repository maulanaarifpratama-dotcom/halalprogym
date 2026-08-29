import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Tes yang bergantung pada JAM DINDING SUNGGUHAN, dan kenapa itu punya penjaganya sendiri.
 *
 * `Workout.test.jsx` hijau berbulan-bulan lalu merah tanpa satu baris kode berubah: hijau jam
 * 15:11, merah jam 15:17, dan Asar hari itu tepat 15:17. Sebabnya `Workout.jsx` merender
 * `<PrayerPause />`, komponen itu membaca `new Date()` dan memanggil `stopRest()` begitu satu
 * waktu salat masuk — perilaku produksi yang benar, dan assertion "stopRest tidak dipanggil" yang
 * jadi salah lima kali sehari.
 *
 * Ini kelas kegagalan yang paling mahal di repo ini, karena bentuknya adalah CI merah tanpa sebab
 * yang bisa direproduksi: orang menekan "re-run", hijau, dan pelajarannya hilang. Config vitest
 * sudah menaikkan `testTimeout` justru untuk menghindari flake; flake dari jam dinding lebih buruk
 * daripada flake dari beban, karena dia tidak pernah terlihat di mesin yang mengujinya jam 10.
 *
 * Jadi aturannya dipaku di sini, bukan dititipkan pada ingatan: **setiap tes yang merender
 * `Workout` harus mematikan `PrayerPause`.** Kalau nanti komponen lain juga membaca jam dan
 * memicu efek, tambahkan dia ke daftar — daftar ini tempat yang benar untuk pertanyaan
 * "komponen mana yang tidak boleh hidup di dalam tes".
 */

/** Komponen yang membaca jam sungguhan DAN memicu efek, jadi tidak boleh hidup di dalam tes. */
const JAM_DINDING = [
  {
    modul: 'PrayerPause.jsx',
    dirender: 'Workout.jsx',
    kenapa: 'memanggil stopRest() saat waktu salat masuk',
  },
]

const VIEWS = new URL('../views/', import.meta.url)

const berkasTes = (): string[] =>
  readdirSync(VIEWS).filter(f => /\.test\.(jsx?|tsx?)$/.test(f))

// `fileURLToPath`, BUKAN `.pathname.slice(1)`. Versi pertama memakai yang kedua dan itu cuma
// benar di Windows: di sana pathname `/C:/…` jadi `C:/…` yang absolut. Di Linux pathname
// `/home/…` jadi `home/…` — RELATIF, dan berkasnya tidak pernah ketemu. CI merah, mesin
// pengembang hijau. `fileURLToPath` menangani keduanya, dan itu memang gunanya.
const DIR = fileURLToPath(VIEWS)
const baca = (f: string): string => readFileSync(join(DIR, f), 'utf8')

describe('tes tidak boleh bergantung pada jam dinding', () => {
  it('ada berkas tes view yang dipindai — penjaga yang tidak memindai apa pun bukan penjaga', () => {
    // Tanpa ini, glob yang rusak membuat seluruh berkas ini hijau selamanya tanpa memeriksa
    // apa pun. Itu tepat kegagalan yang sudah pernah terjadi di repo ini dengan Stats.test.js.
    expect(berkasTes().length).toBeGreaterThan(2)
  })

  for (const { modul, dirender, kenapa } of JAM_DINDING) {
    it(`setiap tes yang merender ${dirender} mematikan ${modul} (${kenapa})`, () => {
      const rentan: string[] = []
      for (const f of berkasTes()) {
        const src = baca(f)
        const merender = src.includes(`./${dirender}`) || src.includes(`../views/${dirender}`)
        if (!merender) continue
        if (!src.includes(modul)) rentan.push(f)
      }
      expect(
        rentan,
        `Berkas ini merender ${dirender} tanpa mematikan ${modul}. Komponen itu ${kenapa}, `
        + 'jadi tesnya akan merah lima kali sehari. Tambahkan:\n'
        + `  vi.mock('../components/${modul}', () => ({ default: () => null }))`
      ).toEqual([])
    })
  }
})

/**
 * Kelas kedua yang berkas ini jaga: PATH YANG CUMA BENAR DI SATU SISTEM OPERASI.
 *
 * `new URL(...).pathname` mengembalikan `/C:/Users/…` di Windows dan `/home/runner/…` di Linux.
 * Trik `.slice(1)` membuat yang pertama absolut dan yang kedua RELATIF — jadi berkasnya ketemu di
 * mesin pengembang dan hilang di CI. Itu persis bentuk kegagalan yang paling mahal di repo ini:
 * gate lokal hijau, CI merah, dan tidak ada yang membaca lognya.
 *
 * `fileURLToPath` menangani keduanya, dan itu memang gunanya.
 */
/**
 * Membuang komentar dan literal string, supaya penjaga di bawah tidak menandai penjelasannya
 * sendiri maupun pesan assertion-nya sendiri. Penjaga yang selalu merah karena dirinya sendiri
 * akan dimatikan orang, bukan diperbaiki.
 */
function tanpaKomentarDanString(src: string): string {
  let out = ''
  let i = 0
  let mode: 'kode' | 'baris' | 'blok' | 'str' = 'kode'
  let kutip = ''
  while (i < src.length) {
    const c = src[i] as string
    const n = src[i + 1]
    if (mode === 'kode') {
      if (c === '/' && n === '/') { mode = 'baris'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'blok'; i += 2; continue }
      if (c === '"' || c === "'" || c === '`') { mode = 'str'; kutip = c; i++; continue }
      out += c; i++; continue
    }
    if (mode === 'baris') { if (c === '\n') { mode = 'kode'; out += c } i++; continue }
    if (mode === 'blok') { if (c === '*' && n === '/') { mode = 'kode'; i += 2 } else i++; continue }
    if (c === '\\') { i += 2; continue }
    if (c === kutip) mode = 'kode'
    i++
  }
  return out
}

const namaBerkas = (p: string): string => p.split(/[\\/]/).pop() as string

const SEMUA_TES = new URL('../../src/', import.meta.url)

const kumpulkan = (dir: URL): string[] => {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...kumpulkan(new URL(e.name + '/', dir)))
    else if (/\.test\.(jsx?|tsx?)$/.test(e.name)) out.push(fileURLToPath(new URL(e.name, dir)))
  }
  return out
}

describe('path di tes harus lintas-platform', () => {
  it('ada berkas tes yang dipindai', () => {
    expect(kumpulkan(SEMUA_TES).length).toBeGreaterThan(30)
  })

  it('tidak ada `.pathname` yang dipakai sebagai path berkas', () => {
    // Komentar DAN string literal dibuang lebih dulu. Tanpa itu penjaga ini menandai
    // penjelasannya sendiri dan pesan assertion-nya sendiri — dan penjaga yang selalu merah
    // karena dirinya sendiri akan dimatikan orang, bukan diperbaiki.
    //
    // Dikecualikan secara alami: `locale-orphans.test.ts` memakai `.pathname` DENGAN normalisasi
    // drive letter yang eksplisit, dan itu benar di kedua sistem. Yang dilarang bentuk
    // `.slice(` setelahnya.
    const salah: string[] = []
    for (const f of kumpulkan(SEMUA_TES)) {
      const kode = tanpaKomentarDanString(readFileSync(f, 'utf8'))
      if (/\.pathname\s*\.\s*slice\s*\(/.test(kode)) salah.push(namaBerkas(f))
    }
    expect(
      salah,
      'pakai fileURLToPath(url) untuk path berkas — pathname.slice(1) relatif di Linux'
    ).toEqual([])
  })
})

/**
 * KELAS KETIGA: ANGGARAN JAM DINDING DI DALAM ASSERTION.
 *
 * `expect(Date.now() - mulai).toBeLessThan(3000)` terlihat seperti tes performa, tapi yang dia
 * ukur adalah BEBAN MESIN, bukan kode. Satu tes di `ramadan-bands.test.ts` berbentuk begitu:
 * hijau 816 ms saat berkasnya sendirian, merah 10.893 ms di suite penuh dengan worker paralel.
 * Tidak ada satu baris kode yang berubah di antaranya.
 *
 * Akibatnya identik dengan flake waktu salat yang melahirkan berkas ini: CI merah tanpa sebab
 * yang bisa direproduksi, orang menekan re-run, hijau, pelajarannya hilang. Dan lebih buruk,
 * karena "tes performa" terdengar seperti tes yang berharga, jadi tidak ada yang mencurigainya.
 *
 * Yang benar adalah menghitung KERJA, bukan waktu: `ramadan-bands.linear.test.ts` menghitung
 * panggilan `toHijri` per hari lewat `vi.mock`. Hitungan itu milik kode, dan mesin yang sibuk
 * tidak mengubahnya.
 */
describe('tes tidak boleh memakai anggaran jam dinding', () => {
  // Bentuk yang dilarang: hasil pengurangan dua pembacaan jam dibandingkan dengan ambang.
  const ANGGARAN = /expect\s*\(\s*(?:Date|performance)\s*\.\s*now\s*\(\s*\)\s*-[^)]*\)\s*\.\s*toBe(?:Less|Greater)Than/

  it('ada berkas tes yang dipindai', () => {
    expect(kumpulkan(SEMUA_TES).length).toBeGreaterThan(30)
  })

  it('tidak ada assertion yang membandingkan durasi jam dinding dengan ambang', () => {
    // Komentar dan literal string dibuang lebih dulu — penjelasan di atas menyebut bentuknya,
    // dan penjaga yang menandai dokumentasinya sendiri akan dimatikan orang.
    const salah: string[] = []
    for (const f of kumpulkan(SEMUA_TES)) {
      const kode = tanpaKomentarDanString(readFileSync(f, 'utf8'))
      if (ANGGARAN.test(kode)) salah.push(namaBerkas(f))
    }
    expect(
      salah,
      'Hitung KERJA, bukan waktu. Bungkus fungsi mahalnya dengan vi.mock dan hitung panggilannya '
      + '— lihat ramadan-bands.linear.test.ts. Ambang milidetik mengukur beban mesin, dan akan '
      + 'merah di CI tanpa satu baris kode berubah.'
    ).toEqual([])
  })
})
