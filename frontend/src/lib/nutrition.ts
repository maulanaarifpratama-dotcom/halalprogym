/**
 * Catatan makan: kalori dan makro.
 *
 * SATU KEPUTUSAN LISENSI YANG MEMBENTUK SELURUH MODUL INI: TIDAK ADA DATABASE MAKANAN BAWAAN.
 *
 * Modul ini menyimpan makanan yang DIBUAT PENGGUNA SENDIRI, dan mendaur ulangnya. Bukan karena
 * database bawaan tidak berguna — dia sangat berguna — tapi karena repo ini sudah pernah
 * membayar mahal untuk aset yang lisensinya tidak diperiksa (gambar 1.324 latihan, © Gym visual,
 * dan seluruh lapis visual harus dibangun ulang). Aturan yang lahir dari situ berlaku di sini:
 *
 *   - Tabel Komposisi Pangan Indonesia (Kemenkes) — lisensinya TIDAK JELAS untuk redistribusi
 *     komersial. Harus dipastikan sebelum satu barisnya masuk repo.
 *   - Open Food Facts — ODbL, share-alike PADA DATABASE-nya. Bisa dipakai, tapi membawa
 *     kewajiban tersendiri yang harus disadari, bukan ditemukan belakangan.
 *   - USDA FoodData Central — domain publik, aman, tapi isinya makanan Amerika. "Nasi uduk"
 *     tidak ada di sana, dan itu justru yang dicari pengguna app ini.
 *
 * Jadi yang dikirim sekarang adalah MESINNYA, lengkap dan bertes, dengan makanan buatan sendiri.
 * Menambahkan database bawaan nanti tidak mengubah satu pun fungsi di berkas ini — dia cuma
 * mengisi `foods` dari sumber lain. Itu memang cara memisahkannya.
 *
 * SEMUANYA MURNI. Tidak ada React, tidak ada localStorage, tidak ada tanggal implisit — sama
 * seperti lib/ yang lain, dan karena alasan yang sama: angka yang salah di sini tidak akan
 * terlihat sampai orang sudah lama menghitung salah.
 */

/** Satuan takaran sebuah makanan. */
export type FoodBasis = 'per100g' | 'perServing'

export interface Food {
  id: string
  name: string
  /** Dasar angkanya: per 100 gram, atau per satu porsi. */
  basis: FoodBasis
  kcal: number
  /** Gram. */
  protein?: number
  carb?: number
  fat?: number
  /** Untuk `perServing`: keterangan porsinya ("1 piring", "1 butir"). Bebas teks. */
  serving?: string
}

export interface MealEntry {
  id: string
  /** Tanggal lokal `YYYY-MM-DD`. */
  d: string
  foodId: string
  /**
   * Banyaknya. Untuk `per100g` ini GRAM; untuk `perServing` ini JUMLAH PORSI.
   *
   * Satu field untuk dua arti itu disengaja, dan basisnya ada di makanannya. Alternatifnya dua
   * field yang salah satunya selalu kosong, dan bentuk seperti itu selalu berakhir dengan
   * keduanya terisi dan tidak ada yang tahu mana yang benar.
   */
  qty: number
  /** Jam pencatatan, epoch ms. Dipakai mengelompokkan sahur/berbuka saat puasa. */
  at?: number
}

export interface Macros {
  kcal: number
  protein: number
  carb: number
  fat: number
}

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carb: 0, fat: 0 }

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Pembulatan satu desimal untuk gram; kalori dibulatkan ke bilangan bulat. */
const g1 = (n: number): number => Math.round(n * 10) / 10

/**
 * Makro untuk satu entri.
 *
 * `per100g` dikali qty/100; `perServing` dikali qty apa adanya. Makanan yang tidak ditemukan
 * mengembalikan nol, BUKAN melempar: entri bisa menunjuk makanan yang sudah dihapus, dan satu
 * baris riwayat yang menghilang jauh lebih baik daripada layar yang mati.
 */
export function macrosOf(entry: MealEntry, foods: Food[] | Record<string, Food>): Macros {
  const food = Array.isArray(foods) ? foods.find(f => f.id === entry.foodId) : foods[entry.foodId]
  if (!food) return { ...EMPTY_MACROS }
  const qty = num(entry.qty)
  const factor = food.basis === 'per100g' ? qty / 100 : qty
  return {
    kcal: Math.round(num(food.kcal) * factor),
    protein: g1(num(food.protein) * factor),
    carb: g1(num(food.carb) * factor),
    fat: g1(num(food.fat) * factor),
  }
}

/** Menjumlahkan makro. Dipisah supaya penjumlahannya bisa dites tanpa entri maupun makanan. */
export function sumMacros(list: Macros[]): Macros {
  const out = list.reduce((a, m) => ({
    kcal: a.kcal + num(m.kcal),
    protein: a.protein + num(m.protein),
    carb: a.carb + num(m.carb),
    fat: a.fat + num(m.fat),
  }), { ...EMPTY_MACROS })
  return { kcal: Math.round(out.kcal), protein: g1(out.protein), carb: g1(out.carb), fat: g1(out.fat) }
}

