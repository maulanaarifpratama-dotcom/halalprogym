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

/**
 * ALIAS YANG DIPERIKSA MANUSIA.
 *
 * Ini satu-satunya jalan yang benar untuk menaikkan cakupan. Skor kemiripan dilarang (lihat
 * catatan di kepala berkas); penilaian manusia per-baris tidak. Dikunci ke ID latihan, bukan
 * nama: ID stabil dan bebas masalah encoding (katalog kita punya "sled 45 derajat leg press"
 * dengan simbol derajat non-ASCII yang tidak selamat di semua alat).
 *
 * Setiap baris di bawah SUDAH diperiksa satu per satu terhadap nama, alat, dan otot primer di
 * kedua dataset. Kalau menambah baris, periksa juga - dan tulis alasannya kalau tidak jelas.
 *
 * Prioritasnya latihan yang paling sering dipakai orang: enam dari sebelas ini ada di starter
 * plan Push/Pull/Legs, yang berarti mereka latihan PERTAMA yang dilihat user baru.
 */
const HAND_ALIASES = {
  '0334': 'Side Lateral Raise',                  // dumbbell lateral raise - "side" redundan
  '0241': 'Triceps Pushdown - V-Bar Attachment', // cable triceps pushdown (v-bar) - V-bar di keduanya
  '0201': 'Triceps Pushdown',                    // cable pushdown - tg=triceps di katalog kita
  '0251': 'Dips - Chest Version',                // chest dip
  '0085': 'Romanian Deadlift',                   // barbell romanian deadlift
  '0739': 'Leg Press',                           // sled 45 derajat leg press - itu leg press standar
  '0405': 'Seated Dumbbell Press',               // dumbbell seated shoulder press - duduk di keduanya
  '0117': 'Sumo Deadlift',                       // barbell sumo deadlift
  '0308': 'Dumbbell Flyes',                      // dumbbell fly
  '0314': 'Incline Dumbbell Press',              // dumbbell incline bench press
  '0274': 'Crunches',                            // crunch floor - tg=abs, eq=body weight

  // ---------------------------------------------------------------------------------------
  // Tiga baris yang tadinya di sini DICABUT setelah `tokenset-noise` ditambahkan: dumbbell
  // bench squat, dumbbell neutral grip bench press, dan mixed grip chin-up sekarang cocok
  // lewat ATURAN. Alias yang mubazir cuma menyembunyikan aturan mana yang sebenarnya bekerja.
  //
  // Audit 2026-09-02: 425 usulan disaring jadi 60 kandidat oleh penjaga kata-penentu-varian,
  // lalu diperiksa satu per satu. Yang di bawah diterima; sisanya tidak, hampir semuanya karena
  // kelas alatnya benar-benar berbeda (cable -> dumbbell, smith -> barbell, bodyweight -> barbell).
  //
  // ENAM di antaranya diputuskan dengan MELIHAT FOTONYA, dan dua membalikkan keputusan yang akan
  // diambil dari metadata saja. Itu sebabnya baris-baris itu diberi catatan FOTO.
  '0028': 'Clean and Press',                              // barbell clean and press
  '0018': 'Standing Towel Triceps Extension',             // assisted standing triceps extension (with towel)
  '0029': 'Front Squat (Clean Grip)',                     // barbell clean-grip front squat
  '0063': 'Narrow Stance Squats',                         // barbell narrow stance squat
  '0066': 'One-Arm Side Deadlift',                        // barbell one arm side deadlift
  '0074': 'Rack Pulls',                                   // barbell rack pull
  '0090': 'Seated Good Mornings',                         // barbell seated good morning
  '0167': 'Kneeling High Pulley Row',                     // cable high row (kneeling)
  '0171': 'Incline Cable Flye',                           // cable incline fly
  '0237': 'Rope Straight-Arm Pulldown',                   // cable straight arm pulldown (with rope)
  '0238': 'Straight-Arm Pulldown',                        // cable straight arm pulldown
  '0248': 'Lying Cambered Barbell Row',                   // FOTO: telungkup di bangku, batang cambered
  '0302': 'Decline Dumbbell Flyes',                       // dumbbell decline fly
  '0319': 'Incline Dumbbell Flyes',                       // dumbbell incline fly
  '0432': 'Stiff-Legged Dumbbell Deadlift',               // dumbbell stiff leg deadlift
  '0446': 'Close-Grip EZ Bar Curl',                       // ez barbell close-grip curl - EZ di kedua sisi
  '0518': 'Alternating Hang Clean',                       // kettlebell alternating hang clean
  '0525': 'Bottoms-Up Clean From The Hang Position',      // kettlebell bottoms up clean from the hang position
  '0534': 'Goblet Squat',                                 // FOTO: kettlebell di dada - versi kettlebell yang benar
  '0536': 'Lunge Pass Through',                           // kettlebell lunge pass through
  '0545': 'Plyo Kettlebell Pushups',                      // kettlebell plyo push-up
  '0593': 'Reverse Hyperextension',                       // lever reverse hyperextension - mesin di kedua sisi
  '0743': 'Hack Squat',                                   // FOTO: mesin hack squat bertumpu piringan = sled
  '0744': 'Lying Machine Squat',                          // sled lying squat
  '0748': 'Smith Machine Bench Press',                    // smith bench press
  '0760': 'Smith Machine Leg Press',                      // smith leg press
  '0770': 'Smith Machine Squat',                          // smith squat
  '0775': 'Smith Machine Upright Row',                    // smith upright row
  '0814': 'Dips - Triceps Version',                       // FOTO: torso tegak, siku rapat = versi trisep
  '0835': 'Weighted Ball Hyperextension',                 // weighted hyperextension (on stability ball)
  '0850': 'Weighted Ball Side Bend',                      // weighted side bend (on stability ball)
  '1004': 'Squat with Bands',                             // FOTO: pita di bahu, TANPA barbel - metadata fedb
                                                          //       menulis 'barbell' dan itu keliru
  '1354': 'Overhead Slam',                                // medicine ball overhead slam
  // '1748' DICABUT: nama kita sebenarnya "...triceps extension BEHIND HEAD", dan kandidatnya
  // tidak punya itu. "Behind head" mengubah sudut sendi bahu — itu kata penentu varian, bukan
  // kata gramatikal. Daftar kandidat saya memotong namanya di 42 karakter dan menyembunyikan
  // kata itu; penjaga alias-tidak-ketemu yang menangkapnya, bukan mata saya.
  '1758': 'Sit-Up',                                       // FOTO: kaki dikait di bawah dumbbell
  '2186': 'Decline EZ Bar Triceps Extension',             // ez barbell decline triceps extension
}

