#!/usr/bin/env node
/**
 * Membangun `frontend/src/lib/exercise-illustrations.json` — peta id latihan -> ilustrasi RepDB.
 *
 *   node scripts/build-repdb-illustrations.mjs            # tulis peta
 *   node scripts/build-repdb-illustrations.mjs --report    # cetak semua kecocokan untuk diperiksa
 *   node scripts/build-repdb-illustrations.mjs --dry       # jangan tulis apa pun
 *
 * =============================================================================================
 * KENAPA SUMBER KEDUA, DAN KENAPA DIA MENANG ATAS FOTO
 *
 * Foto free-exercise-db adalah foto ORANG SUNGGUHAN, dan sebagian di antaranya bertelanjang dada.
 * `DESIGN.md` melarang itu eksplisit, di bagian "Yang tidak boleh masuk":
 *
 *     "Figur manusia berpakaian minim sebagai demo gerakan — soal aurat DAN lisensi."
 *
 * Aturannya ada sejak awal. Yang tidak pernah terjadi adalah MEMERIKSANYA ke foto yang benar-benar
 * dikirim — dan itu cuma ketahuan saat delapan foto dibuka satu per satu untuk memverifikasi
 * kecocokan gerakan. Tidak ada metadata di free-exercise-db yang menyatakan "model bertelanjang
 * dada", jadi aturan otomatis apa pun tidak akan pernah menangkapnya.
 *
 * Ilustrasi RepDB bukan foto orang. Jadi untuk latihan yang tercakup keduanya, ilustrasi yang
 * dipakai — bukan karena lebih bagus, tapi karena dia memenuhi aturan brand yang fotonya langgar.
 *
 * =============================================================================================
 * LISENSI: RepDB Free Tier v1.0 — DAN TERM 3 YANG MENENTUKAN CARA KERJA BERKAS INI
 *
 *   1. Gratis untuk penggunaan pribadi DAN KOMERSIAL di dalam aplikasi.
 *   2. Atribusi WAJIB: tautan terlihat "Exercise data by RepDB (repdb.co)".
 *   3. TIDAK BOLEH diredistribusi sebagai dataset — termasuk dataset turunan. In-app saja.
 *   4. Gambar boleh diubah ukuran/dipotong/diwarnai ulang untuk pemakaian in-app.
 *   5. TIDAK BOLEH jadi input model generatif.
 *
 * Term 3 itu sebabnya skrip ini **cuma menulis PETA NAMA BERKAS**, bukan gambarnya. Repo ini
 * publik (AGPL mewajibkannya), jadi meng-commit gambarnya berarti mempublikasikan ulang datasetnya
 * di repositori publik. Petanya sendiri karya kami: id katalog kami -> nama berkas mereka.
 *
 * Gambarnya dimuat dari distribusi RepDB sendiri lewat jsDelivr pada COMMIT YANG DI-PIN. Pola yang
 * sama persis dengan free-exercise-db, dan alasannya sama: peta dan gambar tidak boleh bisa
 * menyimpang. Kalau peta menunjuk satu commit dan gambar datang dari commit lain, yang muncul di
 * layar adalah GERAKAN YANG SALAH, tanpa error.
 *
 * Atribusi diberikan di `NOTICE.md`, di Pengaturan -> Tentang, dan dipaku
 * `exercise-illustrations.test.ts`.
 *
 * =============================================================================================
 * PENCOCOKAN: NAMA, BUKAN SKOR
 *
 * Aturan yang sama dengan `build-exercise-media.mjs`, dan alasannya sama: skor kemiripan sudah
 * ditolak di repo ini karena "rear delt raise" jadi "rear delt ROW". Di sini cuma dua tingkat:
 *
 *   1. nama identik setelah normalisasi
 *   2. himpunan token identik setelah kata gramatikal dibuang
 *
 * Tidak ada tingkat ketiga. Kalau RepDB tidak punya nama yang cocok, latihan itu tetap memakai
 * foto atau diagram otot — dan itu jawaban yang benar.
 */
import { writeFileSync } from 'node:fs'

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const REPORT = argv.includes('--report')

/**
 * Commit RepDB yang di-pin. HARUS sama dengan `REPDB_COMMIT` di
 * `frontend/src/lib/exercise-illustrations.ts` — dipaku tes, karena dua tempat yang bisa
 * menyimpang di sini berarti gambar dari commit lain daripada petanya.
 */
const REPDB_COMMIT = '8f25d055e243b882aa05acaa66c2c51b1a9fc2d1'

