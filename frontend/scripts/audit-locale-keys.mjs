// Cari kunci terjemahan yang mati karena STRING SUMBERNYA DIEDIT.
//
// Kenapa ini butuh skrip sendiri, padahal sudah ada scripts/check-locales.mjs:
// checker itu membandingkan pack lawan pack. Kalau sebuah kunci mati di ke-12 pack sekaligus —
// dan itu yang terjadi saat string sumber diedit — ke-12 pack tetap "sinkron" sambil sama-sama
// menunjuk teks yang sudah tidak ada. Checker melaporkan hijau, dan Jerman diam-diam jatuh ke
// Inggris untuk baris itu.
//
// Itu nyata di repo ini: rebrand openGym -> Halal Pro Gym mengubah string di kode, dan 12 pack
// tertinggal memegang kunci lamanya.
//
// KENAPA TIDAK SEKADAR "kunci yang tidak ada di kode":
// percobaan pertama saya begitu, dan hasilnya 205 tuduhan yang hampir semuanya salah. Banyak
// kunci diterjemahkan lewat t(variabel) — nama hari dari DAYN, nama bulan, nama otot, nama alat,
// kalimat progresi. Tidak ada literalnya di kode, tapi hidup sepenuhnya. Pemindai statis tidak
// bisa membedakan itu dari kunci mati, jadi dia tidak boleh berpura-pura bisa.
//
// Jadi skrip ini cuma melaporkan yang bisa DIBUKTIKAN: kunci yang bukan literal di kode, TAPI
// jadi literal yang ada begitu satu penggantian teks yang diketahui diterapkan. Itu bukti drift,
// bukan dugaan.
//
//   node scripts/audit-locale-keys.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')

// Penggantian yang pernah kita lakukan ke string sumber. Tambahkan pasangan baru di sini setiap
// kali sebuah string sumber diubah kata-katanya, supaya pack yang tertinggal ketangkap.
const EDITS = [
  ['openGym', 'Halal Pro Gym'],
  // Artikelnya ikut berubah: 'an openGym' -> 'a Halal Pro Gym'. Tanpa pasangan ini, kunci yang
  // berartikel lolos dari deteksi justru karena penggantiannya lebih dari satu kata.
  ['an openGym', 'a Halal Pro Gym'],
]

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = join(dir, e.name)
  if (e.isDirectory()) return e.name === 'locales' ? [] : walk(p)
  if (!/\.(jsx?|tsx?)$/.test(e.name) || e.name.includes('.test.')) return []
  return [p]
})

const SQ = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g
const DQ = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g

const used = new Set()
for (const f of walk(SRC)) {
  const s = readFileSync(f, 'utf8')
  for (const m of s.matchAll(SQ)) used.add(m[1].replace(/\\'/g, "'"))
  for (const m of s.matchAll(DQ)) used.add(m[1].replace(/\\"/g, '"'))
}

// Kunci pack yang jadi literal-yang-ada setelah satu penggantian = terbukti tertinggal.
const drifted = key => {
  if (used.has(key)) return null
  for (const [from, to] of EDITS) {
    if (!key.includes(from)) continue
    const fixed = key.split(from).join(to)
    if (used.has(fixed)) return fixed
  }
  return null
}

const packs = readdirSync(join(SRC, 'locales')).filter(f => f.endsWith('.js'))
let bad = 0

for (const f of packs) {
  const mod = await import('file://' + join(SRC, 'locales', f).replace(/\\/g, '/'))
  const hits = Object.keys(mod.default).map(k => [k, drifted(k)]).filter(([, v]) => v)
  if (!hits.length) { console.log(f.padEnd(10) + 'ok'); continue }
  bad += hits.length
  console.log(f.padEnd(10) + hits.length + ' kunci tertinggal dari edit string sumber:')
  for (const [k, fixed] of hits) console.log('    ' + JSON.stringify(k) + '\n    -> ' + JSON.stringify(fixed))
}

console.log('\n' + used.size + ' kunci literal terlihat di kode.')

// ---------------------------------------------------------------------------------------------
// NILAI KATALOG YANG DI-t() TAPI TIDAK ADA DI PACK MANA PUN
//
// Ini titik buta kedua, dan bentuknya berbeda dari yang di atas. Bagian tubuh, otot, dan alat
// tidak pernah muncul sebagai literal di kode — dia datang dari katalog lewat t(e.bp), t(e.tg),
// t(e.eq), dan t(b) di chip filter. Jadi:
//
//   - pemindai literal tidak melihatnya (tidak ada literalnya)
//   - check-locales.mjs tidak melihatnya (dia membandingkan pack lawan pack lewat GABUNGAN
//     kunci, dan kunci yang hilang di SEMUA pack tidak pernah masuk gabungan itu)
//
// 'full body' hidup persis di celah itu: nilai `bp` yang sah, dipakai sebagai label chip di tiga
// layar, dan tidak ada di satu pun dari 13 pack. Dia tampil "Full Body" di semua bahasa selama
// berbulan-bulan tanpa ada yang gagal. Pemeriksaan ini yang menutupnya.
const { CATALOGUE, BODYPARTS } = await import('file://' + join(SRC, 'lib', 'exercises.ts').replace(/\\/g, '/'))

const rendered = new Set(BODYPARTS)
for (const e of CATALOGUE) {
  if (e.tg || e.bp) rendered.add(e.tg || e.bp)
  if (e.eq) rendered.add(e.eq)
}

// Satu pack pembanding cukup: kalau sebuah nilai hilang dari SEMUA pack, dia hilang dari yang
// ini juga, dan kalau dia hilang cuma di sebagian, itu tugas check-locales.mjs.
const ref = await import('file://' + join(SRC, 'locales', 'de.js').replace(/\\/g, '/'))
const refKeys = new Set(Object.keys(ref.default))
const untranslated = [...rendered].filter(v => !refKeys.has(v)).sort()

console.log(rendered.size + ' nilai katalog ditampilkan lewat t().')
if (untranslated.length) {
  bad += untranslated.length
  console.log('\n' + untranslated.length + ' nilai katalog tidak ada di pack mana pun:')
  for (const v of untranslated) console.log('    ' + JSON.stringify(v))
}

if (bad) {
  console.log('\nGAGAL: ' + bad + ' temuan. Perbaiki kunci di pack, lalu jalankan lagi.')
  process.exit(1)
}
console.log('Nol kunci tertinggal, dan setiap nilai katalog yang tampil punya terjemahan.')
