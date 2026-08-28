import { describe, expect, it } from 'vitest'
import {
  buildPrompt, draftToFood, extractJson, macrosDisagree, parseAiFood, toDraft,
} from './ai-nutrition.js'
import { macrosOf } from './nutrition.js'

/**
 * Keluaran model adalah DATA YANG TIDAK BOLEH DIPERCAYA, dan berkas ini yang membuktikan
 * perlakuannya begitu.
 *
 * Satu `NaN` yang lolos dari sini menular ke seluruh total harian, dan satu angka mustahil yang
 * lolos akan tampil sebagai fakta di grafik orang. Jadi yang diuji bukan "apakah parsing-nya
 * jalan" tapi "apa yang terjadi kalau modelnya mengembalikan sampah".
 */
const ok = {
  name: 'Nasi uduk', grams: 250, unit: 'porsi',
  kcal: 480, protein: 9, carb: 68, fat: 18,
}

describe('buildPrompt', () => {
  it('meminta JSON saja, dan menyebut skemanya', () => {
    const p = buildPrompt('nasi uduk satu porsi')
    expect(p).toContain('HANYA')
    expect(p).toContain('"kcal"')
    expect(p).toContain('nasi uduk satu porsi')
  })

  it('meminta nama Indonesia — bukan terjemahan Inggris', () => {
    // Ini alasan pendekatan ini dipilih: USDA tidak punya nasi uduk. Kalau modelnya menjawab
    // "coconut milk rice", kita kehilangan hal yang membuatnya berguna di sini.
    expect(buildPrompt('x')).toContain('Bahasa Indonesia')
  })

  it('memotong deskripsi yang kepanjangan', () => {
    // Teks pengguna masuk ke prompt. Tanpa batas, satu paste besar jadi tagihan token dan
    // jawaban yang tidak fokus.
    const p = buildPrompt('a'.repeat(5000))
    expect(p.length).toBeLessThan(1500)
  })

  it('spasi di ujung deskripsi dibuang', () => {
    expect(buildPrompt('   nasi   ')).toContain('nasi')
    expect(buildPrompt('   nasi   ').endsWith('nasi')).toBe(true)
  })
})

describe('extractJson', () => {
  it('membaca JSON telanjang', () => {
    expect(extractJson(JSON.stringify(ok))?.name).toBe('Nasi uduk')
  })

  it('membaca JSON di dalam blok kode', () => {
    // Model sering melakukan ini walau diminta tidak.
    const raw = '```json\n' + JSON.stringify(ok) + '\n```'
    expect(extractJson(raw)?.name).toBe('Nasi uduk')
  })

  it('membaca JSON setelah kalimat pembuka', () => {
    const raw = 'Tentu! Berikut perkiraannya:\n' + JSON.stringify(ok)
    expect(extractJson(raw)?.name).toBe('Nasi uduk')
  })

  it('null untuk jawaban tanpa JSON — bukan angka tebakan', () => {
    for (const raw of ['', 'maaf saya tidak tahu', '{', '}{', 'null', '[1,2]']) {
      expect(extractJson(raw), JSON.stringify(raw)).toBe(null)
    }
  })

  it('null untuk JSON rusak, tanpa melempar', () => {
    expect(extractJson('{"name": "x", }garbage{')).toBe(null)
  })
})