const DATA_URL = 'https://cdn.jsdelivr.net/gh/RepDB/exercise-dataset@'
  + REPDB_COMMIT + '/exercises.json'

const OUT = new URL('../frontend/src/lib/exercise-illustrations.json', import.meta.url)

// --- normalisasi nama, sama dengan build-exercise-media.mjs ---
const sing = w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = s => String(s || '').toLowerCase().replace(/['‘’]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(sing)
const NOISE = new Set(['the', 'a', 'an', 'of', 'with', 'on', 'over', 'and', 'to', 'in', 'at',
  'for', 'using', 'or', 'your', 'up', 'grip'])
const exactKey = s => words(s).join(' ')
const setKey = s => [...new Set(words(s).filter(w => !NOISE.has(w)))].sort().join(' ')

/**
 * ALIAS YANG DIPERIKSA MANUSIA. Menang atas kedua tingkat otomatis di bawah.
 *
 * =============================================================================================
 * CARA 49 BARIS INI DIPUTUSKAN — dan kenapa prosesnya penting, bukan cuma hasilnya
 *
 * 1. Skor kemiripan dipakai untuk MENGUSULKAN, bukan menerima: 424 usulan dari 380 ilustrasi
 *    RepDB yang belum terpakai. Skor tetap DILARANG sebagai penerimaan — aturan yang sudah
 *    tertulis di `CLAUDE.md` karena "rear delt raise" pernah jadi "rear delt ROW".
 *
 * 2. Penjaga KATA PENENTU VARIAN membuang 325: kalau `reverse`, `seated`, `incline`, `close`,
 *    `single`, atau puluhan kata sejenis ada di satu sisi saja, gerakannya berbeda. Sisa 99.
 *
 * 3. Penjaga KESEPAKATAN ALAT membuang 44 lagi, dan di sinilah nilainya paling terlihat — empat
 *    di antaranya akan saya terima kalau cuma membaca namanya:
 *
 *      kettlebell arnold press   -> "Arnold Press"            ilustrasinya DUMBBELL
 *      dumbbell goblet squat     -> "Goblet Squat"            ilustrasinya KETTLEBELL
 *      barbell single leg deadlift -> "... Single Leg Deadlift" ilustrasinya KETTLEBELL
 *      dumbbell preacher curl    -> "Preacher Curl"           ilustrasinya EZ-BAR
 *
 *    Nama RepDB sering generik sementara nama kita menyebut alatnya, dan generik itu tetap
 *    MENGGAMBAR satu alat tertentu.
 *
 * 4. Tujuh sisanya alatnya tidak dinyatakan RepDB, jadi GAMBARNYA DIBUKA. Enam ditolak karena
 *    itu: ilustrasi "Single Leg Calf Raise" ternyata berat badan murni — memegang rel, tanpa
 *    dumbbell dan tanpa band — sementara tiga latihan kita menyebut band/dumbbell. Satu diterima
 *    (`side lying hip adduction`, berat badan di kedua sisi).
 *
 * 39 dari 49 MENGGANTI FOTO, 10 mengisi latihan yang tadinya cuma punya diagram otot.
 *
 * Tiga di antaranya memperbaiki penolakan lama di skrip foto: `smith bent over row`,
 * `smith incline bench press`, dan `smith upright row` dulu dipasangkan foto mesin tuas atau
 * ditolak sama sekali — RepDB punya versi Smith-nya yang benar.
 */
const HAND_ALIASES = {
  '0030': 'Close-Grip Bench Press',                                  // barbell close-grip bench press — ganti foto
  '0038': 'Drag Curl',                                               // barbell drag curl — ganti foto
  '0042': 'Front Squat',                                             // barbell front squat — ganti foto
  '0044': 'Good Morning',                                            // barbell good morning — ganti foto
  '0069': 'Overhead Squat',                                          // barbell overhead squat — ganti foto
  '0074': 'Rack Pull',                                               // barbell rack pull — ganti foto
  '0080': 'Reverse Curl',                                            // barbell reverse curl — ganti foto
  '0085': 'Romanian Deadlift',                                       // barbell romanian deadlift — ganti foto
  '0117': 'Sumo Deadlift',                                           // barbell sumo deadlift — ganti foto
  '0118': 'Reverse Grip Bent Over Row',                              // barbell reverse grip bent over row — ganti foto
  '0122': 'Wide-Grip Bench Press',                                   // barbell wide bench press — ganti foto
  '0165': 'Cable Hammer Curl',                                       // cable hammer curl (with rope) — ganti foto
  '0237': 'Straight-Arm Pulldown',                                   // cable straight arm pulldown (with rope) — ganti foto
  '0238': 'Straight-Arm Pulldown',                                   // cable straight arm pulldown — ganti foto
  '0241': 'V-Bar Tricep Pushdown',                                   // cable triceps pushdown (v-bar) — ganti foto
  '0297': 'Concentration Curl',                                      // dumbbell concentration curl — ganti foto
  '0298': 'Cross Body Hammer Curl',                                  // dumbbell cross body hammer curl — ganti foto
  '0301': 'Decline Bench Press',                                     // dumbbell decline bench press — ganti foto
  '0320': 'Incline Hammer Curl',                                     // dumbbell incline hammer curl — ganti foto
  '0439': 'Zottman Curl',                                            // dumbbell zottman curl — ganti foto
  '0446': 'Close-Grip Barbell Curl',                                 // ez barbell close-grip curl — ganti foto
  '0447': 'EZ-Bar Curl',                                             // ez barbell curl — ganti foto
  '0454': 'EZ Bar Spider Curl',                                      // ez barbell spider curl — ganti foto
  '0534': 'Goblet Squat',                                            // kettlebell goblet squat — ganti foto
  '0575': 'Machine Bicep Curl',                                      // lever bicep curl — ganti foto
  '0585': 'Leg Extension',                                           // lever leg extension — ganti foto
  '0586': 'Lying Leg Curl',                                          // lever lying leg curl — ganti foto
  '0594': 'Seated Calf Raise',                                       // lever seated calf raise — ganti foto
  '0599': 'Seated Leg Curl',                                         // lever seated leg curl — ganti foto
  '0605': 'Standing Calf Raise',                                     // lever standing calf raise — ganti foto
  '0743': 'Hack Squat',                                              // sled hack squat — ganti foto
  '0748': 'Smith Machine Bench Press',                               // smith bench press — ganti foto
  '0753': 'Smith Machine Decline Bench Press',                       // smith decline bench press — BARU
  '0757': 'Smith Machine Incline Bench Press',                       // smith incline bench press — ganti foto
  '0765': 'Seated Smith Machine Shoulder Press',                     // smith seated shoulder press — BARU
  '0766': 'Smith Machine Shoulder Press',                            // smith shoulder press — BARU
  '0767': 'Smith Machine Shrug',                                     // smith shrug — BARU
  '0770': 'Smith Machine Squat',                                     // smith squat — ganti foto
  '0775': 'Smith Machine Upright Row',                               // smith upright row — ganti foto
  '1283': 'Incline Dumbbell Press',                                  // dumbbell incline press on exercise ball — ganti foto
  '1359': 'Smith Machine Bent Over Row',                             // smith bent over row — ganti foto
  '1361': 'Smith Machine Reverse Grip Bent Over Row',                // smith reverse grip bent over row — BARU
  '1452': 'Machine Seated Crunch',                                   // lever seated crunch — BARU
  '1628': 'EZ Bar Spider Curl',                                      // ez barbell spider curl — ganti foto
  '1719': 'Close-Grip Incline Bench Press',                          // barbell incline close grip bench press — BARU
  '2137': 'Arnold Press',                                            // dumbbell arnold press — ganti foto
  '3017': 'Pendlay Row',                                             // barbell pendlay row — BARU
  '3305': 'Thruster',                                                // barbell thruster — BARU
  '3667': 'Side Lying Hip Adduction',                                // side lying hip adduction (male) — BARU
}

/**
 * DITOLAK MANUAL. Pasangan `HAND_REJECTS` di skrip foto, dan alasannya sama: aturan otomatis
 * kadang menerima kecocokan yang salah, dan memperketat aturan untuk semua baris demi satu baris
 * adalah pertukaran yang buruk.
 */
const HAND_REJECTS = {
  // (kosong untuk sekarang — setiap penambahan wajib menyebut apa yang dilihat)
}

async function main() {
  const { EXDB } = await import('../frontend/src/lib/exercises-data.js')
  const ours = Object.values(EXDB)

  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`gagal mengambil RepDB: ${res.status} ${DATA_URL}`)
  const raw = await res.json()
  const rep = Array.isArray(raw) ? raw : (raw.exercises || Object.values(raw))

  /**
   * Hanya entri yang punya KEDUA bingkai. Satu bingkai saja tidak cukup: UI ini dibangun di
   * sekitar dua posisi yang bisa dibolak-balik, dan satu gambar diam menjawab pertanyaan yang
   * berbeda dari yang dijanjikan.
   */
  const berilustrasi = rep.filter(e => {
    const f = e && e.images && e.images.flat
    return f && f.start && f.peak
  })

  // Kunci ambigu dibuang: dua latihan RepDB yang runtuh ke satu kunci berarti tidak ada cara
  // memilih yang benar, dan menebak berarti menampilkan gerakan yang salah.
  const buildIdx = keyFn => {
    const m = new Map(), dup = new Set()
    for (const e of berilustrasi) {
      const k = keyFn(e.name_en); if (!k) continue
      if (m.has(k) && m.get(k).id !== e.id) dup.add(k); else m.set(k, e)
    }
    dup.forEach(k => m.delete(k))
    return m
  }
  const TIER = [
    ['exact', buildIdx(exactKey), exactKey],
    ['tokenset', buildIdx(setKey), setKey],
  ]

  const map = {}
  const how = {}
  const notIdentical = []
  const rejected = []
  const aliasMisses = []

  /**
   * Indeks nama RepDB yang tepat, untuk menyelesaikan alias.
   *
   * Kalau sebuah alias tidak ketemu, itu DILAPORKAN dan build tetap jalan — dataset bisa
   * mengganti nama, dan alias yang menunjuk nama yang sudah tidak ada berarti pemeriksaan
   * manusianya tidak lagi berlaku. Diam-diam melewatkannya berarti kehilangan kecocokan tanpa
   * ada yang tahu; pola yang sama sudah menangkap satu alias buruk di skrip foto.
   */
  const byExactName = new Map(berilustrasi.map(e => [e.name_en, e]))

  for (const ex of ours) {
    if (HAND_REJECTS[ex.id]) { rejected.push(`${ex.id} ${HAND_REJECTS[ex.id]}`); continue }

    // Tingkat 0: alias yang diperiksa manusia. Menang atas aturan apa pun di bawah — kalau
    // seseorang sudah memeriksa satu baris, itu bukti yang lebih kuat.
    const aliasName = HAND_ALIASES[ex.id]
    if (aliasName) {
      const g = byExactName.get(aliasName)
      if (g) {
        map[ex.id] = [g.images.flat.start, g.images.flat.peak]
        how.alias = (how.alias || 0) + 1
        continue
      }
      aliasMisses.push(`${ex.id}  ${ex.n}  ->  "${aliasName}"`)
    }

    for (const [tag, idx, keyFn] of TIER) {
      const g = idx.get(keyFn(ex.n))
      if (!g) continue
      map[ex.id] = [g.images.flat.start, g.images.flat.peak]
      how[tag] = (how[tag] || 0) + 1
      if (exactKey(ex.n) !== exactKey(g.name_en)) notIdentical.push([ex.n, g.name_en])
      break
    }
  }

  const n = Object.keys(map).length
  console.log(`katalog kita      : ${ours.length}`)
  console.log(`RepDB berilustrasi: ${berilustrasi.length} (dari ${rep.length}, commit ${REPDB_COMMIT.slice(0, 8)})`)
  console.log(`COCOK             : ${n} (${(100 * n / ours.length).toFixed(1)}%)`)
  for (const [k, v] of Object.entries(how)) console.log(`   ${k.padEnd(11)} ${v}`)
  console.log(`tidak identik     : ${notIdentical.length} (dicetak dengan --report)`)
  console.log(`ditolak manual    : ${rejected.length}`)
  if (aliasMisses.length) {
    console.log('\nALIAS TIDAK DITEMUKAN di dataset RepDB — pemeriksaannya tidak lagi berlaku:')
    for (const m of aliasMisses) console.log('  ' + m)
    console.log('\nDataset kemungkinan mengganti nama. Periksa ulang dan perbarui HAND_ALIASES.')
  }

  if (REPORT) {
    console.log('\n=== kecocokan tidak identik — periksa mata sebelum menaikkan pin commit ===')
    for (const [a, b] of notIdentical) console.log('  ' + a.padEnd(48) + b)
  }

  if (DRY) { console.log('\n--dry: tidak menulis apa pun'); return }

  // Diurut supaya diff-nya stabil antar-jalan.
  const urut = {}
  for (const k of Object.keys(map).sort()) urut[k] = map[k]
  writeFileSync(OUT, JSON.stringify(urut, null, 0) + '\n', 'utf8')
  console.log('\nditulis: ' + OUT.pathname.slice(1))
}

main().catch(e => { console.error(e.message); process.exit(1) })
