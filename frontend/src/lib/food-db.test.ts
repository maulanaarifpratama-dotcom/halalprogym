import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  adopt, normalize, searchCatalogue, servingChoices, toFood,
  type CatalogueFood,
} from './food-db.js'
import USDA from './food-usda.js'
import { macrosOf } from './nutrition.js'

/**
 * Katalog makanan bawaan. Yang diuji di sini bukan datanya (itu di `food-db-data.test.ts`), tapi
 * KEPUTUSANNYA: pencarian yang tidak boleh memakai skor kemiripan, adopsi yang tidak boleh
 * menimpa suntingan pengguna, dan konversi yang harus cocok dengan `macrosOf` yang sudah ada.
 */

const f = (o: Partial<CatalogueFood>): CatalogueFood => ({
  id: 'usda:1', name: 'X', src: 'usda', kcal: 100, unit: 'g', ...o,
})

describe('normalize', () => {
  it('membuang diakritik, tanda baca, dan huruf besar', () => {
    expect(normalize('Crème  Brûlée')).toBe('creme brulee')
    expect(normalize('Teh-Pucuk')).toBe('teh pucuk')
    expect(normalize('  Oreo (Vanilla)  ')).toBe('oreo vanilla')
  })

  it('tidak melempar untuk masukan yang bukan teks', () => {
    for (const bad of [null, undefined, 0, {}, []]) expect(() => normalize(bad)).not.toThrow()
  })
})

describe('searchCatalogue — token, BUKAN skor kemiripan', () => {
  const list = [
    f({ id: 'usda:a', name: 'Susu sapi' }),
    f({ id: 'off:b', name: 'Susu Kental Manis', src: 'off', kcal: 336 }),
    f({ id: 'off:c', name: 'Teh Hijau Tanpa Gula', src: 'off', kcal: 0 }),
    f({ id: 'off:d', name: 'Teh Manis', src: 'off', kcal: 40 }),
    f({ id: 'usda:e', name: 'Nasi putih' }),
  ]

  it('query kosong atau satu huruf mengembalikan kosong, bukan seluruh katalog', () => {
    // Mengembalikan semuanya berarti merender ribuan baris pada ketukan pertama.
    expect(searchCatalogue(list, '')).toEqual([])
    expect(searchCatalogue(list, 'n')).toEqual([])
  })

  it('SEMUA token wajib cocok', () => {
    // "teh hijau" tidak boleh mengembalikan setiap "teh".
    const r = searchCatalogue(list, 'teh hijau')
    expect(r.map(x => x.name)).toEqual(['Teh Hijau Tanpa Gula'])
  })

  it('kecocokan PERSIS mengalahkan kecocokan sebagian, apa pun panjang namanya', () => {
    // Ini invarian yang paling mahal kalau salah: "susu" 61 kkal dan "Susu Kental Manis"
    // 336 kkal, dan orang mencatat yang teratas.
    const r = searchCatalogue(list, 'susu sapi')
    expect(r[0]!.name).toBe('Susu sapi')
  })

  it('bahan pokok lebih dulu daripada merek di peringkat yang sama', () => {
    const r = searchCatalogue(list, 'susu')
    expect(r[0]!.src).toBe('usda')
  })

  it('menghormati limit', () => {
    expect(searchCatalogue(list, 'te', { limit: 1 }).length).toBe(1)
  })

  it('tidak melempar atas katalog yang berisi baris rusak', () => {
    // Katalog dibuat mesin; satu baris rusak tidak boleh mematikan layar pencarian.
    const rusak = [...list, null, undefined, {}] as unknown as CatalogueFood[]
    expect(() => searchCatalogue(rusak, 'susu')).not.toThrow()
  })
})