/**
 * SENGAJA TIDAK DI-ALIAS, supaya keputusannya tidak hilang dan tidak ditanyakan ulang:
 *
 *   dumbbell standing overhead press - fedb cuma punya versi DUDUK ("Dumbbell Shoulder Press",
 *        "Seated Dumbbell Press"). "Standing" itu kata postur yang membedakan: bedanya dukungan
 *        torso, dan itu terlihat jelas di fotonya.
 *   dumbbell romanian deadlift - fedb cuma punya "Stiff-Legged Dumbbell Deadlift". RDL dan
 *        stiff-legged beda di fleksi lutut, dan itu perbedaan yang lifter memang perhatikan.
 *
 * Keduanya mendapat diagram otot, dan itu jawaban yang lebih jujur daripada foto yang salah.
 */

/**
 * DITOLAK MANUAL: kecocokan terbaik yang tersedia menampilkan ALAT YANG BERBEDA, jadi lebih baik
 * tidak ada foto sama sekali.
 *
 * Ini pasangan `HAND_ALIASES` di atas, dan dia perlu ada karena aturannya asimetris: alias
 * MENAMBAH kecocokan yang aturan otomatis lewatkan, daftar ini MEMBUANG kecocokan yang aturan
 * otomatis terima dengan salah. Tanpa keduanya, satu-satunya cara memperbaiki satu baris adalah
 * memperketat aturan untuk semua baris — dan itu sudah diukur: memecah kelas `smith` dari
 * `machine` membuang TUJUH kecocokan yang benar ("Smith Machine Bent Over Row", "Smith Machine
 * Squat", "Smith Machine Incline Bench Press", ...) untuk membuang enam yang salah. Pertukaran
 * yang buruk, dan itu sebabnya perbaikannya per-baris.
 *
 * Setiap baris di bawah sudah dilihat satu per satu: nama kita, nama fedb, dan alat di kedua sisi.
 * Latihan ini mendapat diagram otot MuscleMap, dan itu jawaban yang lebih jujur daripada foto
 * mesin yang salah — orang meniru demo yang dia lihat.
 */
