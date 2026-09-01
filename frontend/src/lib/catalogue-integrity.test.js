import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EXDB } from './exercises-data.js'
import INSTRUCTIONS from './exercises-instructions.js'
import MEDIA from './exercise-media.json'

/**
 * Katalog 1.324 latihan: LENGKAP dan BERBENTUK.
 *
 * KENAPA INI ADA
 *
 * Katalognya di-generate (`scripts/split-exercise-data.mjs`), dan berkas yang di-generate adalah
 * berkas yang paling mudah rusak diam-diam: satu field yang lupa disalin tidak membuat build
 * gagal, tidak membuat typecheck gagal, dan tidak membuat satu pun tes yang ada merah. Yang
 * terjadi adalah `undefined` yang mengalir sampai ke layar.
 *
 * Tes yang sudah ada memeriksa hal-hal yang berbeda dan tetap perlu: aksara (`exercises-data`),
 * keutuhan pemisahan instruksi (`exercises-split`), pencocokan pencarian (`exercises`), dan
 * pemetaan otot (`muscles`, `exercise-muscle-batch-*`). Yang TIDAK diperiksa siapa pun: apakah
 * setiap catatan punya semua field yang dibaca UI.
 *
 * Angka 1.324 dipatok dengan sengaja. Kalau dia turun, ada latihan yang hilang; kalau dia naik,
 * ada yang masuk tanpa melewati pemeriksaan lain di repo ini. Dua-duanya harus dilihat orang.
 */

// `EXDB` adalah ARRAY, bukan objek beri-kunci — diperiksa ke sumbernya, bukan diasumsikan.
// Versi pertama tes ini memakai `Object.values` atas import default dan langsung gagal, dan itu
// justru berguna: bentuk berkas yang di-generate harus dibaca, bukan ditebak.
const list = EXDB

/** Field yang benar-benar dibaca UI, dan apa yang rusak kalau salah satunya hilang. */
const WAJIB = [
  ['id', 'kunci untuk beban tersimpan, catatan, dan peta foto'],
  ['n', 'nama yang tampil di setiap daftar dan setiap baris riwayat'],
  ['bp', 'bagian tubuh — dipakai filter Library dan ikon cadangan thumbnail'],
  ['eq', 'alat — dipakai filter profil peralatan'],
  ['tg', 'otot primer — dipakai diagram otot dan penyeimbang otot'],
]

