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

  for (const ex of ours) {
    if (HAND_REJECTS[ex.id]) { rejected.push(`${ex.id} ${HAND_REJECTS[ex.id]}`); continue }
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
