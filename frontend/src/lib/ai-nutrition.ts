/**
 * Perkiraan gizi dari deskripsi makanan, lewat LLM yang API key-nya milik pengguna sendiri.
 *
 * KENAPA PENDEKATAN INI, DAN KENAPA DIA MENJAWAB BLOCKER YANG SUDAH TERCATAT
 *
 * `lib/nutrition.ts` sengaja tidak punya database makanan bawaan, dan alasannya lisensi: TKPI
 * Kemenkes tidak jelas untuk komersial, Open Food Facts ODbL share-alike, USDA aman tapi isinya
 * makanan Amerika. Yang terakhir itu yang paling menentukan — pengguna app ini mencari "nasi
 * uduk", dan itu tidak ada di USDA.
 *
 * Pendekatan ini (dari fud-ai, MIT, github.com/apoorvdarshan/fud-ai) menghindari pertanyaannya
 * sepenuhnya: kita TIDAK MENDISTRIBUSIKAN DATA MAKANAN SAMA SEKALI. Pengguna membawa API key
 * sendiri, request pergi langsung dari perangkatnya ke provider pilihannya, dan tidak ada yang
 * lewat server kita — kita memang tidak punya server. Nol data yang dikirim berarti nol paparan
 * lisensi. Dan LLM tahu nasi uduk.
 *
 * DUA ATURAN YANG MEMBENTUK SELURUH BERKAS INI
 *
 * 1. **Keluaran model adalah DATA, bukan perintah, dan tidak boleh dipercaya.** Dia di-parse,
 *    divalidasi ke rentang yang masuk akal secara fisik, dan diperiksa konsistensinya. Angka
 *    yang lolos tetap ESTIMASI, dan pengguna yang mengonfirmasinya.
 *
 * 2. **Berkas ini MURNI — tidak ada jaringan di sini.** Menyusun prompt dan mem-parse jawaban
 *    adalah tempat kesalahan yang sebenarnya bersembunyi, dan keduanya bisa dites tanpa satu
 *    request pun. Lapis jaringannya di lib/ai-client.ts.
 */
import type { Food, FoodBasis } from './nutrition.js'

/** Batas fisik. Lemak murni ~900 kkal/100 g; tidak ada makanan yang melewatinya. */
const MAX_KCAL_PER_100G = 900
const MAX_GRAM_PER_100G = 100

/**
 * Faktor Atwater: protein 4, karbohidrat 4, lemak 9 kkal per gram.
 *
 * Dipakai sebagai PEMERIKSAAN KONSISTENSI, bukan untuk menghitung ulang kalorinya. Kalau makro
 * dan kalori yang dikembalikan model saling bertentangan jauh, salah satunya salah — dan
 * pengguna berhak tahu itu sebelum menyimpannya, bukan menemukannya sebulan kemudian dari
 * grafik yang tidak masuk akal.
 */
const ATWATER = { protein: 4, carb: 4, fat: 9 } as const

/** Selisih yang masih wajar antara kalori tertulis dan kalori dari makro. */
const ATWATER_TOLERANCE = 0.25

/**
 * Apakah kalori dan makro saling bertentangan di luar toleransi.
 *
 * DIEKSPOR supaya UI bisa MENGHITUNGNYA ULANG saat pengguna mengedit, bukan menampilkan
 * peringatan yang dibekukan dari jawaban pertama model. Peringatan beku itu bug yang sudah
 * terlihat di layar: orang membetulkan kalorinya sampai cocok dengan makronya, dan app tetap
 * bilang keduanya tidak cocok. Peringatan yang tidak hilang setelah dibetulkan mengajari orang
 * mengabaikan peringatan — dan peringatan yang diabaikan sama saja dengan tidak ada.
 *
 * `false` kalau tidak ada makro sama sekali: banyak label memang cuma menulis kalori, dan itu
 * sah, bukan pertentangan.
 */
export function macrosDisagree(kcal: unknown, protein: unknown, carb: unknown, fat: unknown): boolean {
  const c = num(kcal)
  const fromMacros = num(protein) * ATWATER.protein + num(carb) * ATWATER.carb + num(fat) * ATWATER.fat
  if (fromMacros <= 0 || c <= 0) return false
  return Math.abs(fromMacros - c) / c > ATWATER_TOLERANCE
}

/** Satuan tampilan yang benar-benar dipakai orang di Indonesia. Grams tetap sumber kebenaran. */
export const SERVING_UNITS_ID = [
  'porsi', 'piring', 'mangkuk', 'gelas', 'potong', 'butir', 'buah', 'lembar', 'tusuk', 'sendok makan',
] as const

export interface AiFoodDraft {
  /** Nama yang dikenali model. Selalu bisa diubah pengguna. */
  name: string
  /** Berat satu porsi dalam gram. Sumber kebenaran untuk semua perhitungan. */
  gramsPerServing: number
  /** Satuan yang ditampilkan ("piring", "potong"). Kosong berarti tampilkan gram apa adanya. */
  servingUnit: string
  kcal: number
  protein: number
  carb: number
  fat: number
}

export type AiWarning =
  /** Kalori dan makro saling bertentangan di luar toleransi. */
  | 'macros-mismatch'
  /** Angkanya dijepit ke batas fisik — model mengembalikan sesuatu yang mustahil. */
  | 'clamped'
  /** Model tidak memberi berat porsi, jadi dipakai default. */
  | 'no-grams'

export interface AiFoodResult {
  draft: AiFoodDraft
  warnings: AiWarning[]
}

