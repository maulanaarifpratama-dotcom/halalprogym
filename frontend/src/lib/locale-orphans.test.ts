import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { BODYPARTS, CATALOGUE } from './exercises.js'
import { DAYN, DAYS, MONTHS, MONTHS_LONG } from './format.js'
import { MUSCLE_NAME } from './muscles.js'

/**
 * Kunci terjemahan yang tidak dipakai apa pun lagi.
 *
 * KENAPA INI ADA. `scripts/check-locales.mjs` membandingkan pack lawan pack, jadi kunci yang
 * mati di ke-13 pack sekaligus tetap "sinkron" dan dia melaporkan hijau. Itu bukan kasus
 * teoretis: mencabut lapis auth upstream (passkey, self-host, pairing, dasbor admin, web push)
 * meninggalkan puluhan kunci menggantung, dan tidak satu checker pun bersuara.
 *
 * KENAPA TES, BUKAN SKRIP di scripts/: berkas ini mengimpor `muscles.ts`, yang mengimpor
 * `./workout-model.js`. Node biasa tidak bisa me-resolve `.js` ke `.ts` — itu fitur bundler,
 * bukan Node. Vitest me-resolve-nya, dan bonusnya guard ini ikut jalan di setiap `npm test`.
 */
const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const LOCALES = join(SRC, 'locales')

/**
 * GABUNGAN kunci dari SEMUA pack, bukan satu pack rujukan.
 *
 * Percobaan pertama saya cuma mengaudit de.js, dan titik butanya langsung kena: 12 kunci build
 * demo cuma dibawa id.js (lihat UPSTREAM_GAP di scripts/check-locales.mjs), jadi empat di
 * antaranya sudah mati sementara tesnya melaporkan hijau. Kalau tes ini ada untuk menangkap
 * kunci yang ditinggalkan, dia harus melihat setiap pack.
 */
async function allPackKeys(): Promise<string[]> {
  const out = new Set<string>()
  for (const f of readdirSync(LOCALES).filter(x => x.endsWith('.js'))) {
    const mod = await import(/* @vite-ignore */ '../locales/' + f)
    for (const k of Object.keys(mod.default)) out.add(k)
  }
  return [...out].sort()
}

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = join(d, e.name)
  if (e.isDirectory()) return e.name === 'locales' ? [] : walk(p)
  if (!/\.(jsx?|tsx?)$/.test(e.name) || e.name.includes('.test.')) return []
  return [p]
})

/**
 * Buang komentar, supaya contoh yang ditulis di dalam komentar tidak diam-diam menghidupkan
 * kunci yang sudah mati. String literal dilewati utuh agar `//` di dalam URL tidak dianggap
 * awal komentar.
 */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i)
      if (e < 0) break
      i = e
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i)
      i = e < 0 ? src.length : e + 2
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
      out += src.slice(i, j + 1)
      i = j + 1
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * Apakah kunci ini muncul sebagai literal berkutip di kode?
 *
 * PENCARIAN SUBSTRING, bukan parsing. Tiga percobaan parsing gagal sebelum ini, dan yang
 * terakhir gagal paling halus:
 *
 *   1. `t\(\s*'...'` — cuma argumen pertama yang langsung berupa kutip. Melewatkan
 *      `t(cond ? 'a' : 'b')`.
 *   2. Semua literal di dalam span `t(...)` — melewatkan kalimat yang hidup di TABEL
 *      (`MODE_NAME` di progression.ts, tabel RIR/RPE di Settings.jsx) lalu diterjemahkan
 *      lewat `t(variabel)`.
 *   3. Semua literal di berkas — TEMPLATE LITERAL BERSARANG salah ditutup. plan-share.js
 *      menulis `${rows || `<div>${esc(t('No exercises yet.'))}</div>`}`, dan backtick dalam
 *      mengakhiri span luar lebih awal, jadi tiga kunci yang hidup dituduh mati.
 *
 * Substring tidak punya keadaan untuk salah dilacak. Yang dicari cuma: apakah teks kuncinya
 * ada di sumber, dikelilingi kutip. Itu tetap membuktikan hal yang dibutuhkan — kunci yang
 * teksnya tidak muncul sama sekali mustahil diminta `t()`.
 */
const quotedForms = (key: string): string[] => [
  "'" + key.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'",
  '"' + key.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"',
  // Di dalam template literal kuncinya muncul apa adanya di antara kutip biasa; kedua bentuk
  // di atas sudah menutupinya. Yang ini untuk kunci yang dipakai sebagai kunci objek tanpa
  // kutip tidak mungkin — teks kunci di sini selalu berisi spasi atau tanda baca.
]

function accountedFor(sources: string, packKeys: string[]): Set<string> {
  const out = new Set<string>()

  for (const key of packKeys) {
    if (quotedForms(key).some(form => sources.includes(form))) out.add(key)
  }

  // Nilai katalog datang dari exercises-data.js — data ter-generate, bukan literal di kode
  // aplikasi. Dipanggil t(e.bp), t(e.tg), t(e.eq), t(b) di chip filter.
  for (const b of BODYPARTS) out.add(b)
  for (const e of CATALOGUE as unknown as Array<Record<string, unknown>>) {
    for (const k of ['bp', 'tg', 'eq', 'mg']) {
      const v = e[k]
      if (typeof v === 'string' && v) out.add(v)
    }
    for (const k of ['sm', 'primaries', 'secondaries']) {
      const arr = e[k]
      if (Array.isArray(arr)) for (const m of arr) if (typeof m === 'string') out.add(m)
    }
  }

  // Tabel kalender dan label diagram otot.
  for (const arr of [DAYN, DAYS, MONTHS, MONTHS_LONG]) for (const v of arr) out.add(v)
  for (const v of Object.values(MUSCLE_NAME as Record<string, string>)) if (v) out.add(v)

  return out
}

// Top-level await: `describe` menerima callback biasa, jadi pemuatan pack harus selesai
// sebelum blok tesnya dibangun.
const sources = walk(SRC).map(f => stripComments(readFileSync(f, 'utf8'))).join('\n')
const packKeys = await allPackKeys()
const known = accountedFor(sources, packKeys)
const unaccounted = packKeys.filter(k => !known.has(k))

describe('kunci terjemahan yang tidak terjelaskan', () => {

  it('tidak ada kunci terjemahan yang teksnya tidak muncul di kode sama sekali', () => {
    expect(
      unaccounted,
      'Kunci ini ada di locale pack tapi teksnya tidak muncul di src/ mana pun.\n' +
      'Artinya string sumbernya dihapus dan kuncinya ditinggal — hapus juga dari 13 pack.'
    ).toEqual([])
  })

  it('tidak ada lagi kunci dari lapis auth yang dicabut', () => {
    // Daftar hitam, bukan hitungan: fiturnya sudah tidak ada, jadi kuncinya tidak boleh kembali
    // lewat pintu mana pun — termasuk lewat pack yang disalin dari versi lama.
    const DICABUT = ['passkey', 'Passkey', 'invite code', 'Invite code', 'invite-only',
                     'self-hosted', 'Self-host', 'Pair the mobile app', 'Connect to my server',
                     'Admin dashboard', 'Pairing code']
    const kembali = packKeys.filter(k => DICABUT.some(w => k.includes(w)))
    expect(kembali, 'fitur ini sudah dicabut dari app').toEqual([])
  })
})
