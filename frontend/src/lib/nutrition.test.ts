import { describe, expect, it } from 'vitest'
import {
  EMPTY_MACROS,
  entriesOn,
  macrosOf,
  progressTo,
  sumMacros,
  totalsByWindow,
  totalsOn,
  validateFood,
  windowOf,
  type Food,
  type MealEntry,
} from './nutrition.js'

const NASI: Food = { id: 'f1', name: 'Nasi putih', basis: 'per100g', kcal: 130, protein: 2.7, carb: 28, fat: 0.3 }
const TELUR: Food = { id: 'f2', name: 'Telur rebus', basis: 'perServing', serving: '1 butir', kcal: 78, protein: 6.3, carb: 0.6, fat: 5.3 }
const FOODS = [NASI, TELUR]

const e = (over: Partial<MealEntry>): MealEntry =>
  ({ id: 'e', d: '2026-08-28', foodId: 'f1', qty: 100, ...over })

describe('macrosOf', () => {
  it('per 100 g dihitung dari beratnya', () => {
    expect(macrosOf(e({ qty: 100 }), FOODS)).toEqual({ kcal: 130, protein: 2.7, carb: 28, fat: 0.3 })
    expect(macrosOf(e({ qty: 200 }), FOODS)).toEqual({ kcal: 260, protein: 5.4, carb: 56, fat: 0.6 })
    expect(macrosOf(e({ qty: 50 }), FOODS)).toEqual({ kcal: 65, protein: 1.4, carb: 14, fat: 0.2 })
  })

  it('per porsi dikali jumlah porsinya, BUKAN dibagi 100', () => {
    // Ini kesalahan yang paling mudah terjadi kalau kedua basis dipaksa lewat rumus yang sama:
    // "2 butir telur" akan jadi 1,56 kalori.
    expect(macrosOf(e({ foodId: 'f2', qty: 2 }), FOODS).kcal).toBe(156)
    expect(macrosOf(e({ foodId: 'f2', qty: 1 }), FOODS).kcal).toBe(78)
  })

  it('setengah porsi boleh', () => {
    expect(macrosOf(e({ foodId: 'f2', qty: 0.5 }), FOODS).kcal).toBe(39)
  })

  it('makanan yang sudah dihapus mengembalikan nol, bukan melempar', () => {
    // Entri bisa menunjuk makanan yang dihapus. Satu baris riwayat yang menghilang jauh lebih
    // baik daripada layar Statistik yang mati.
    expect(macrosOf(e({ foodId: 'hilang' }), FOODS)).toEqual(EMPTY_MACROS)
  })

  it('makro yang tidak diisi dihitung nol, bukan NaN', () => {
    const minim: Food = { id: 'f3', name: 'Air', basis: 'perServing', kcal: 0 }
    expect(macrosOf(e({ foodId: 'f3', qty: 1 }), [minim])).toEqual(EMPTY_MACROS)
  })

  it('qty yang tidak masuk akal tidak menghasilkan NaN', () => {
    for (const q of [NaN, undefined, null, 'dua']) {
      const m = macrosOf(e({ qty: q as unknown as number }), FOODS)
      expect(Number.isFinite(m.kcal), String(q)).toBe(true)
    }
  })

  it('menerima peta makanan, bukan cuma array', () => {
    expect(macrosOf(e({ qty: 100 }), { f1: NASI }).kcal).toBe(130)
  })
})

describe('sumMacros', () => {
  it('menjumlahkan dan membulatkan sekali di akhir', () => {
    // Membulatkan tiap suku lalu menjumlahkan akan menumpuk galat; yang benar sebaliknya.
    const out = sumMacros([
      { kcal: 130, protein: 2.7, carb: 28, fat: 0.3 },
      { kcal: 78, protein: 6.3, carb: 0.6, fat: 5.3 },
    ])
    expect(out).toEqual({ kcal: 208, protein: 9, carb: 28.6, fat: 5.6 })
  })

  it('daftar kosong jadi nol, bukan undefined', () => {
    expect(sumMacros([])).toEqual(EMPTY_MACROS)
  })
})

describe('entriesOn', () => {
  const meals: MealEntry[] = [
    e({ id: 'a', at: 3000 }),
    e({ id: 'b', d: '2026-08-27', at: 1000 }),
    e({ id: 'c', at: 1000 }),
    e({ id: 'd' }),                       // tanpa jam
  ]

  it('cuma tanggal itu, terurut jam', () => {
    expect(entriesOn(meals, '2026-08-28').map(m => m.id)).toEqual(['c', 'a', 'd'])
  })

  it('entri tanpa jam ditaruh di AKHIR, bukan dibuang', () => {
    // Entri lama dari versi app sebelum jam dicatat tidak boleh menghilang dari riwayat orang.
    expect(entriesOn(meals, '2026-08-28').map(m => m.id)).toContain('d')
  })

  it('tidak mengubah array aslinya', () => {
    const urutSebelum = meals.map(m => m.id)
    entriesOn(meals, '2026-08-28')
    expect(meals.map(m => m.id)).toEqual(urutSebelum)
  })

  it('meals yang belum ada dianggap kosong', () => {
    expect(entriesOn(undefined, '2026-08-28')).toEqual([])
  })
})

