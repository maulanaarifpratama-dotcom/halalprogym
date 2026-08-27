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
const IN_PROGRESS = new Set(['id'])

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

for (const [lang, keys] of locales) {
  const missing = union.filter(k => !keys.has(k))
  const orphans = union.filter(k => keys.has(k) && seen.get(k) === 1)

  // Kunci yang cuma ada di satu pack tetap gagal, termasuk untuk pack bertahap: itu selalu
  // salah tulis pada kuncinya, bukan terjemahan yang belum sempat.
  if (orphans.length) {
    failed = true
    console.error(`\n${lang}.js: ${orphans.length} kunci hanya ada di sini`)
    for (const k of orphans) console.error(`  only here: ${JSON.stringify(k)}`)
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
console.log(`${complete} locale lengkap, ${union.length} kunci masing-masing — sinkron.`)
for (const [lang, have, total] of progress) {
  const pct = (have / total * 100).toFixed(0)
  console.log(`${lang}.js: ${have}/${total} (${pct}%) — sengaja bertahap, sisanya jatuh ke Inggris`)
}
