/**
 * Katalog makanan bawaan: bahan pokok Indonesia (USDA) + produk ritel (Open Food Facts).
 *
 * =============================================================================================
 * KENAPA BERKAS INI ADA, PADAHAL `CLAUDE.md` DULU MELARANGNYA
 *
 * Aturan lamanya: "TIDAK ADA database bawaan", karena ketiga sumber yang ditimbang punya masalah
 * lisensi dan **belum ada yang dijawab**. Aturannya menutup dengan syarat yang jelas: "sebelum
 * salah satunya dijawab, jangan commit satu baris pun data makanan."
 *
 * Pertanyaannya sekarang dijawab, diverifikasi ke sumbernya masing-masing:
 *
 *   · USDA FoodData Central  -> **CC0 1.0**, domain publik. Nol syarat.
 *   · Open Food Facts        -> **ODbL 1.0** (database) + **DbCL 1.0** (isi). Boleh, dengan
 *                               atribusi dan turunannya ikut ODbL.
 *   · Open Food Facts GAMBAR -> CC BY-SA 3.0. Share-alike menular, jadi **tidak diambil sama
 *                               sekali**.
 *   · TKPI Kemenkes          -> repositori resminya: "(c) Copyright 2022. All Rights Reserved by
 *                               Kemenkes", nol pernyataan lisensi terbuka. **TIDAK BOLEH.**
 *
 * TKPI itu yang paling menyakitkan, karena isinya justru paling tepat — dia memang dibuat untuk
 * pangan Indonesia. Tapi jawabannya bukan "belum jelas" seperti yang tertulis sebelumnya; dia
 * "tidak boleh", dan mencatatnya sebagai "belum jelas" membuat sesi berikutnya mengira ini masih
 * pekerjaan yang menunggu keputusan.
 *
 * =============================================================================================
 * DUA SUMBER, DAN KENAPA MEREKA MENJAWAB PERTANYAAN YANG BERBEDA
 *
 * `usda` : bahan pokok — nasi, tempe, tahu, telur, ayam, santan. Dikurasi tangan, 59 baris,
 *          setiap baris membawa `fdcId`-nya supaya angkanya bisa diverifikasi ke sumber.
 * `off`  : produk kemasan yang ada di Indomaret/Alfamart — Indomie, Teh Pucuk, Pocari, Energen.
 *          Diambil dari yang PALING SERING DIPINDAI, bukan semuanya: ekor panjang OFF datanya
 *          paling bolong dan setiap barisnya menambah unduhan orang di sinyal gym basement.
 *
 * Yang TIDAK dijawab keduanya: masakan matang seperti nasi uduk, rendang, gado-gado. Itu bukan
 * produk ritel dan bukan bahan mentah. Untuk itu app ini sudah punya perkiraan gizi AI, yang
 * memang dipasang justru karena jalan buntu lisensi ini — dan LLM tahu nasi uduk.
 *
 * =============================================================================================
 * KATALOG INI TIDAK PERNAH MASUK KE `S`, DAN ITU BUKAN KERAPIAN
 *
 * `S.foods` disinkronkan ke Supabase. Menaruh ribuan baris katalog di sana berarti setiap sync
 * membawa data yang identik untuk semua orang, berulang kali, dari perangkat yang sedang di
 * sinyal buruk.
 *
 * Jadi katalog adalah **sumber masukan**, bukan state: dia dimuat sebagai chunk terpisah, dan
 * saat pengguna mencatat sesuatu, barisnya DIADOPSI satu kali ke `S.foods` — persis seperti yang
 * sudah dilakukan jalur AI. Akibatnya tiga hal yang semuanya diinginkan:
 *
 *   1. `S.foods` tumbuh hanya sebesar apa yang benar-benar dimakan orang, bukan sebesar katalog.
 *   2. Riwayat TIDAK IKUT MEMBUSUK saat katalognya dibangun ulang. Kalau entri makan menunjuk
 *      langsung ke id katalog, satu build baru yang menghapus satu produk akan mengubah total
 *      kalori bulan lalu menjadi nol — tanpa error, tanpa jejak. `macrosOf` memang mengembalikan
 *      nol untuk makanan yang tidak ditemukan, dan itu perilaku yang benar untuk makanan yang
 *      DIHAPUS PENGGUNA; dia jadi jebakan kalau sumbernya bisa berubah di bawah kaki orang.
 *   3. Nol perubahan pada `MealEntry`, `macrosOf`, maupun lapisan sync.
 *
 * =============================================================================================
 * PENCARIAN: TOKEN, BUKAN SKOR KEMIRIPAN
 *
 * Pencocokannya substring per-token dengan semua token wajib cocok. TIDAK ADA Jaccard, tidak ada
 * Levenshtein, tidak ada ambang kemiripan. Itu aturan yang sudah ditulis di `CLAUDE.md` untuk
 * pencocokan foto gerakan, dan alasannya berlaku lebih keras di sini: "susu" vs "susu kental
 * manis" beda 2,5 kali kalorinya, dan "tanpa gula" vs "gula" adalah kebalikan yang cuma
 * dibedakan oleh satu kata yang skor kemiripan justru menganggap kecil.
 */