describe('toDraft — validasi', () => {
  it('jawaban wajar lolos apa adanya', () => {
    const r = toDraft(ok)!
    expect(r.draft).toEqual({
      name: 'Nasi uduk', gramsPerServing: 250, servingUnit: 'porsi',
      kcal: 480, protein: 9, carb: 68, fat: 18,
    })
    expect(r.warnings).toEqual([])
  })

  it('null kalau tidak ada nama — makanan tanpa nama tidak bisa disimpan', () => {
    expect(toDraft({ ...ok, name: '' })).toBe(null)
    expect(toDraft({ ...ok, name: '   ' })).toBe(null)
    expect(toDraft(null)).toBe(null)
  })

  it('TIDAK PERNAH mengembalikan NaN, apa pun bentuk jawabannya', () => {
    // Satu NaN di state menular ke seluruh total harian, dan tidak ada yang menangkapnya.
    const sampah = [
      { name: 'x' },
      { name: 'x', kcal: 'banyak', grams: 'sepiring', protein: null, carb: undefined, fat: {} },
      { name: 'x', kcal: NaN, grams: NaN },
      { name: 'x', kcal: Infinity, grams: 100 },
    ]
    for (const s of sampah) {
      const r = toDraft(s as Record<string, unknown>)!
      for (const v of Object.values(r.draft)) {
        if (typeof v === 'number') expect(Number.isFinite(v), JSON.stringify(s)).toBe(true)
      }
    }
  })

  it('angka negatif jadi nol, bukan negatif', () => {
    const r = toDraft({ ...ok, kcal: -100, protein: -5 })!
    expect(r.draft.kcal).toBe(0)
    expect(r.draft.protein).toBe(0)
  })

  it('berat porsi yang hilang dipakai default, DAN dikatakan', () => {
    const r = toDraft({ ...ok, grams: 0 })!
    expect(r.draft.gramsPerServing).toBeGreaterThan(0)
    expect(r.warnings).toContain('no-grams')
  })

  it('kalori di atas batas fisik dijepit, DAN dikatakan', () => {
    // Lemak murni ~900 kkal/100 g. Tidak ada makanan yang melewatinya.
    const r = toDraft({ ...ok, grams: 100, kcal: 5000, protein: 0, carb: 0, fat: 0 })!
    expect(r.draft.kcal).toBeLessThanOrEqual(900)
    expect(r.warnings).toContain('clamped')
  })

  it('batas diperiksa PER 100 GRAM, bukan absolut', () => {
    // 1800 kkal untuk 400 g itu wajar (450/100 g). Batas absolut akan menolaknya salah.
    const r = toDraft({ name: 'x', grams: 400, kcal: 1800, protein: 40, carb: 180, fat: 80 })!
    expect(r.draft.kcal).toBe(1800)
    expect(r.warnings).not.toContain('clamped')
  })

  it('makro di atas 100 g per 100 g dijepit', () => {
    const r = toDraft({ name: 'x', grams: 100, kcal: 400, protein: 250, carb: 0, fat: 0 })!
    expect(r.draft.protein).toBeLessThanOrEqual(100)
    expect(r.warnings).toContain('clamped')
  })

  it('porsi yang tidak masuk akal besarnya dijepit', () => {
    const r = toDraft({ ...ok, grams: 99999 })!
    expect(r.draft.gramsPerServing).toBeLessThanOrEqual(2000)
    expect(r.warnings).toContain('clamped')
  })
})

describe('toDraft — konsistensi Atwater', () => {
  it('menandai kalori yang bertentangan dengan makronya', () => {
    // protein 9 + karbo 68 + lemak 18 = 4*9 + 4*68 + 9*18 = 470 kkal. Kalau modelnya bilang
    // 150, salah satunya salah — dan pengguna berhak tahu sebelum menyimpannya, bukan
    // menemukannya sebulan kemudian dari grafik yang tidak masuk akal.
    const r = toDraft({ ...ok, kcal: 150 })!
    expect(r.warnings).toContain('macros-mismatch')
  })

  it('tidak menandai selisih kecil — pembulatan itu normal', () => {
    // 470 dari makro vs 480 tertulis: 2%. Menandai ini berarti menandai hampir semuanya.
    expect(toDraft(ok)!.warnings).not.toContain('macros-mismatch')
  })

  it('TIDAK menandai makanan yang cuma melaporkan kalori', () => {
    // Itu sah — banyak label cuma menulis kalori. Menandainya sebagai bertentangan bikin
    // peringatannya jadi bising, dan peringatan yang bising akan diabaikan.
    const r = toDraft({ name: 'x', grams: 100, kcal: 300, protein: 0, carb: 0, fat: 0 })!
    expect(r.warnings).not.toContain('macros-mismatch')
  })

  it('kalori nol dengan makro tidak dibagi nol', () => {
    const r = toDraft({ name: 'x', grams: 100, kcal: 0, protein: 10, carb: 10, fat: 10 })!
    expect(Number.isFinite(r.draft.kcal)).toBe(true)
  })
})