const HAND_REJECTS = {
  // Smith machine (batang vertikal terpandu) vs mesin tuas plate-loaded. Bukan alat yang sama,
  // dan bedanya terlihat jelas di foto.
  '0752': 'smith deadlift -> Leverage Deadlift',
  '0766': 'smith shoulder press -> Leverage Shoulder Press',
  '0767': 'smith shrug -> Leverage Shrug',

  // Smith machine -> latihan TANPA alat sama sekali.
  '0750': 'smith chair squat -> Chair Squat (body only)',
  '0769': 'smith sprint lunge -> Lunge Sprint (tanpa mesin)',

  // Smith machine -> mesin curl generik. Curl di Smith machine bukan gerakan yang sama.
  '1683': 'smith machine bicep curl -> Machine Bicep Curl',

  // Katalog kita menandai eq=barbell untuk latihan yang NAMANYA "lever" — data sumbernya sendiri
  // tidak konsisten. Fotonya barbel bebas sementara namanya menyebut mesin, jadi apa pun yang
  // benar, yang tampil di layar membingungkan.
  '0574': 'lever bent over row -> Bent Over Barbell Row',

  // Dua ini diputuskan dengan MELIHAT foto kandidatnya, dan fotonya membalikkan apa yang
  // metadata sarankan:
  '0755': 'smith hack squat -> Hack Squat (FOTO: mesin hack squat bertumpu piringan, bukan Smith)',
  '1760': 'dumbbell goblet squat -> Goblet Squat (FOTO: kettlebell di dada, bukan dumbbell)',
}

/**
 * EZ BARBELL SENGAJA TETAP SEKELAS DENGAN BARBELL, dan itu keputusan bukan kelalaian.
 *
 * Lima latihan `ez barbell` memakai foto barbel lurus ("ez barbell curl" -> "Barbell Curl"), dan
 * satu arah sebaliknya ("barbell reverse preacher curl" -> foto EZ bar). Batangnya memang
 * berbeda bentuk, tapi GERAKANNYA identik dan lifter menukarnya tanpa berpikir. Aturan di berkas
 * ini soal makna gerakan, bukan soal inventaris alat.
 *
 * Ditulis di sini supaya tidak ditanyakan ulang setiap audit.
 */

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const REPORT = argv.includes('--report')