/**
 * Prompt untuk model.
 *
 * Sengaja meminta JSON dan HANYA JSON, dengan skema yang disebut eksplisit. Bukan karena model
 * tidak bisa menulis prosa, tapi karena prosa harus di-parse dengan tebakan, dan tebakan atas
 * angka gizi berakhir di grafik orang.
 *
 * Bahasa Indonesia disebut di dalam prompt supaya nama yang kembali memakai nama yang dipakai
 * orang ("nasi uduk", bukan "coconut milk rice"), dan supaya satuan porsinya satuan warung.
 */
export function buildPrompt(description: string): string {
  return [
    'Kamu ahli gizi. Perkirakan kandungan gizi makanan Indonesia yang dideskripsikan pengguna.',
    '',
    'Jawab HANYA dengan satu objek JSON, tanpa penjelasan, tanpa blok kode:',
    '{"name":string,"grams":number,"unit":string,"kcal":number,"protein":number,"carb":number,"fat":number}',
    '',
    '- name: nama makanannya dalam Bahasa Indonesia, seperti yang orang menyebutnya.',
    '- grams: berat SATU porsi yang dideskripsikan, dalam gram.',
    '- unit: satuan yang wajar untuk porsi itu (porsi, piring, mangkuk, potong, butir, gelas).',
    '- kcal, protein, carb, fat: untuk SATU porsi itu. Makro dalam gram.',
    '- Kalau deskripsinya menyebut jumlah ("2 potong"), hitung untuk jumlah itu.',
    '- Jangan mengarang presisi. Angka bulat sudah cukup.',
    '',
    'Deskripsi pengguna:',
    description.trim().slice(0, 500),
  ].join('\n')
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Mengambil objek JSON dari jawaban model.
 *
 * Model sering membungkusnya di blok kode atau menambah satu kalimat pembuka walau diminta
 * tidak. Jadi yang dicari kurung kurawal terluar, bukan berharap seluruh jawabannya JSON.
 * `null` kalau tidak ada JSON yang bisa dibaca — pemanggil menampilkan kegagalan, bukan angka
 * hasil tebakan.
 */
export function extractJson(raw: string): Record<string, unknown> | null {
  const s = String(raw || '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(s.slice(start, end + 1))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Berat porsi default kalau model tidak memberinya. Satu porsi makanan Indonesia kasar. */
const DEFAULT_GRAMS = 100

/**
 * Mengubah jawaban model jadi draf yang bisa ditinjau, plus daftar peringatan.
 *
 * TIDAK PERNAH melempar dan tidak pernah mengembalikan NaN: jawaban model bisa berbentuk apa
 * pun, dan satu `NaN` yang lolos ke state akan menular ke seluruh total harian.
 */
export function toDraft(obj: Record<string, unknown> | null): AiFoodResult | null {
  if (!obj) return null

  const name = String(obj.name ?? '').trim().slice(0, 60)
  if (!name) return null

  const warnings: AiWarning[] = []

  let grams = Math.round(num(obj.grams))
  if (grams <= 0) { grams = DEFAULT_GRAMS; warnings.push('no-grams') }
  // Satu porsi di atas 2 kg bukan porsi. Dijepit, dan dikatakan.
  if (grams > 2000) { grams = 2000; warnings.push('clamped') }

  const per100 = (v: number): number => (v * 100) / grams
  let kcal = Math.max(0, Math.round(num(obj.kcal)))
  let protein = Math.max(0, Math.round(num(obj.protein) * 10) / 10)
  let carb = Math.max(0, Math.round(num(obj.carb) * 10) / 10)
  let fat = Math.max(0, Math.round(num(obj.fat) * 10) / 10)

  // Batas fisik, diperiksa PER 100 GRAM — batas absolut tidak bermakna tanpa beratnya.
  if (per100(kcal) > MAX_KCAL_PER_100G) {
    kcal = Math.round((MAX_KCAL_PER_100G * grams) / 100)
    warnings.push('clamped')
  }
  for (const [key, value] of [['protein', protein], ['carb', carb], ['fat', fat]] as const) {
    if (per100(value) <= MAX_GRAM_PER_100G) continue
    const capped = Math.round(((MAX_GRAM_PER_100G * grams) / 100) * 10) / 10
    if (key === 'protein') protein = capped
    if (key === 'carb') carb = capped
    if (key === 'fat') fat = capped
    if (!warnings.includes('clamped')) warnings.push('clamped')
  }

  // Konsistensi Atwater, lewat helper yang sama yang dipakai UI saat pengguna mengedit —
  // supaya tidak ada dua definisi "bertentangan" yang bisa berbeda.
  if (macrosDisagree(kcal, protein, carb, fat)) warnings.push('macros-mismatch')

  const unit = String(obj.unit ?? '').trim().toLowerCase().slice(0, 20)

  return {
    draft: { name, gramsPerServing: grams, servingUnit: unit, kcal, protein, carb, fat },
    warnings,
  }
}

/** Jalur lengkap: teks jawaban model -> draf tertinjau. */
export const parseAiFood = (raw: string): AiFoodResult | null => toDraft(extractJson(raw))

/**
 * Mengubah draf jadi `Food` yang bisa disimpan.
 *
 * `perServing`, bukan `per100g`, dan itu keputusan: model memperkirakan SATU PORSI yang
 * dideskripsikan orang, dan menyimpannya per-100-g berarti membagi lalu mengalikan kembali —
 * dua pembulatan untuk angka yang sejak awal estimasi. Beratnya tetap tercatat di keterangan
 * porsinya, jadi tidak ada informasi yang hilang.
 */
export function draftToFood(draft: AiFoodDraft, id: string): Food {
  const basis: FoodBasis = 'perServing'
  const unit = draft.servingUnit || 'porsi'
  return {
    id,
    name: draft.name,
    basis,
    serving: unit + ' (' + draft.gramsPerServing + ' g)',
    kcal: draft.kcal,
    protein: draft.protein,
    carb: draft.carb,
    fat: draft.fat,
  }
}