describe('macrosDisagree — dipisah supaya UI bisa menghitungnya ULANG', () => {
  // Peringatan yang dibekukan dari jawaban pertama model adalah bug yang sudah terlihat di
  // layar: orang membetulkan kalorinya sampai cocok dengan makronya, dan app tetap bilang
  // keduanya tidak cocok. Peringatan yang tidak hilang setelah dibetulkan mengajari orang
  // mengabaikan peringatan — dan peringatan yang diabaikan sama saja dengan tidak ada.
  it('bertentangan saat selisihnya jauh', () => {
    expect(macrosDisagree(200, 14, 72, 22)).toBe(true)
  })

  it('TIDAK bertentangan begitu kalorinya dibetulkan', () => {
    // 14*4 + 72*4 + 22*9 = 542. Ini persis langkah yang dilakukan pengguna di layar tinjau.
    expect(macrosDisagree(540, 14, 72, 22)).toBe(false)
  })

  it('menerima string, karena kolom yang sedang diedit memang berisi string', () => {
    expect(macrosDisagree('540', '14', '72', '22')).toBe(false)
    expect(macrosDisagree('200', '14', '72', '22')).toBe(true)
  })

  it('kolom yang dikosongkan tidak jadi peringatan palsu', () => {
    for (const empty of ['', null, undefined, 'abc']) {
      expect(macrosDisagree(empty, empty, empty, empty), String(empty)).toBe(false)
      expect(macrosDisagree(300, empty, empty, empty), String(empty)).toBe(false)
    }
  })

  it('makanan yang cuma melaporkan kalori tidak ditandai', () => {
    expect(macrosDisagree(300, 0, 0, 0)).toBe(false)
  })

  it('sepakat dengan toDraft — cuma ada satu definisi "bertentangan"', () => {
    const bad = toDraft({ name: 'x', grams: 300, kcal: 200, protein: 14, carb: 72, fat: 22 })!
    expect(bad.warnings.includes('macros-mismatch'))
      .toBe(macrosDisagree(bad.draft.kcal, bad.draft.protein, bad.draft.carb, bad.draft.fat))
  })
})

describe('parseAiFood', () => {
  it('jalur lengkap dari teks jawaban model', () => {
    const raw = 'Berikut:\n```json\n' + JSON.stringify(ok) + '\n```'
    expect(parseAiFood(raw)?.draft.name).toBe('Nasi uduk')
  })

  it('null untuk jawaban yang tidak bisa dipakai', () => {
    expect(parseAiFood('maaf, saya tidak bisa membantu')).toBe(null)
  })
})

describe('draftToFood', () => {
  const draft = toDraft(ok)!.draft

  it('disimpan per PORSI, bukan per 100 g', () => {
    // Model memperkirakan satu porsi yang dideskripsikan orang. Menyimpannya per-100-g berarti
    // membagi lalu mengalikan kembali — dua pembulatan untuk angka yang sejak awal estimasi.
    const f = draftToFood(draft, 'f1')
    expect(f.basis).toBe('perServing')
    expect(f.kcal).toBe(480)
  })

  it('beratnya tetap tercatat di keterangan porsinya', () => {
    // Tidak ada informasi yang hilang: orang masih bisa melihat 250 g itu.
    expect(draftToFood(draft, 'f1').serving).toContain('250 g')
    expect(draftToFood(draft, 'f1').serving).toContain('porsi')
  })

  it('satuan yang tidak diberi model jatuh ke "porsi", bukan kosong', () => {
    const f = draftToFood({ ...draft, servingUnit: '' }, 'f1')
    expect(f.serving).toContain('porsi')
  })

  it('menyatu dengan perhitungan yang sudah ada', () => {
    // Bukti bahwa pendekatan AI cuma MENGISI `foods`, bukan mengubah mesinnya. Satu porsi = 480,
    // dua porsi = 960 — lewat macrosOf yang sudah ada dan sudah bertes.
    const f = draftToFood(draft, 'f1')
    const entry = { id: 'e', d: '2026-08-28', foodId: 'f1', qty: 2 }
    expect(macrosOf(entry, [f]).kcal).toBe(960)
  })
})