const VARIANT = /\((?:male|female|back pov|side pov|front pov|vertical|kneeling|VERSION 2|v\. 2)\)/gi
const sing = w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = s => String(s || '').toLowerCase().replace(/['‘’]/g, '').replace(VARIANT, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(sing)
const exactKey = s => words(s).join(' ')
const setKey = s => [...new Set(words(s))].sort().join(' ')
/**
 * Tokenset yang MEMBUANG kata gramatikal.
 *
 * `setKey` memakai `words()` yang tidak membuang NOISE, jadi "band squat" dan "Squat with Bands"
 * punya kunci berbeda ("band squat" vs "band squat with") walau himpunan kata bermaknanya identik.
 * Tiga latihan hilang karena itu, dan ketiganya benar: "dumbbell bench squat" ->
 * "Dumbbell Squat To A Bench", "dumbbell neutral grip bench press" ->
 * "Dumbbell Bench Press with Neutral Grip", "mixed grip chin-up" -> "Mixed Grip Chin".
 *
 * Aman karena NOISE sudah dikurasi dan sengaja TIDAK memuat satu pun kata gerakan, arah,
 * cengkeraman, atau postur — membuangnya tidak bisa menghapus pembeda varian. Indeksnya tetap
 * menolak kunci yang ambigu, jadi dua latihan berbeda yang runtuh ke satu kunci tetap dibuang.
 */
const setKeyBersih = s => [...new Set(words(s).filter(w => !NOISE.has(w)))].sort().join(' ')
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
  // JAMAK. free-exercise-db menulis 'kettlebells', katalog kita 'kettlebell', dan tanpa
  // baris ini `sameEq` salah untuk SELURUH kettlebell — jalur kata jadi tertutup dan tujuh
  // kecocokan yang benar hilang (goblet squat, bent press, alternating renegade row, ...).
  // Diukur, dan ketujuhnya diperiksa mata.
  kettlebells: 'kettlebell',
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
    // Setelah tokenset biasa: yang cocok tanpa membuang apa pun harus menang lebih dulu.
    ['tokenset-noise', buildIdx(setKeyBersih), setKeyBersih],
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

  // Indeks nama fedb yang tepat, untuk menyelesaikan HAND_ALIASES.
  const byExactName = new Map(fedb.map(e => [e.name, e]))
  const aliasMisses = []

  const rejected = []

  for (const ex of ours) {
    // Ditolak manual: dipotong SEBELUM alias, supaya tidak ada jalur yang bisa memulihkannya
    // diam-diam nanti.
    if (HAND_REJECTS[ex.id]) { rejected.push(`${ex.id} ${HAND_REJECTS[ex.id]}`); continue }

    let found = null, tag = null

    // Tingkat 0: alias yang diperiksa manusia. Menang atas semuanya - kalau seseorang sudah
    // memeriksa satu baris, itu bukti yang lebih kuat daripada aturan apa pun di bawah.
    const aliasName = HAND_ALIASES[ex.id]
    if (aliasName) {
      const g = byExactName.get(aliasName)
      if (g) { found = g; tag = 'alias' }
      // Nama alias yang tidak ditemukan berarti dataset upstream mengganti namanya. Itu harus
      // BERISIK, bukan diam-diam jatuh ke aturan otomatis: aliasnya diperiksa manusia terhadap
      // nama tertentu, dan kalau nama itu hilang, pemeriksaannya sudah tidak berlaku.
      else aliasMisses.push([ex.id, ex.n, aliasName])
    }

    if (!found) for (const [t, idx, kf] of TIER1) {
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
  console.log(`ditolak manual    : ${rejected.length}`)
  console.log(`ditolak ambigu    : ${ambiguous.length}`)

  if (REPORT) {
    console.log('\n=== kecocokan tidak identik — periksa mata sebelum menaikkan pin commit ===')
    notIdentical.forEach(([a, b]) => console.log(`  ${a.slice(0, 46).padEnd(48)} ${b}`))
  }

  if (aliasMisses.length) {
    console.error('\\nALIAS TIDAK DITEMUKAN di dataset upstream - pemeriksaannya tidak lagi berlaku:')
    for (const [id, ourName, want] of aliasMisses) {
      console.error(`  ${id}  ${ourName}  ->  ${JSON.stringify(want)}`)
    }
    console.error('\\nDataset kemungkinan mengganti nama. Periksa ulang dan perbarui HAND_ALIASES.')
    process.exit(1)
  }

  if (DRY) { console.log('\n--dry: tidak ada yang ditulis'); return }

  // Kunci diurutkan supaya diff-nya stabil antar-jalan.
  const sorted = {}
  Object.keys(map).sort().forEach(k => { sorted[k] = map[k] })
  writeFileSync(OUT, JSON.stringify(sorted) + '\n')
  console.log(`\nditulis: ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