import USDA from './food-usda.js'
import type { Food } from './nutrition.js'

export type FoodSource = 'usda' | 'off'

export interface CatalogueFood {
  /** `usda:169757` atau `off:8992753100015`. Prefiks sumber ikut supaya id tidak pernah bentrok. */
  id: string
  name: string
  brand?: string
  src: FoodSource
  /** Per 100 gram, selalu. */
  kcal: number
  protein?: number
  carb?: number
  fat?: number
  /** Gram untuk satu porsi. 0/undefined = tidak dinyatakan. */
  servingG?: number
  /** Keterangan porsi rumah tangga ("1 centong"). Hanya untuk baris kurasi kami. */
  servingLabel?: string
  /** Deskripsi USDA aslinya, supaya padanan yang tidak sempurna bisa dilihat bukan disembunyikan. */
  note?: string
}

interface BarisUsda {
  id: string; nama: string; porsi: number; ket: string
  kcal: number; protein: number; carb: number; fat: number; desc: string
}

/** Baris ritel disingkat di berkas datanya — lihat kepala `food-retail.js`. */
interface BarisRitel {
  c: string; n: string; b: string; k: number
  p?: number; ca?: number; f?: number; s?: number
}

const dariUsda = (r: BarisUsda): CatalogueFood => ({
  id: 'usda:' + r.id,
  name: r.nama,
  src: 'usda',
  kcal: r.kcal,
  protein: r.protein,
  carb: r.carb,
  fat: r.fat,
  servingG: r.porsi || undefined,
  servingLabel: r.ket || undefined,
  note: r.desc || undefined,
})

const dariRitel = (r: BarisRitel): CatalogueFood => ({
  id: 'off:' + r.c,
  name: r.n,
  brand: r.b || undefined,
  src: 'off',
  kcal: r.k,
  protein: r.p,
  carb: r.ca,
  fat: r.f,
  servingG: r.s || undefined,
})

let cache: CatalogueFood[] | null = null

/**
 * Memuat katalog. Bahan pokok ikut bundel utama (12 KB), produk ritel dimuat SAAT DIBUTUHKAN.
 *
 * Kalau chunk ritelnya gagal dimuat — offline pertama kali, chunk basi setelah deploy — bahan
 * pokoknya tetap kembali. Katalog separuh jauh lebih baik daripada layar pencarian yang mati,
 * dan itu aturan #1 di repo ini.
 */
export async function loadCatalogue(): Promise<CatalogueFood[]> {
  if (cache) return cache
  const pokok = (USDA as BarisUsda[]).map(dariUsda)
  let ritel: CatalogueFood[] = []
  try {
    const mod = await import('./food-retail.js')
    ritel = ((mod.default || []) as BarisRitel[]).map(dariRitel)
  } catch {
    ritel = []
  }
  cache = [...pokok, ...ritel]
  return cache
}

/** Hanya untuk tes. Katalog di-memo seumur halaman di produksi, dan itu memang yang diinginkan. */
export function _resetCatalogueCache(): void {
  cache = null
}

/**
 * Normalisasi teks pencarian: huruf kecil, tanda diakritik dibuang, non-alfanumerik jadi spasi.
 *
 * Diakritik dibuang karena orang mengetik "creme" untuk "crème" dan sebaliknya. Tanda hubung dan
 * titik jadi spasi karena "Teh-Pucuk" dan "Teh Pucuk" adalah hal yang sama bagi orang yang
 * mengetiknya.
 */
