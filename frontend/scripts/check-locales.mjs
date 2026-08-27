#!/usr/bin/env node
// Guards the one invariant every locale in src/locales/ shares: the same key set.
// English is the source language and has no locale file, so a key that exists in only
// some locales falls back to English silently, mid-sentence, with nothing failing
// anywhere. This catches that at review time instead of in the app.
//
//   node scripts/check-locales.mjs
//
// The reference is the union of all locales, not one blessed file: a key added to a
// single locale then flags the other ten instead of passing unnoticed.
//
// PACK YANG SENGAJA BERTAHAP
//
// `id.js` dibangun bertahap: yang diisi lebih dulu adalah yang membawa keputusan brand
// (nama hari, istilah keislaman, navigasi), sisanya menyusul lewat scripts/translate-*.mjs.
// `t()` melakukan `dict[s] || s`, jadi kunci yang belum ada jatuh ke Inggris per-kunci —
// pack parsial bukan kegagalan, dan memperlakukannya sebagai kegagalan membuat checker ini
// selalu merah. Checker yang selalu merah akan diabaikan orang, dan saat itulah kebocoran
// yang sebenarnya lolos.
//
// Jadi pack di IN_PROGRESS dilaporkan sebagai KEMAJUAN, bukan kegagalan. Dua hal tetap
// berlaku untuk mereka: kunci yang cuma ada di situ sendiri tetap gagal (itu selalu kesalahan
// tulis, bukan kemajuan), dan begitu satu pack selesai, keluarkan dia dari daftar ini supaya
// dia dijaga penuh lagi.

import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Locale yang masih dibangun bertahap. Keluarkan dari sini begitu lengkap. */
const IN_PROGRESS = new Set([])

// KUNCI YANG SENGAJA TIDAK DITERJEMAHKAN DI id.js
//
// id.js sudah lengkap, dan daftar ini yang membuat kata "lengkap" bisa diperiksa. Header id.js
// menyatakan prinsipnya: kalau istilah Inggrisnya justru yang natural, kuncinya TIDAK DIISI dan
// `dict[s] || s` yang mengerjakannya. Menerjemahkan "reps" jadi "repetisi" atau "barbell" jadi
// "palang besi" bikin app terasa seperti buku pelajaran, bukan seperti gym.
//
// Menuliskannya di sini, bukan membiarkan id.js duduk di IN_PROGRESS, mengubah artinya
// sepenuhnya. IN_PROGRESS memaklumi SEMUA kunci yang hilang, jadi kunci baru yang lupa disebar
// ke id.js lolos tanpa suara. Dengan daftar ini, yang hilang harus SAMA DENGAN daftar ini: satu
// kunci baru yang belum diterjemahkan langsung gagal, dan satu keputusan yang berubah harus
// dihapus dari sini secara sadar.
//
// Bulan pendek yang ejaannya memang sama (Jan, Feb, Mar, Apr, Jun, Jul, Sep, Nov) ikut di sini
// dengan alasan yang sama: pemetaan identik bikin persentase cakupan bohong.
const ID_KEEPS_ENGLISH = new Set([
  '+ Burst',
  '+ Drop',
  'Apr',
  'Burst {0}',
  'Data',
  'Demo',
  'Drop {0}',
  'Drop-set',
  'Drop-set / rest-pause',
  'Drops',
  'Effort',
  'Effort per set',
  'Est. 1RM',
  'Feb',
  'Freestyle',
  'Greyskull LP',
  // Penanda tahun Hijriah. Indonesia memang menulis 'H'; bahasa lain 'AH' (Anno Hegirae).
  'H',
  'Hamstrings',
  'Intensifier',
  'Jan',
  'Jul',
  'Jun',
  'Mar',
  'Nov',
  // Nutrisi: 'Protein' dan 'per 100 g' memang ditulis persis begitu di Indonesia, dan '{0}'
  // di 'per {0}' membuat pemetaannya identik juga.
  'Protein',
  'Protein (g)',
  'RIR',
  'RPE',
  'Reps',
  'Reset',
  'Rest-pause',
  'Sep',
  'Superset',
  'Superset {0} / {1}',
  'Tip',
  'Volume',
  'Warm-up',
  'band',
  'barbell',
  'cable',
  'core',
  'dumbbell',
  'ez barbell',
  'hammer',
  'hamstrings',
  'kettlebell',
  'latissimus dorsi',
  'lats',
  'olympic barbell',
  'per 100 g',
  'per {0}',
  'reps',
  'roller',
  'rotator cuff',
  'smith machine',
  'soleus',
  'trap bar',
])