describe('katalog latihan lengkap dan berbentuk', () => {
  it('tepat 1.324 latihan, dan angkanya dipatok', () => {
    expect(list.length).toBe(1324)
  })

  it('setiap id unik', () => {
    // Id ganda berarti dua latihan berbagi beban tersimpan, catatan, dan foto demo — dan yang
    // kedua menimpa yang pertama tanpa suara.
    const ids = list.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('setiap latihan punya SEMUA field yang dibaca UI', () => {
    for (const [field, kenapa] of WAJIB) {
      const kosong = list.filter(e => !e[field] || String(e[field]).trim() === '')
      expect(
        kosong.map(e => e.id + ' (' + (e.n || '?') + ')').slice(0, 8),
        'field `' + field + '` hilang — ' + kenapa
      ).toEqual([])
    }
  })

  it('otot sekunder selalu array, bukan string atau undefined', () => {
    // `sm` dipetakan dengan .map/.filter di ExerciseAnatomy. String akan ter-iterasi per
    // karakter; undefined melempar.
    const salah = list.filter(e => !Array.isArray(e.sm))
    expect(salah.map(e => e.id).slice(0, 8)).toEqual([])
  })

  it('id berbentuk seragam — empat digit', () => {
    // Peta foto (`exercise-media.json`) dan setiap kunci di `exWeights` memakai id ini sebagai
    // string. Bentuk yang menyimpang berarti pencarian yang gagal tanpa error.
    const salah = list.filter(e => !/^\d{4}$/.test(String(e.id)))
    expect(salah.map(e => e.id).slice(0, 8)).toEqual([])
  })

  it('nama tidak punya spasi berlebih di ujung', () => {
    // Nama dipakai untuk pencocokan impor dari app lain. Spasi di ujung membuat kecocokan yang
    // seharusnya persis jadi gagal.
    const salah = list.filter(e => e.n !== e.n.trim())
    expect(salah.map(e => JSON.stringify(e.n)).slice(0, 8)).toEqual([])
  })

  it('setiap latihan punya instruksi Inggris', () => {
    // Ini yang membuat layar detail tidak pernah kosong di bahasa default. `exercises-split`
    // sudah memeriksa arah sebaliknya (instruksi tidak ikut di katalog); ini arah majunya.
    const tanpa = list.filter(e => !INSTRUCTIONS[e.id] || !INSTRUCTIONS[e.id].length)
    expect(tanpa.map(e => e.id + ' ' + e.n).slice(0, 8)).toEqual([])
  })

  it('setiap langkah instruksi berisi teks, bukan string kosong', () => {
    const salah = []
    for (const [id, steps] of Object.entries(INSTRUCTIONS)) {
      if (steps.some(s => typeof s !== 'string' || !s.trim())) salah.push(id)
    }
    expect(salah.slice(0, 8)).toEqual([])
  })
})

describe('peta foto demo menunjuk latihan yang benar-benar ada', () => {
  it('setiap id di peta media ada di katalog', () => {
    // Peta dibangun skrip terpisah terhadap commit free-exercise-db yang di-pin. Id yang tidak
    // ada di katalog berarti peta dan katalog dibangun dari dua sumber yang berbeda — dan
    // akibatnya foto yang tidak pernah tampil, tanpa satu pun error.
    const idKatalog = new Set(list.map(e => e.id))
    const yatim = Object.keys(MEDIA).filter(id => !idKatalog.has(id))
    expect(yatim.slice(0, 8)).toEqual([])
  })

  it('setiap entri peta punya minimal satu bingkai', () => {
    const kosong = Object.entries(MEDIA).filter(([, f]) => !Array.isArray(f) || !f.length)
    expect(kosong.map(([id]) => id).slice(0, 8)).toEqual([])
  })

  it('cakupan foto dipatok PERSIS, bukan rentang', () => {
    // 338 itu hasil aturan pencocokan yang konservatif, dan itu keputusan yang tercatat.
    // Dipatok persis, bukan sebagai rentang: kenaikan berarti seseorang melonggarkan aturannya
    // — mungkin dengan skor kemiripan, yang sudah ditolak karena "rear delt raise" jadi "rear
    // delt ROW" dan orang meniru demo yang dia lihat. Perubahan angka ini harus dilihat orang.
    //
    // 340 -> 338 -> 376. Turunnya disengaja, naiknya juga.
    //
    // NAIK 338 -> 376 (audit 2026-09-02, tahap kedua): 425 usulan disaring jadi 60 kandidat
    // oleh penjaga kata-penentu-varian, lalu diperiksa satu per satu — DELAPAN di antaranya
    // dengan MELIHAT FOTONYA, dan dua foto membalikkan keputusan yang akan diambil dari
    // metadata saja: 'Squat with Bands' bertanda equipment=barbell padahal fotonya pita tanpa
    // barbel, dan 'Goblet Squat' memperlihatkan kettlebell sehingga versi dumbbell ditolak.
    // Ditambah satu aturan: tokenset yang membuang kata gramatikal.
    //
    // TURUN 340 -> 338 sebelumnya, dan itu juga disengaja. Audit 2026-09-02 memeriksa mata seluruh 186 kecocokan
    // yang namanya tidak identik, dan menemukan tujuh yang memasang foto ALAT YANG BERBEDA:
    // Smith machine dipasangkan foto mesin tuas (`smith shoulder press` -> Leverage Shoulder
    // Press), dipasangkan latihan tanpa alat (`smith chair squat` -> Chair Squat), dan satu baris
    // yang data sumbernya sendiri tidak konsisten (`lever bent over row` bertanda eq=barbell).
    // Ketujuhnya masuk `HAND_REJECTS` dan sekarang mendapat diagram otot.
    //
    // Lima kecocokan BENAR masuk di saat yang sama, dari normalisasi 'kettlebells' -> 'kettlebell'
    // yang sebelumnya menutup jalur kata untuk seluruh kettlebell. Jadi 7 salah keluar, 5 benar
    // masuk: cakupan turun 0,2 poin dan ketepatannya naik. Itu pertukaran yang aturan di repo ini
    // memang minta — orang meniru demo yang dia lihat.
    expect(Object.keys(MEDIA).length).toBe(376)
  })

  it('angka yang DITULIS di dokumentasi sama dengan yang sebenarnya', () => {
    // Repo ini berdiri di atas dokumentasi yang padat, dan itu cuma berguna kalau angkanya
    // benar. Dokumen sempat menulis "329 dari 1.324 (24,8%)" sementara petanya berisi 340
    // (25,7%) — basi 11 latihan, dan tidak ada yang bisa melihatnya. Sekarang bisa.
    const src = readFileSync(new URL('./exercise-media.ts', import.meta.url), 'utf8')
    const n = Object.keys(MEDIA).length
    const pct = (n / list.length * 100).toFixed(1).replace('.', ',')
    expect(src, 'perbarui komentar di exercise-media.ts').toContain(String(n) + ' DARI 1.324')
    expect(src, 'persentase di komentar sudah basi').toContain('(' + pct + '%)')
  })
})

describe('nilai kategori tetap sedikit dan bisa difilter', () => {
  it('bagian tubuh: himpunan kecil yang tertutup', () => {
    // Filter Library menampilkan chip per bagian tubuh. Nilai baru yang masuk diam-diam berarti
    // chip yang tidak diterjemahkan — persis bug `full body` yang tampil Inggris di 13 bahasa.
    const bp = [...new Set(list.map(e => e.bp))].sort()
    expect(bp.length).toBe(10)
    expect(bp).toContain('waist')
    expect(bp).toContain('cardio')
  })

  it('alat: himpunan tertutup, dan jumlahnya dipatok', () => {
    // Profil peralatan menyaring dengan nilai ini. Nilai baru berarti latihan yang tidak pernah
    // cocok dengan profil mana pun, jadi tidak pernah muncul.
    expect(new Set(list.map(e => e.eq)).size).toBe(28)
  })
})
