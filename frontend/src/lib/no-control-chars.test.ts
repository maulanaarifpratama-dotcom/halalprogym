import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * KARAKTER KONTROL LITERAL DI DALAM SUMBER — dan kenapa ini bukan soal kerapian.
 *
 * Dua regex di `scripts/build-food-retail.mjs` sempat ter-commit dengan **byte BACKSPACE (0x08)**
 * di tempat yang seharusnya `\\b`:
 *
 *     /<BS>ale[-\\s]?ale<BS>/i                     -> pengecualian "Ale Ale" tidak pernah cocok
 *     /<BS>\\d+(?:\\.\\d+)?\\s*(ml|l|liter)<BS>/   -> deteksi cair dari `quantity` jadi kode mati
 *
 * Sebabnya heredoc bash: `\\b` di dalam heredoc yang tidak dikutip diinterpretasi jadi 0x08.
 *
 * Yang membuat kelas ini mahal: **editor menampilkannya seperti `\\b`.** Kodenya terbaca benar,
 * `node --check` lolos, typecheck lolos, tesnya hijau — dan regexnya tidak akan pernah cocok
 * dengan apa pun. Ketemu cuma karena `cat -A` dijalankan atas satu baris yang dicurigai.
 *
 * Jadi yang dijaga di sini bukan gaya penulisan, tapi satu kelas kegagalan yang tidak terlihat
 * dari membaca kode maupun dari menjalankan gate. Nol toleransi.
 *
 * Tab (0x09), newline (0x0a), dan carriage return (0x0d) TIDAK dilarang — ketiganya karakter
 * teks yang sah di berkas sumber.
 */

const DIR = new URL('../', import.meta.url)

/**
 * Karakter kontrol yang dilarang: 0x00–0x08, 0x0b, 0x0c, 0x0e–0x1f.
 * Tab (0x09), LF (0x0a), dan CR (0x0d) sengaja dikecualikan — ketiganya sah di berkas teks.
 *
 * Dibangun dari KODE ANGKA, bukan dari kelas karakter literal maupun escape `\u0008`. Dua sebab,
 * dan yang pertama sudah terjadi: kelas literal membuat berkas ini memuat karakter yang dia
 * larang, jadi dia menandai DIRINYA SENDIRI — dan penjaga yang selalu merah karena dirinya akan
 * dimatikan orang, bukan diperbaiki. Yang kedua: bentuk angka tidak bisa rusak lagi oleh heredoc,
 * yang justru kelas kegagalan yang berkas ini jaga.
 */
const DILARANG: number[] = [
  ...Array.from({ length: 9 }, (_, i) => i), // 0x00–0x08
  0x0b, 0x0c,
  ...Array.from({ length: 18 }, (_, i) => 0x0e + i), // 0x0e–0x1f
]
const SET_DILARANG = new Set(DILARANG)

const adaKontrol = (teks: string): boolean => {
  for (let i = 0; i < teks.length; i++) {
    if (SET_DILARANG.has(teks.charCodeAt(i))) return true
  }
  return false
}

const kodeKontrol = (teks: string): string =>
  [...teks]
    .filter(c => SET_DILARANG.has(c.charCodeAt(0)))
    .map(c => '0x' + c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(',')

const EKSTENSI = /\.(js|jsx|ts|tsx|mjs|cjs|css|json|md|yml|yaml|html)$/

const kumpulkan = (dir: URL): string[] => {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    // `assets/` di android memuat bundel hasil build yang di-minify; dia bukan sumber, dan
    // minifier memang boleh menaruh karakter kontrol di dalam literal string.
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'assets', 'food-cache', 'media-cache'].includes(e.name)) continue
      out.push(...kumpulkan(new URL(e.name + '/', dir)))
    } else if (EKSTENSI.test(e.name)) {
      out.push(fileURLToPath(new URL(e.name, dir)))
    }
  }
  return out
}

describe('sumber tidak boleh memuat karakter kontrol literal', () => {
  const BERKAS = kumpulkan(DIR)

  it('ada berkas yang dipindai — penjaga yang tidak memindai apa pun bukan penjaga', () => {
    expect(BERKAS.length).toBeGreaterThan(50)
  })

  it('nol karakter kontrol di seluruh src/', () => {
    const salah: string[] = []
    for (const f of BERKAS) {
      const s = readFileSync(f, 'utf8')
      if (!adaKontrol(s)) continue
      s.split('\n').forEach((l, i) => {
        if (!adaKontrol(l)) return
        const kode = kodeKontrol(l)
        salah.push(f.split(/[\\/]/).slice(-2).join('/') + ':' + (i + 1) + ' [' + kode + ']')
      })
    }
    expect(
      salah,
      'Karakter kontrol literal di sumber. Yang paling sering: `\\b` di dalam heredoc bash yang '
      + 'jadi byte BACKSPACE 0x08 — regexnya lalu tidak pernah cocok, dan editor tetap '
      + 'menampilkannya seperti `\\b`. Tulis berkas seperti ini lewat tool Write, bukan heredoc.'
    ).toEqual([])
  })

  it('nol karakter kontrol di scripts/ — di situlah kejadiannya', () => {
    const salah: string[] = []
    for (const f of kumpulkan(new URL('../../scripts/', import.meta.url))) {
      const s = readFileSync(f, 'utf8')
      if (adaKontrol(s)) salah.push(f.split(/[\\/]/).pop() as string)
    }
    expect(salah, 'karakter kontrol di skrip build').toEqual([])
  })
})