// KUNCI YANG TIDAK DIBAWA 12 PACK WARISAN
//
// Upstream tidak pernah menerjemahkan string build demo, dan ke-12 pack sama-sama tidak
// punya kuncinya. Selama id.js masih kecil, celah ini tak terlihat: checker memakai gabungan
// kunci semua pack, jadi kunci yang hilang di SEMUA pack tidak pernah muncul di gabungan itu.
// Begitu id.js diisi, celahnya keluar sekaligus — 12 kunci, sama di setiap pack.
//
// Kenapa tidak diisi saja: semuanya cuma hidup di cabang DEMO (Login.jsx dan Settings.jsx saat
// VITE_DEMO=1), dan itu deployment GitHub Pages upstream — bukan yang kita bangun. Menambal 12
// kunci x 12 bahasa berarti 144 terjemahan yang tidak ada yang bisa memeriksanya, ke layar yang
// tidak kita kirimkan. Lubang yang tercatat lebih jujur daripada terjemahan yang tidak diperiksa.
//
// id.js SUDAH menerjemahkan kedua belasnya — dia satu-satunya pack yang kita tulis sendiri, dan
// bahasa Indonesia memang bisa kita periksa. Karena itu aturan "kunci cuma ada di satu pack"
// juga dilonggarkan khusus untuk daftar ini: di sini satu-pembawa itu keadaan yang diharapkan,
// bukan salah tulis.
//
// Jumlahnya DIPATOK. Kalau daftar ini bertambah, itu bukan lagi warisan upstream — itu kunci
// baru yang lupa disebar, dan pin ini yang akan meneriakkannya.
const UPSTREAM_GAP = new Set([
  'Demo data reset',
  'Example data, stored only in this browser — change anything you like.',
  'Live demo — everything stays in this browser.',
  'Puts the example plan, workouts and weigh-ins back the way they started.',
  'Reset demo data',
  'Reset demo data?',
  'Start the demo',
  'You’re in the demo',
])
const UPSTREAM_GAP_PINNED = 8

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const files = readdirSync(localesDir).filter(f => f.endsWith('.js')).sort()

if (!files.length) {
  console.error(`No locale files found in ${localesDir}`)
  process.exit(1)
}

const locales = new Map()
for (const file of files) {
  const { default: dict } = await import(pathToFileURL(join(localesDir, file)).href)
  if (!dict || typeof dict !== 'object') {
    console.error(`${file}: no default-exported object`)
    process.exit(1)
  }
  locales.set(file.replace(/\.js$/, ''), new Set(Object.keys(dict)))
}

// How many locales carry each key — 1 means the key was added to a single file only,
// which is the usual shape of the bug and worth naming separately from plain gaps.
const seen = new Map()
for (const keys of locales.values()) for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1)
const union = [...seen.keys()]

let failed = false
const progress = []
let idKeepsEnglish = 0

if (UPSTREAM_GAP.size !== UPSTREAM_GAP_PINNED) {
  failed = true
  console.error(
    `\nUPSTREAM_GAP berisi ${UPSTREAM_GAP.size} kunci, dipatok ${UPSTREAM_GAP_PINNED}. ` +
    'Kalau memang menambah kunci warisan, naikkan pin-nya sambil menuliskan alasannya.'
  )
}

// Kalau salah satu dari 12 pack warisan akhirnya menerjemahkannya, daftar ini basi. id.js
// dikecualikan: dia memang pembawa tunggalnya.
for (const [lang, keys] of locales) {
  if (lang === 'id') continue
  const stale = [...UPSTREAM_GAP].filter(k => keys.has(k))
  if (!stale.length) continue
  failed = true
  console.error(`\n${lang}.js sudah menerjemahkan ${stale.length} kunci yang masih di UPSTREAM_GAP:`)
  for (const k of stale) console.error(`  keluarkan dari daftar: ${JSON.stringify(k)}`)
}

