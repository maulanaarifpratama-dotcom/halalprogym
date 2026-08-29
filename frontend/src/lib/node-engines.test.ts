import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * `engines.node` hidup di DUA package.json, dan tidak ada yang menjaganya sampai berkas ini.
 *
 * Kenapa dua: Vercel membaca `package.json` dari **Root Directory**, dan Root Directory itu
 * setelan dasbor yang tidak terlihat dari dalam repo. Yang di akar melayani Root Directory = akar
 * (yang dipakai `vercel.json`), yang di `frontend/` melayani Root Directory = `frontend`. Kalau
 * keduanya menyimpang, Vercel memilih Node dari salah satunya dan TIDAK ADA yang memberi tahu
 * yang mana — persis kelas kegagalan yang sudah dua kali terjadi di repo ini dengan
 * `applicationId` Android dan commit free-exercise-db.
 *
 * KENAPA ANGKANYA PENTING, DAN KENAPA "22" SAJA SALAH
 *
 * Vercel memetakan range terbuka ke versi TERTINGGI yang cocok, bukan terendah: dokumentasinya
 * menyatakan `>=20.0.0` mendarat di **24.x**. Jadi `>=22.12.0` di sini berarti produksi dibangun
 * di Node **24**, bukan 22 — sementara gate lokal dan job `verify` memakai 22. Job `deploy-build`
 * di CI karena itu menjalankan matriks [22, 24]; sebelum itu dia membuktikan versi yang bukan
 * versi produksi, padahal seluruh alasan keberadaannya justru itu.
 *
 * Angka bawahnya bukan selera: Vite 8 menuntut `^20.19.0 || >=22.12.0`, dan repo ini tidak punya
 * `engines` sama sekali sampai Vercel gagal di Node lama sementara CI hijau karena CI menyebut
 * versinya eksplisit.
 */

const baca = (rel: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))

const AKAR = baca('../../../package.json') as { engines?: { node?: string } }
const FRONTEND = baca('../../package.json') as { engines?: { node?: string } }

/** Major Node yang benar-benar disediakan Vercel. Kalau tidak ada yang cocok, tidak ada yang bisa dipilih. */
const MAJOR_VERCEL = [20, 22, 24]

describe('engines.node — satu nilai, dua berkas', () => {
  it('keduanya menyatakannya', () => {
    expect(AKAR.engines?.node, 'package.json akar ada HANYA untuk baris ini').toBeTruthy()
    expect(FRONTEND.engines?.node).toBeTruthy()
  })

  it('nilainya identik', () => {
    // Yang menyimpang tidak akan terlihat dari salah satu berkas, cuma dari deploy yang gagal.
    expect(FRONTEND.engines?.node).toBe(AKAR.engines?.node)
  })

  it('bentuknya range terbuka dengan lantai yang eksplisit', () => {
    expect(AKAR.engines?.node).toMatch(/^>=\d+\.\d+\.\d+$/)
  })

  it('lantainya memenuhi syarat Vite yang terpasang', () => {
    // Dibaca dari Vite yang BENAR-BENAR terpasang, bukan dari angka yang dihafal di komentar.
    // Kalau Vite naik syaratnya, tes ini yang memberi tahu — bukan Vercel.
    const vite = baca('../../node_modules/vite/package.json') as { engines?: { node?: string } }
    const syarat = vite.engines?.node ?? ''
    expect(syarat, 'Vite tidak menyatakan engines — periksa ulang asumsi berkas ini').toBeTruthy()

    // Bentuk syarat Vite: `^20.19.0 || >=22.12.0`. Ambil batas bawah cabang yang ber->=.
    const cabang = syarat.split('||').map(s => s.trim())
    const terbuka = cabang.find(c => c.startsWith('>='))
    expect(terbuka, 'bentuk engines Vite berubah — periksa manual: ' + syarat).toBeTruthy()

    const angka = (s: string): number[] => (s.match(/(\d+)\.(\d+)\.(\d+)/) as RegExpMatchArray).slice(1, 4).map(Number)
    const kita = angka(AKAR.engines?.node as string)
    const vitePunya = angka(terbuka as string)

    const lebihTinggiAtauSama =
      kita[0]! > vitePunya[0]! ||
      (kita[0] === vitePunya[0] && (kita[1]! > vitePunya[1]! ||
        (kita[1] === vitePunya[1] && kita[2]! >= vitePunya[2]!)))

    expect(
      lebihTinggiAtauSama,
      'engines.node (' + AKAR.engines?.node + ') lebih rendah dari syarat Vite (' + syarat + ') — '
      + 'Node yang lolos npm bisa gagal di dalam Vite, jauh dari pesan yang menjelaskan sebabnya'
    ).toBe(true)
  })

  it('setidaknya satu major Vercel memenuhi range-nya', () => {
    // Kalau tidak ada, Vercel tidak punya apa pun untuk dipilih dan deploy ditolak sebelum build.
    const kita = (AKAR.engines?.node as string).match(/^>=(\d+)\./) as RegExpMatchArray
    const lantaiMajor = Number(kita[1])
    const cocok = MAJOR_VERCEL.filter(m => m >= lantaiMajor)
    expect(
      cocok,
      'tidak ada Node yang disediakan Vercel (' + MAJOR_VERCEL.join(', ') + ') yang memenuhi '
      + AKAR.engines?.node
    ).not.toEqual([])
  })

  it('CI menguji major yang benar-benar dipilih Vercel, yaitu yang TERTINGGI', () => {
    // Vercel memetakan range terbuka ke versi tertinggi yang cocok. Jadi job yang membuktikan
    // perintah produksi harus menjalankan major itu, bukan major terendah yang kebetulan lolos.
    const wf = readFileSync(new URL('../../../.github/workflows/test.yml', import.meta.url), 'utf8')
    const lantaiMajor = Number(((AKAR.engines?.node as string).match(/^>=(\d+)\./) as RegExpMatchArray)[1])
    const dipilihVercel = Math.max(...MAJOR_VERCEL.filter(m => m >= lantaiMajor))
    expect(
      wf.includes('node: [') && new RegExp('node: \\[[^\\]]*\\b' + dipilihVercel + '\\b').test(wf),
      'deploy-build harus memuat Node ' + dipilihVercel + ' di matriksnya — itu yang dipakai Vercel'
    ).toBe(true)
  })
})
