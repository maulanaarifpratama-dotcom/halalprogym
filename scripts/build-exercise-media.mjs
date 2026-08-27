#!/usr/bin/env node
/**
 * Bangun frontend/src/lib/exercise-media.json — pemetaan id latihan katalog kita ke gambar
 * demo dari free-exercise-db.
 *
 *   node scripts/build-exercise-media.mjs            # tulis berkasnya
 *   node scripts/build-exercise-media.mjs --dry      # cuma laporkan, jangan tulis
 *   node scripts/build-exercise-media.mjs --report   # cetak semua kecocokan tidak identik
 *
 * KENAPA INI ADA
 *
 * Gambar dan GIF dari dataset asal openGym adalah © Gym visual, dan memakainya secara
 * komersial butuh lisensi sendiri. Media itu dicabut dari fork ini (lihat NOTICE.md), yang
 * meninggalkan setiap latihan tanpa visual — untuk app latihan, itu hal paling intinya.
 *
 * free-exercise-db (github.com/yuhonas/free-exercise-db) adalah **Unlicense**, artinya
 * dedikasi domain publik: 873 latihan, semuanya dengan dua foto (posisi awal dan akhir).
 * Diverifikasi lewat API GitHub, bukan dari badge README: `spdx_id: "Unlicense"`.
 *
 * DUA TINGKAT PENCOCOKAN, dan penjaganya beda karena bukti yang tersedia beda
 *
 *   1. NAMA IDENTIK setelah normalisasi tulisan → terima langsung, tanpa penjaga kedua.
 *      Nama yang sama berarti latihan yang sama. Menambahkan penjaga otot di tingkat ini
 *      justru menghasilkan false negative: kedua dataset bisa beda pendapat soal otot primer
 *      untuk gerakan yang sama (Barbell Full Squat — satu bilang glutes, satu quadriceps),
 *      dan itu bukan alasan menolak kecocokan yang namanya persis sama.
 *
 *   2. SELISIH KATA TANPA MAKNA GERAKAN → terima kalau otot primer JUGA setuju.
 *      Di sini namanya tidak identik, jadi butuh sinyal kedua yang independen dari nama.
 *      Yang boleh berbeda cuma kata gramatikal (with, over, the) dan nama alat — dan nama
 *      alat hanya kalau kelas alatnya sudah terbukti sama, karena di situ kata itu redundan.
 *
 * YANG SENGAJA DITOLAK: SKOR KEMIRIPAN
 *
 * Percobaan dengan Jaccard ≥ 0.6 plus penjaga otot dan alat menghasilkan 490 kecocokan —
 * dan kesalahannya justru yang paling berbahaya:
 *
 *   "barbell rear delt raise"                → "Barbell Rear Delt ROW"      (raise ≠ row)
 *   "barbell REVERSE close-grip bench press" → "Close-Grip Bench Press"     ("reverse" hilang)
 *   "barbell LYING triceps extension"        → "INCLINE Triceps Extension"  (lying ≠ incline)
 *   "barbell preacher curl"                  → "REVERSE Preacher Curl"      ("reverse" ditambah)
 *
 * Kata yang hilang atau ditambah persis kata yang menentukan variannya. Orang meniru demo
 * yang dia lihat, jadi demo dengan varian salah adalah cara orang cedera. 329 kecocokan yang
 * bisa dipercaya lebih baik daripada 490 yang tidak, dan latihan tanpa foto tetap punya
 * diagram otot (lihat components/ExerciseAnatomy.jsx).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'frontend', 'src', 'lib', 'exercise-media.json')

/**
 * Commit free-exercise-db yang di-pin. Di-pin, bukan `main`, karena dua alasan:
 * URL jsDelivr yang terpin bisa di-cache selamanya, dan hasil skrip ini jadi bisa diulang —
 * `main` yang bergerak berarti dua orang menjalankan skrip ini bisa dapat peta yang beda.
 * Naikkan dengan sengaja, lalu jalankan ulang skripnya dan periksa selisih laporannya.
 */
