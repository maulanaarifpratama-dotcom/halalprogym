import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Teks Indonesia yang TIDAK PERNAH lewat `t()` — titik buta yang tidak ditutup checker mana pun.
 *
 * KENAPA INI ADA
 *
 * `PrayerCard.jsx` menuliskan hitungan mundur sebagai `` `${h} jam ${m} mnt` `` — langsung di
 * template, tanpa `t()`. Akibatnya UI Mandarin menampilkan **"Magrib 1 jam 53 mnt"**, dan begitu
 * juga kedua belas bahasa lain. Ditemukan dengan mengganti bahasa app ke Mandarin dan MEMBACA
 * layarnya, bukan dari gate mana pun.
 *
 * Keempat checker yang ada tidak bisa melihat ini, dan alasannya sama untuk ketiganya yang
 * relevan: mereka semua bekerja dari `t()`. `check:locales` membandingkan pack lawan pack.
 * `check:locale-keys` mencari kunci yang dipakai `t()` tapi tidak ada di pack. Keduanya buta
 * terhadap teks yang **tidak pernah mengaku sebagai teks yang perlu diterjemahkan**.
 *
 * Ini kelas yang sama dengan `full body` yang tampil Inggris di 13 bahasa selama berbulan-bulan:
 * salah dengan cara yang cuma terlihat oleh orang yang membaca bahasanya, dan pengembangnya
 * hampir selalu memakai satu bahasa.
 *
 * PATOKANNYA NOL, dan itu terukur — setelah `PrayerCard` diperbaiki, tidak ada satu pun sisa.
 * Jadi daftar ini tidak perlu pengecualian, dan setiap kenaikan dari nol adalah temuan.
 */

/**
 * Kata Indonesia yang tidak punya alasan muncul di literal string kode.
 *
 * Dipilih yang **tidak juga kata Inggris** dan tidak dipakai sebagai pengenal teknis. "menit"
 * dan "mnt" ada karena itu bug aslinya; kata fungsi ("dan", "atau", "yang", "untuk") ada karena
 * satu saja di antaranya cukup untuk menandai kalimat Indonesia yang bocor ke UI.
 */
const KATA_INDONESIA = [
  'jam', 'mnt', 'menit', 'detik', 'hari', 'minggu', 'bulan', 'tahun', 'kemarin', 'besok',
  'dan', 'atau', 'tidak', 'sudah', 'belum', 'yang', 'untuk', 'dengan', 'tanpa', 'kamu',
  'lalu', 'saat', 'kalau', 'bisa', 'akan', 'ada', 'juga',
]

/**
 * Membuang komentar `//` dan `/* *\/` tanpa merusak isi string.
 *
 * Ini bagian yang menentukan apakah penjaga ini berguna atau tidak: seluruh dokumentasi di repo
 * ini berbahasa Indonesia, jadi memindai berkas mentah akan menghasilkan ratusan temuan palsu
 * dan penjaga yang dimatikan orang di hari pertama.
 */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  let mode: 'code' | 'line' | 'block' | 'str' = 'code'
  let quote = ''
  while (i < src.length) {
    const c = src[i] as string
    const n = src[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === '"' || c === "'" || c === '`') { mode = 'str'; quote = c; out += c; i++; continue }
      out += c; i++; continue
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c } i++; continue }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2 } else i++; continue }
    if (c === '\\') { out += c + (n || ''); i += 2; continue }
    out += c
    if (c === quote) mode = 'code'
    i++
  }
  return out
}

/**
 * Lapis yang benar-benar MERENDER teks. `src/lib` sengaja TIDAK dipindai, dan itu keputusan
 * bukan kelonggaran: dua isi Indonesia di sana keduanya sah dan keduanya bukan UI.
 *
 *   · `ai-nutrition.ts` — PROMPT untuk model. Dia memang harus Indonesia; itu yang membuat
 *     jawabannya menyebut "nasi uduk" alih-alih "coconut milk rice".
 *   · `sync.ts` — string `why` dari `decideSync`, alasan diagnostik yang dipakai tes dan
 *     penelusuran. Diperiksa ke pemanggilnya di `useStore.js`: dia TIDAK PERNAH ditampilkan.
 *
 * Memasukkan `lib/` berarti daftar pengecualian, dan daftar pengecualian membusuk. Yang dijaga
 * di sini tempat teks yang dilihat orang tinggal.
 */
const DIRS = ['src/components', 'src/views', 'src/store']

function sumberYangDipindai(): string[] {
  const files: string[] = []
  for (const dir of DIRS) {
    for (const f of readdirSync(dir)) {
      if (!/\.(jsx?|tsx?)$/.test(f)) continue
      if (f.includes('.test.')) continue
      files.push(join(dir, f))
    }
  }
  return files
}

const RX_LITERAL = /(['"`])((?:[^\\\n]|\\.)*?)\1/g

interface Temuan { berkas: string; isi: string; kata: string[] }

function pindai(): Temuan[] {
  const hasil: Temuan[] = []
  for (const berkas of sumberYangDipindai()) {
    const bersih = stripComments(readFileSync(berkas, 'utf8'))
    for (const m of bersih.matchAll(RX_LITERAL)) {
      const isi = m[2] as string
      if (isi.length < 3) continue
      const kata = isi.toLowerCase().split(/[^a-z]+/).filter(Boolean)
      const cocok = KATA_INDONESIA.filter(k => kata.includes(k))
      if (cocok.length) hasil.push({ berkas, isi: isi.slice(0, 80), kata: cocok })
    }
  }
  return hasil
}

describe('tidak ada teks Indonesia di luar t()', () => {
  it('ada berkas yang benar-benar dipindai', () => {
    // Penjaga yang tidak memindai apa pun bukan penjaga — itu persis kegagalan Stats.test.js,
    // yang hijau berbulan-bulan di atas simbol yang tidak ada.
    expect(sumberYangDipindai().length).toBeGreaterThan(20)
  })

  it('komentar Indonesia TIDAK dihitung — kalau tidak, penjaganya tidak berguna', () => {
    // Seluruh dokumentasi repo ini berbahasa Indonesia. Kalau stripComments salah, temuan
    // palsunya ratusan dan penjaga ini dimatikan orang di hari pertama.
    const contoh = 'const a = 1 // ini komentar yang panjang dan berbahasa Indonesia\n'
      + 'const b = `sudah`\n'
    const bersih = stripComments(contoh)
    expect(bersih).not.toContain('komentar')
    expect(bersih).toContain('sudah')
  })

  it('stripComments tidak merusak isi string yang MENGANDUNG // atau /*', () => {
    const contoh = "const u = 'https://contoh.id/a'\nconst v = '/* bukan komentar */'\n"
    const bersih = stripComments(contoh)
    expect(bersih).toContain('https://contoh.id/a')
    expect(bersih).toContain('bukan komentar')
  })

  it('nol literal berbahasa Indonesia di seluruh sumber', () => {
    const temuan = pindai()
    expect(
      temuan.map(t => t.berkas + ' :: ' + JSON.stringify(t.isi) + ' [' + t.kata.join(',') + ']'),
      'Teks Indonesia di literal string berarti dia TIDAK lewat t(), dan akan tampil sama di\n'
      + 'ke-13 bahasa. Bungkus dengan t() lalu sebar kuncinya ke seluruh pack.'
    ).toEqual([])
  })
})
