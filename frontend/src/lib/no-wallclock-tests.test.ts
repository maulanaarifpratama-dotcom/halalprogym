import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

const baca = (f: string): string => readFileSync(join(VIEWS.pathname.slice(1), f), 'utf8')

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