describe('toFood + macrosOf — konversinya harus cocok dengan mesin yang sudah ada', () => {
  it('basis per100g, jadi qty pada entri makan berarti GRAM', () => {
    const c = f({ id: 'off:x', name: 'Indomie Goreng', brand: 'Indofood', src: 'off', kcal: 482, protein: 9.4, carb: 63.9, fat: 20.2 })
    const food = toFood(c)
    expect(food.basis).toBe('per100g')
    expect(food.id).toBe('off:x')
    expect(food.name).toContain('Indofood')

    // 85 gram = satu bungkus.
    const m = macrosOf({ id: 'm', d: '2026-09-01', foodId: food.id, qty: 85 }, [food])
    expect(m.kcal).toBe(Math.round(482 * 0.85))
  })

  it('makro yang tidak ada TIDAK jadi nol — dia memang tidak ada', () => {
    // Nol berarti "produk ini benar-benar nol protein", dan itu klaim yang berbeda dari
    // "kemasannya tidak menyatakannya". Aturan yang sama sudah dipakai layar makan.
    const food = toFood(f({ kcal: 100 }))
    expect(food.protein).toBeUndefined()
    expect(food.carb).toBeUndefined()
    expect(food.fat).toBeUndefined()
  })
})

describe('adopt — sekali saja, dan TIDAK menimpa', () => {
  const c = f({ id: 'off:z', name: 'Pocari Sweat', src: 'off', kcal: 24 })

  it('menambahkan sekali', () => {
    const r = adopt([], c)
    expect(r.foods.length).toBe(1)
    expect(r.sudahAda).toBe(false)
  })

  it('mengadopsi dua kali tetap satu baris', () => {
    const a = adopt([], c)
    const b = adopt(a.foods, c)
    expect(b.foods.length).toBe(1)
    expect(b.sudahAda).toBe(true)
  })

  it('TIDAK menimpa suntingan pengguna', () => {
    // Begitu diadopsi, baris itu miliknya. Angka yang dia koreksi karena beda dengan label di
    // tangannya harus menang atas katalog.
    const a = adopt([], c)
    const disunting = { ...a.food, kcal: 19, name: 'Pocari (label saya)' }
    const b = adopt([disunting], c)
    expect(b.food.kcal).toBe(19)
    expect(b.food.name).toBe('Pocari (label saya)')
  })

  it('tahan atas daftar undefined', () => {
    expect(() => adopt(undefined, c)).not.toThrow()
    expect(adopt(undefined, c).foods.length).toBe(1)
  })
})

describe('servingChoices', () => {
  it('porsi kemasan lebih dulu, 100 g selalu ada', () => {
    const r = servingChoices(f({ servingG: 85 }))
    expect(r.map(x => x.g)).toEqual([85, 100])
  })

  it('tidak menampilkan 100 g dua kali', () => {
    const r = servingChoices(f({ servingG: 100 }))
    expect(r.map(x => x.g)).toEqual([100])
  })

  it('tanpa porsi kemasan tetap memberi 100 g', () => {
    expect(servingChoices(f({})).map(x => x.g)).toEqual([100])
  })
})

describe('katalog TIDAK boleh membocorkan gambar berlisensi share-alike', () => {
  /**
   * Gambar produk Open Food Facts berlisensi CC BY-SA 3.0, dan share-alike-nya menular ke karya
   * turunan. Repo ini sudah pernah membayar satu jebakan media berlisensi (Gym visual) dengan
   * membangun ulang seluruh demo gerakan.
   *
   * Dijaga dari SUMBER, bukan dari ingatan: kalau seseorang menambahkan field gambar ke skrip
   * pembuatnya nanti, tes ini yang memberi tahu — bukan surat dari pengacara.
   */
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

  it('skrip pembuatnya tidak pernah meminta field gambar', () => {
    const s = src('../../scripts/build-food-retail.mjs')
    const fields = (s.match(/const FIELDS = '([^']+)'/) || [])[1] || ''
    expect(fields, 'FIELDS tidak ditemukan — tes ini berhenti menjaga apa pun').toBeTruthy()
    for (const larangan of ['image', 'photo', 'selected_images', 'front_url']) {
      expect(fields.includes(larangan), 'field gambar diminta: ' + larangan).toBe(false)
    }
  })

  it('tipe CatalogueFood tidak punya field gambar', () => {
    const s = src('./food-db.ts')
    const blok = (s.match(/export interface CatalogueFood \{[\s\S]*?\n\}/) || [])[0] || ''
    expect(blok, 'interface CatalogueFood tidak ditemukan').toBeTruthy()
    expect(/image|photo|thumb|img/i.test(blok), 'CatalogueFood punya field gambar').toBe(false)
  })
})