describe('totalsOn', () => {
  it('menjumlahkan seluruh hari', () => {
    const meals = [e({ id: 'a', qty: 200 }), e({ id: 'b', foodId: 'f2', qty: 2 })]
    expect(totalsOn(meals, FOODS, '2026-08-28').kcal).toBe(260 + 156)
  })

  it('hari tanpa catatan jadi nol', () => {
    expect(totalsOn([], FOODS, '2026-08-28')).toEqual(EMPTY_MACROS)
  })
})

describe('progressTo', () => {
  it('null kalau target belum disetel — bukan nol', () => {
    // Nol akan menggambar bar kosong yang terlihat seperti "kamu belum makan apa pun".
    expect(progressTo(500, undefined)).toBe(null)
    expect(progressTo(500, 0)).toBe(null)
  })

  it('rasio dijepit ke 0..1 tapi sisanya TIDAK', () => {
    // Bar berhenti di ujungnya; angkanya tetap jujur soal berapa banyak lewat.
    const p = progressTo(2500, 2000)
    expect(p?.ratio).toBe(1)
    expect(p?.left).toBe(-500)
    expect(p?.over).toBe(true)
  })

  it('di bawah target', () => {
    const p = progressTo(1500, 2000)
    expect(p?.ratio).toBe(0.75)
    expect(p?.left).toBe(500)
    expect(p?.over).toBe(false)
  })

  it('tepat di target belum dianggap lewat', () => {
    expect(progressTo(2000, 2000)?.over).toBe(false)
  })
})

describe('windowOf dan totalsByWindow', () => {
  const puasa = {
    from: new Date(2026, 7, 28, 4, 30, 0),
    to: new Date(2026, 7, 28, 17, 59, 0),
  }
  const at = (h: number, m = 0) => new Date(2026, 7, 28, h, m, 0).getTime()

  it('sebelum imsak = sahur, setelah magrib = berbuka', () => {
    expect(windowOf(e({ at: at(4, 0) }), puasa)).toBe('sahur')
    expect(windowOf(e({ at: at(18, 5) }), puasa)).toBe('iftar')
  })

  it('di TENGAH jam puasa masuk "other" — app tidak menuduh', () => {
    // Mungkin salah catat, mungkin memang tidak berpuasa hari itu. Dua-duanya bukan urusan app.
    expect(windowOf(e({ at: at(13, 0) }), puasa)).toBe('other')
  })

  it('tepat di imsak sudah bukan sahur lagi', () => {
    expect(windowOf(e({ at: puasa.from.getTime() }), puasa)).toBe('other')
  })

  it('tepat di magrib sudah berbuka', () => {
    expect(windowOf(e({ at: puasa.to.getTime() }), puasa)).toBe('iftar')
  })

  it('tanpa hari puasa semuanya "other"', () => {
    expect(windowOf(e({ at: at(4, 0) }), null)).toBe('other')
  })

  it('entri tanpa jam tidak bisa dikelompokkan', () => {
    expect(windowOf(e({}), puasa)).toBe('other')
  })

  it('totalsByWindow selalu punya ketiga kuncinya', () => {
    const out = totalsByWindow([e({ at: at(4, 0), qty: 100 })], FOODS, puasa)
    expect(Object.keys(out).sort()).toEqual(['iftar', 'other', 'sahur'])
    expect(out.sahur.kcal).toBe(130)
    expect(out.iftar).toEqual(EMPTY_MACROS)   // nol, bukan hilang
  })
})

describe('validateFood', () => {
  it('nama wajib', () => {
    expect(validateFood({ name: '', kcal: 100 })).toBe('name')
    expect(validateFood({ name: '   ', kcal: 100 })).toBe('name')
  })

  it('kalori wajib angka dan tidak negatif', () => {
    expect(validateFood({ name: 'x', kcal: NaN })).toBe('number')
    expect(validateFood({ name: 'x', kcal: -5 })).toBe('number')
  })

  it('mengembalikan KODE, bukan kalimat — lib/ tidak memiliki teks UI', () => {
    // Sekaligus menjaga celah audit: kunci terjemahan yang lahir di lib lalu dilewatkan
    // t(variabel) tidak pernah terlihat oleh scripts/audit-locale-keys.mjs.
    for (const out of [validateFood({ name: '' }), validateFood({ name: 'x', kcal: -1 })]) {
      expect(out).toMatch(/^(name|number)$/)
    }
  })

  it('makro negatif DITOLAK, bukan dijepit ke nol', () => {
    // "-50 gram protein" hampir pasti salah ketik. Menyimpannya sebagai 0 diam-diam membuat
    // orang mengira makanannya tercatat benar.
    expect(validateFood({ name: 'x', kcal: 100, protein: -1 })).toBe('number')
  })

  it('makro yang dikosongkan boleh', () => {
    expect(validateFood({ name: 'x', kcal: 100 })).toBe(null)
    expect(validateFood({ name: 'x', kcal: 0 })).toBe(null)
    expect(validateFood({ name: 'x', kcal: 100, protein: undefined })).toBe(null)
  })
})