export function normalize(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Peringkat kecocokan. Angka lebih kecil = lebih relevan.
 *
 * Peringkatnya berlapis dan bukan skor gabungan: kecocokan persis harus SELALU mengalahkan
 * kecocokan sebagian, apa pun panjang namanya. Skor gabungan akan membuat nama pendek yang
 * cocok sebagian mengalahkan nama panjang yang cocok persis — dan "susu" mengalahkan "Susu
 * Kental Manis" adalah tepat kesalahan yang paling merugikan di sini.
 */
function peringkat(hay: string, q: string): number {
  if (hay === q) return 0
  if (hay.startsWith(q + ' ')) return 1
  if (hay.startsWith(q)) return 2
  if (hay.includes(' ' + q + ' ')) return 3
  if (hay.includes(' ' + q)) return 4
  return 5
}

export interface SearchOpts {
  limit?: number
}

/**
 * Mencari di katalog. MURNI: tidak menyentuh jaringan, tidak menyentuh state, tidak membaca jam.
 *
 * Query kosong mengembalikan array kosong, BUKAN seluruh katalog. Mengembalikan semuanya berarti
 * merender ribuan baris pada ketukan pertama, di perangkat kelas menengah Android yang jadi
 * sasaran app ini.
 */
export function searchCatalogue(
  list: CatalogueFood[],
  query: string,
  opts: SearchOpts = {}
): CatalogueFood[] {
  const q = normalize(query)
  if (q.length < 2) return []
  const token = q.split(' ').filter(Boolean)
  const limit = Math.max(1, Math.min(200, opts.limit ?? 40))

  const hasil: { f: CatalogueFood; r: number }[] = []
  for (const f of list || []) {
    // Baris rusak DILEWATI, bukan dilempar. Katalog ini dibuat mesin, dan satu baris cacat tidak
    // boleh mematikan layar pencarian — aturan yang sama dengan `macrosOf` yang mengembalikan nol
    // untuk makanan yang tidak ditemukan.
    if (!f || typeof f.name !== 'string' || typeof f.kcal !== 'number') continue
    const hay = normalize(f.name + ' ' + (f.brand || ''))
    // SEMUA token wajib ada. "teh hijau" tidak boleh mengembalikan setiap "teh".
    let cocok = true
    for (const tk of token) {
      if (!hay.includes(tk)) { cocok = false; break }
    }
    if (!cocok) continue
    hasil.push({ f, r: peringkat(hay, q) })
  }

  hasil.sort((a, b) =>
    a.r - b.r
    // Bahan pokok lebih dulu di peringkat yang sama: dia dikurasi tangan dan menjawab
    // pertanyaan yang lebih umum ("nasi" seharusnya nasi, bukan satu merek nasi kotak).
    || (a.f.src === b.f.src ? 0 : a.f.src === 'usda' ? -1 : 1)
    || a.f.name.length - b.f.name.length
    || a.f.name.localeCompare(b.f.name, 'id'))

  return hasil.slice(0, limit).map(h => h.f)
}

/**
 * Mengubah baris katalog jadi `Food` milik pengguna.
 *
 * `basis` selalu `per100g`, dan itu keputusan: `MealEntry.qty` untuk `per100g` berarti GRAM, jadi
 * tombol porsi cepat di UI cukup mengisi gramnya. Alternatifnya `perServing` untuk produk yang
 * menyatakan porsi — tapi lalu mengubah porsi berarti mengubah makanannya, dan dua orang yang
 * makan setengah bungkus vs dua bungkus akan saling menimpa.
 *
 * `id` katalognya dipertahankan, dan itu yang membuat adopsi bisa idempoten: makan Indomie
 * tiga puluh kali tetap satu baris di `S.foods`.
 */
export function toFood(c: CatalogueFood): Food {
  const f: Food = {
    id: c.id,
    name: c.brand ? c.name + ' — ' + c.brand : c.name,
    basis: 'per100g',
    kcal: c.kcal,
  }
  if (c.protein !== undefined) f.protein = c.protein
  if (c.carb !== undefined) f.carb = c.carb
  if (c.fat !== undefined) f.fat = c.fat
  return f
}

/**
 * Mengadopsi baris katalog ke daftar makanan pengguna, sekali saja.
 *
 * Mengembalikan daftar BARU dan makanannya. Kalau id-nya sudah ada, daftarnya dikembalikan apa
 * adanya dan yang sudah ada yang dipakai — TIDAK ditimpa. Menimpanya akan membuang suntingan
 * pengguna sendiri: begitu diadopsi, baris itu miliknya, dan angka kemasan yang dia koreksi
 * karena beda dengan label di tangannya harus menang atas katalog.
 */
export function adopt(
  foods: Food[] | undefined,
  c: CatalogueFood
): { foods: Food[]; food: Food; sudahAda: boolean } {
  const list = foods || []
  const ada = list.find(f => f && f.id === c.id)
  if (ada) return { foods: list, food: ada, sudahAda: true }
  const food = toFood(c)
  return { foods: [...list, food], food, sudahAda: false }
}

/**
 * Pilihan porsi cepat, dalam GRAM.
 *
 * Porsi kemasan (kalau ada) lebih dulu, lalu 100 g sebagai patokan yang bisa dihitung orang di
 * kepala. Duplikat dibuang: produk yang porsinya tepat 100 g tidak boleh menampilkan dua tombol
 * yang sama.
 */
export function servingChoices(c: CatalogueFood): { g: number; label?: string }[] {
  const out: { g: number; label?: string }[] = []
  if (c.servingG && c.servingG > 0) out.push({ g: c.servingG, label: c.servingLabel })
  if (!out.some(o => o.g === 100)) out.push({ g: 100 })
  return out
}