/** Entri pada satu tanggal, terurut jam. Entri tanpa jam ditaruh di akhir, bukan dibuang. */
export function entriesOn(meals: MealEntry[] | undefined, iso: string): MealEntry[] {
  return (meals || [])
    .filter(m => m && m.d === iso)
    .slice()
    .sort((a, b) => (num(a.at) || Number.MAX_SAFE_INTEGER) - (num(b.at) || Number.MAX_SAFE_INTEGER))
}

/** Total makro satu hari. */
export function totalsOn(
  meals: MealEntry[] | undefined,
  foods: Food[] | undefined,
  iso: string
): Macros {
  return sumMacros(entriesOn(meals, iso).map(e => macrosOf(e, foods || [])))
}

export interface NutritionTarget {
  kcal?: number
  protein?: number
}

export interface TargetProgress {
  /** 0..1, dijepit — bar progres tidak boleh melewati ujungnya. */
  ratio: number
  /** Sisa menuju target. Negatif berarti sudah lewat. */
  left: number
  over: boolean
}

/**
 * Kemajuan terhadap target.
 *
 * `ratio` dijepit ke 0..1 supaya bar progres berhenti di ujungnya, TAPI `left` dan `over` tidak
 * dijepit — orang perlu tahu berapa banyak dia lewat, dan bar yang penuh saja tidak
 * mengatakannya.
 */
export function progressTo(total: number, target: number | undefined): TargetProgress | null {
  const t = num(target)
  if (t <= 0) return null
  const v = num(total)
  return { ratio: Math.min(1, Math.max(0, v / t)), left: Math.round(t - v), over: v > t }
}

/**
 * Kelompok waktu makan di hari puasa: sahur (sebelum imsak) dan berbuka (setelah magrib).
 *
 * Ini bukan hiasan. Di hari puasa seluruh asupan masuk ke dua jendela, dan total harian saja
 * menyembunyikan pertanyaan yang sebenarnya: apakah sahurnya cukup? Entri di antara keduanya
 * masuk 'other' — mungkin salah catat, mungkin memang tidak berpuasa hari itu, dan app tidak
 * berhak menuduh.
 */
export type MealWindow = 'sahur' | 'iftar' | 'other'

export function windowOf(
  entry: MealEntry,
  fasting: { from: Date; to: Date } | null
): MealWindow {
  if (!fasting) return 'other'
  const at = num(entry.at)
  if (!at) return 'other'
  if (at < fasting.from.getTime()) return 'sahur'
  if (at >= fasting.to.getTime()) return 'iftar'
  return 'other'
}

/** Total per jendela. Kunci yang tidak punya entri tetap ada, dengan nol — bukan hilang. */
export function totalsByWindow(
  entries: MealEntry[],
  foods: Food[],
  fasting: { from: Date; to: Date } | null
): Record<MealWindow, Macros> {
  const out: Record<MealWindow, Macros> = {
    sahur: { ...EMPTY_MACROS }, iftar: { ...EMPTY_MACROS }, other: { ...EMPTY_MACROS },
  }
  const buckets: Record<MealWindow, Macros[]> = { sahur: [], iftar: [], other: [] }
  for (const e of entries) buckets[windowOf(e, fasting)].push(macrosOf(e, foods))
  for (const k of ['sahur', 'iftar', 'other'] as MealWindow[]) out[k] = sumMacros(buckets[k])
  return out
}

/**
 * Kenapa sebuah makanan tidak bisa disimpan. `null` berarti valid.
 *
 * KODE, BUKAN TEKS. Percobaan pertama saya mengembalikan kalimat Inggris langsung dari sini,
 * dan itu salah dua kali: lib/ jadi memiliki teks UI (padahal seluruh lib/ ini framework-free
 * dan bebas i18n), dan kunci terjemahannya jadi tidak terlihat oleh scripts/audit-locale-keys.mjs
 * — dia mencari literal di dalam `t(`, dan kunci yang lahir di lib lalu dilewatkan `t(variabel)`
 * tidak pernah muncul di situ. Dengan kode, teksnya hidup di tempat pemakaiannya sebagai
 * literal, dan audit melihatnya.
 */
export type FoodError = 'name' | 'number'

/**
 * Nilai negatif DITOLAK, bukan dijepit ke nol: "-50 kalori" hampir pasti salah ketik, dan
 * menyimpannya sebagai 0 diam-diam membuat orang mengira makanannya tercatat benar.
 */
export function validateFood(f: Partial<Food>): FoodError | null {
  if (!String(f.name || '').trim()) return 'name'
  if (!Number.isFinite(Number(f.kcal)) || Number(f.kcal) < 0) return 'number'
  for (const k of ['protein', 'carb', 'fat'] as const) {
    const v = f[k]
    if (v === undefined || v === null || v === ('' as unknown)) continue
    if (!Number.isFinite(Number(v)) || Number(v) < 0) return 'number'
  }
  return null
}