describe('bahan pokok USDA — bentuk berkas yang dibuat mesin', () => {
  /**
   * Berkas yang di-generate paling mudah rusak diam-diam: satu field yang lupa disalin tidak
   * menggagalkan build maupun typecheck — yang terjadi `undefined` yang mengalir ke layar.
   * Alasan yang sama dengan `catalogue-integrity.test.js` untuk 1.324 latihan.
   */
  const rows = USDA as { id: string; nama: string; kcal: number; porsi: number; desc: string }[]

  it('tidak kosong, dan id-nya unik', () => {
    expect(rows.length).toBeGreaterThan(50)
    expect(new Set(rows.map(r => r.id)).size).toBe(rows.length)
  })

  it('setiap baris punya fdcId numerik supaya angkanya bisa diverifikasi ke sumber', () => {
    for (const r of rows) expect(r.id, r.nama).toMatch(/^\d+$/)
  })

  it('kalori masuk akal per 100 gram', () => {
    // 900 di atas minyak murni (884). Di atas itu pasti salah satuan.
    for (const r of rows) {
      expect(r.kcal, r.nama).toBeGreaterThan(0)
      expect(r.kcal, r.nama).toBeLessThanOrEqual(900)
    }
  })

  it('namanya Indonesia, dan deskripsi USDA aslinya ikut disimpan', () => {
    for (const r of rows) {
      expect(r.nama.trim().length, r.id).toBeGreaterThan(1)
      // `desc` yang kosong berarti padanan tidak bisa diperiksa siapa pun.
      expect(r.desc.trim().length, r.nama).toBeGreaterThan(3)
    }
  })

  it('porsi rumah tangga wajar', () => {
    for (const r of rows) {
      expect(r.porsi, r.nama).toBeGreaterThan(0)
      expect(r.porsi, r.nama).toBeLessThanOrEqual(500)
    }
  })
})


describe('satuan tampilan: gram vs mililiter', () => {
  /**
   * Angkanya selalu per 100 gram, tapi yang DITAMPILKAN harus ikut produknya.
   *
   * "29 kkal per 100 g" untuk teh dalam botol adalah satuan yang tidak bisa dibayangkan orang,
   * dan satuan yang tidak bisa dibayangkan membuat orang menebak — lalu mencatat sebotol 350 ml
   * sebagai 29 kkal, padahal 102. Salah lebih dari tiga kali lipat, ke arah yang membuat orang
   * mengira dia makan lebih sedikit daripada kenyataannya.
   */
  it('bahan pokok selalu gram', () => {
    const semua = (USDA as { id: string }[]).length
    expect(semua).toBeGreaterThan(50)
    // Resep Indonesia menyebut "50 g santan", bukan "50 ml", dan angka USDA-nya per gram.
    expect(f({ src: 'usda' }).unit).toBe('g')
  })

  it('toFood TIDAK menambahkan field satuan ke Food', () => {
    // `macrosOf` menghitung qty/100, dan itu benar untuk gram maupun mililiter. Menambah field
    // ke `Food` berarti menambah field ke state yang DISINKRONKAN, untuk sesuatu yang tidak
    // mengubah satu pun perhitungan.
    const food = toFood(f({ unit: 'ml', kcal: 29 })) as unknown as Record<string, unknown>
    expect('unit' in food).toBe(false)
    expect(food.basis).toBe('per100g')
  })

  it('porsi kemasan dan 100 keduanya ada untuk minuman', () => {
    const teh = f({ unit: 'ml', kcal: 29, servingG: 350, servingLabel: 'Pack' })
    expect(servingChoices(teh).map(x => x.g)).toEqual([350, 100])
    expect(servingChoices(teh)[0]!.label).toBe('Pack')
  })
})