export const FEDB_COMMIT = 'b0eed061e1c832b3ed815fbaa4b45b3cdc14df49'
const DATA_URL = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${FEDB_COMMIT}/dist/exercises.json`

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const REPORT = argv.includes('--report')

const VARIANT = /\((?:male|female|back pov|side pov|front pov|vertical|kneeling|VERSION 2|v\. 2)\)/gi
const sing = w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = s => String(s || '').toLowerCase().replace(/['‘’]/g, '').replace(VARIANT, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(sing)
const exactKey = s => words(s).join(' ')
const setKey = s => [...new Set(words(s))].sort().join(' ')
const squashKey = s => sing(String(s || '').toLowerCase().replace(VARIANT, '').replace(/[^a-z0-9]/g, ''))
const base = s => String(s || '').split(' - ')[0]

// Kata gramatikal murni. TIDAK ada kata gerakan, arah, cengkeraman, atau postur di sini —
// itu semua yang justru membedakan satu latihan dari variannya.
const NOISE = new Set(['the', 'a', 'an', 'of', 'with', 'on', 'over', 'and', 'to', 'in', 'at',
  'for', 'using', 'or', 'your', 'up', 'grip'])

// Kata nama alat. Boleh berbeda HANYA kalau kelas alatnya sudah sama.
const EQWORD = new Set(['barbell', 'dumbbell', 'cable', 'kettlebell', 'band', 'machine', 'lever',
  'leverage', 'sled', 'smith', 'ez', 'olympic', 'trap', 'bodyweight', 'body', 'weight', 'only',
  'ball', 'medicine', 'exercise', 'stability', 'bosu', 'roller', 'wheel', 'rope', 'assisted'])

const EQ = {
  barbell: 'barbell', 'ez barbell': 'barbell', 'e-z curl bar': 'barbell', 'olympic barbell': 'barbell',
  'trap bar': 'barbell', 'smith machine': 'machine', dumbbell: 'dumbbell', kettlebell: 'kettlebell',
  cable: 'cable', 'body weight': 'body', 'body only': 'body', 'leverage machine': 'machine',
  'sled machine': 'machine', machine: 'machine', band: 'bands', bands: 'bands',
  'medicine ball': 'ball', 'exercise ball': 'ball', 'stability ball': 'ball', 'bosu ball': 'ball'
}
const eqc = v => EQ[String(v || '').toLowerCase().trim()] || String(v || '').toLowerCase().trim() || null

const MUS = {
  pectorals: 'chest', chest: 'chest', triceps: 'triceps', biceps: 'biceps', brachialis: 'biceps',
  delts: 'shoulders', shoulders: 'shoulders', deltoids: 'shoulders', traps: 'traps', trapezius: 'traps',
  lats: 'lats', 'latissimus dorsi': 'lats', 'upper back': 'upperback', 'middle back': 'upperback',
  rhomboids: 'upperback', spine: 'lowerback', 'lower back': 'lowerback', abs: 'abs',
  abdominals: 'abs', obliques: 'abs', serratus: 'abs', 'serratus anterior': 'abs',
  glutes: 'glutes', abductors: 'glutes', quads: 'quads', quadriceps: 'quads',
  hamstrings: 'hamstrings', calves: 'calves', forearms: 'forearms', adductors: 'adductors',
  neck: 'neck', 'levator scapulae': 'neck', 'cardiovascular system': 'cardio'
}
const mus = v => MUS[String(v || '').toLowerCase().trim()] || null

async function main() {
  const { EXDB } = await import('../frontend/src/lib/exercises-data.js')
  const ours = Object.values(EXDB)

  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`gagal mengambil dataset: ${res.status} ${DATA_URL}`)
  const fedb = (await res.json()).filter(e => Array.isArray(e.images) && e.images.length)

  // Kunci yang ambigu dibuang: dua latihan berbeda memetakan ke kunci sama berarti tidak ada
  // cara memilih yang benar, dan menebak berarti menampilkan gerakan yang salah.
  const buildIdx = keyFn => {
    const m = new Map(), dup = new Set()
    for (const e of fedb) {
      const k = keyFn(e.name); if (!k) continue
      if (m.has(k) && m.get(k).id !== e.id) dup.add(k); else m.set(k, e)
    }
    dup.forEach(k => m.delete(k))
    return m
  }
  const TIER1 = [
    ['exact', buildIdx(exactKey), exactKey],
    ['squash', buildIdx(squashKey), squashKey],
    ['tokenset', buildIdx(setKey), setKey],
    ['baseset', buildIdx(n => setKey(base(n))), setKey]
  ]

  const wordCompatible = (ourEx, theirEx, useBase) => {
    const sameEq = eqc(ourEx.eq) === eqc(theirEx.equipment)
    const A = new Set(words(ourEx.n))
    const B = new Set(words(useBase ? base(theirEx.name) : theirEx.name))
    const ok = w => NOISE.has(w) || (sameEq && EQWORD.has(w))
    for (const w of A) if (!B.has(w) && !ok(w)) return false
    for (const w of B) if (!A.has(w) && !ok(w)) return false
    return true
  }

  const map = {}
  const how = {}
  const notIdentical = []
  const ambiguous = []

  for (const ex of ours) {
    let found = null, tag = null

    for (const [t, idx, kf] of TIER1) {
      const g = idx.get(kf(ex.n))
      if (g) { found = g; tag = t; break }
    }

    if (!found) {
      const ourMus = mus(ex.tg)
      if (ourMus) {
        let tie = false
        for (const useBase of [false, true]) {
          for (const c of fedb) {
            if (mus((c.primaryMuscles || [])[0]) !== ourMus) continue
            if (!wordCompatible(ex, c, useBase)) continue
            if (found && found.id !== c.id) { tie = true; break }
            found = c; tag = useBase ? 'words-base' : 'words'
          }
          if (found || tie) break
        }
        if (tie) { ambiguous.push(ex.n); found = null; tag = null }
      }
    }

    if (found) {
      map[ex.id] = found.images
      how[tag] = (how[tag] || 0) + 1
      if (exactKey(ex.n) !== exactKey(found.name)) notIdentical.push([ex.n, found.name])
    }
  }

  const hit = Object.keys(map).length
  console.log(`katalog kita      : ${ours.length}`)
  console.log(`free-exercise-db  : ${fedb.length} (commit ${FEDB_COMMIT.slice(0, 8)})`)
  console.log(`COCOK             : ${hit} (${(hit / ours.length * 100).toFixed(1)}%)`)
  Object.entries(how).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${k.padEnd(11)} ${v}`))
  console.log(`tidak identik     : ${notIdentical.length} (dicetak dengan --report)`)
  console.log(`ditolak ambigu    : ${ambiguous.length}`)

  if (REPORT) {
    console.log('\n=== kecocokan tidak identik — periksa mata sebelum menaikkan pin commit ===')
    notIdentical.forEach(([a, b]) => console.log(`  ${a.slice(0, 46).padEnd(48)} ${b}`))
  }

  if (DRY) { console.log('\n--dry: tidak ada yang ditulis'); return }

  // Kunci diurutkan supaya diff-nya stabil antar-jalan.
  const sorted = {}
  Object.keys(map).sort().forEach(k => { sorted[k] = map[k] })
  writeFileSync(OUT, JSON.stringify(sorted) + '\n')
  console.log(`\nditulis: ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