// Dan arah sebaliknya: kunci di UPSTREAM_GAP wajib MASIH ADA di id.js.
//
// Tanpa pemeriksaan ini, daftar pengecualian jadi tempat kunci mati bersembunyi — dia
// dikecualikan dari perbandingan `missing`, jadi tidak ada yang memperhatikan kalau string
// sumbernya sudah lama dihapus. Itu benar-benar terjadi: empat dari dua belas kunci di sini
// mati bersama pencabutan UI self-host, dan checker ini melaporkan hijau sampai
// src/lib/locale-orphans.test.ts menemukannya dari sisi lain.
{
  const idKeys = locales.get('id')
  const hantu = idKeys ? [...UPSTREAM_GAP].filter(k => !idKeys.has(k)) : []
  if (hantu.length) {
    failed = true
    console.error(`\nUPSTREAM_GAP memuat ${hantu.length} kunci yang sudah tidak ada di id.js:`)
    for (const k of hantu) console.error(`  hapus dari daftar: ${JSON.stringify(k)}`)
  }
}

for (const [lang, keys] of locales) {
  const missing = union.filter(k => !keys.has(k) && !UPSTREAM_GAP.has(k))
  const orphans = union.filter(k => keys.has(k) && seen.get(k) === 1 && !UPSTREAM_GAP.has(k))

  // Kunci yang cuma ada di satu pack tetap gagal, termasuk untuk pack bertahap: itu selalu
  // salah tulis pada kuncinya, bukan terjemahan yang belum sempat.
  if (orphans.length) {
    failed = true
    console.error(`\n${lang}.js: ${orphans.length} kunci hanya ada di sini`)
    for (const k of orphans) console.error(`  only here: ${JSON.stringify(k)}`)
  }

  // id.js diperiksa PENUH lawan ID_KEEPS_ENGLISH, bukan dimaklumi. Dua arah, karena dua-duanya
  // adalah kesalahan yang nyata: kunci hilang yang tidak terdaftar berarti ada yang lupa
  // diterjemahkan, dan kunci terdaftar yang ternyata diterjemahkan berarti keputusannya sudah
  // berubah tapi daftarnya belum.
  if (lang === 'id') {
    const takTerduga = missing.filter(k => !ID_KEEPS_ENGLISH.has(k))
    const sudahDiisi = [...ID_KEEPS_ENGLISH].filter(k => keys.has(k))
    if (takTerduga.length) {
      failed = true
      console.error(`\nid.js: ${takTerduga.length} kunci belum diterjemahkan dan tidak terdaftar`)
      for (const k of takTerduga) console.error(`  terjemahkan, atau daftarkan: ${JSON.stringify(k)}`)
    }
    if (sudahDiisi.length) {
      failed = true
      console.error(`\nid.js: ${sudahDiisi.length} kunci diterjemahkan padahal terdaftar sengaja Inggris`)
      for (const k of sudahDiisi) console.error(`  keluarkan dari ID_KEEPS_ENGLISH: ${JSON.stringify(k)}`)
    }
    if (!takTerduga.length && !sudahDiisi.length) idKeepsEnglish = missing.length
    continue
  }

  if (!missing.length) continue

  if (IN_PROGRESS.has(lang)) {
    progress.push([lang, keys.size, union.length])
    continue
  }

  failed = true
  console.error(`\n${lang}.js: ${keys.size}/${union.length} keys`)
  for (const k of missing) console.error(`  missing:   ${JSON.stringify(k)}`)
}

if (failed) {
  console.error('\nLocale key sets differ. Every locale must carry the same keys.')
  process.exit(1)
}

const complete = locales.size - progress.length
const shared = union.filter(k => !UPSTREAM_GAP.has(k)).length
console.log(`${complete} locale lengkap, ${shared} kunci masing-masing — sinkron.`)
console.log(`id.js lengkap — ${idKeepsEnglish} kunci sengaja tetap Inggris (istilah gym & alat).`)
console.log(`${UPSTREAM_GAP.size} kunci build demo cuma ada di id.js — 12 pack warisan tidak pernah membawanya.`)
for (const [lang, have, total] of progress) {
  const pct = (have / total * 100).toFixed(0)
  console.log(`${lang}.js: ${have}/${total} (${pct}%) — sengaja bertahap, sisanya jatuh ke Inggris`)
}
