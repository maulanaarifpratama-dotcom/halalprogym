import { describe, expect, it } from 'vitest'
import { FATIGUE_SCAN_MS, fatigueOf } from './recovery.js'

/**
 * Probe properti untuk model kelelahan — dulunya `scripts/fatigue-monotonic-probe.mjs`,
 * dijalankan tangan lewat `npm run test:fatigue-probe`.
 *
 * Dipindah jadi tes karena dua alasan, dan yang kedua yang sebenarnya penting:
 *
 * 1. Skrip itu berhenti jalan begitu `workout-model.js` jadi `.ts`. Node biasa TIDAK bisa
 *    resolve `./x.js` ke `x.ts` — itu fitur bundler dan TypeScript, bukan Node. Jalan
 *    keluarnya `vite-node`, tapi paket itu tidak ada di lock file: `npx vite-node` mengunduh
 *    dari registry, jadi skripnya butuh jaringan untuk jalan. Vitest resolve `.ts` secara
 *    native, tanpa dependency baru sama sekali.
 * 2. **Skrip itu tidak jalan di mana pun.** Tidak ada job CI yang memanggilnya, jadi invarian
 *    yang dia jaga sebenarnya tidak dijaga. Sebagai tes, dia jalan setiap kali.
 *
 * LCG berbenih dipertahankan apa adanya: kegagalan bereproduksi persis, tanpa dependency
 * property-testing dari luar, dan tanpa flake — yang penting karena suite ini jaring
 * keselamatan seluruh port TypeScript.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const BASE = Date.UTC(2026, 0, 31, 12)
const ID = '1254'

const workout = (start, weight, count = 8) => ({
  d: new Date(start).toISOString(),
  start,
  entries: [{
    id: ID,
    sets: Array.from({ length: count }, () => ({ done: true, w: weight, r: 8 }))
  }]
})

// Deterministic LCG: failures reproduce exactly without an external property-testing dependency.
function makeRandom(seedValue) {
  let seed = seedValue
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
}

describe('model kelelahan — probe properti', () => {
  // ~5 detik kerja nyata: 108.000 evaluasi fatigueOf plus 14.076 perbandingan penghapusan.
  // Timeout eksplisit, bukan bersandar pada default global — tes ini memang berat, dan
  // alasan beratnya harus terbaca di sini.
  it('kelelahan tidak pernah NAIK hanya karena waktu berjalan', () => {
    const random = makeRandom(0x5eed1234)
    let comparisons = 0
    let largestIncrease = -Infinity

    for (let historyIndex = 0; historyIndex < 100; historyIndex += 1) {
      const sessionCount = 3 + Math.floor(random() * 10)
      const history = Array.from({ length: sessionCount }, () => {
        const ageHours = Math.floor(random() * 120 * 24)
        const weight = 40 + Math.floor(random() * 141)
        const count = 1 + Math.floor(random() * 12)
        return workout(BASE - ageHours * HOUR, weight, count)
      })

      let previous = fatigueOf(history, BASE).chest
      for (let hour = 1; hour <= 1080; hour += 1) {
        const current = fatigueOf(history, BASE + hour * HOUR).chest
        const increase = current - previous
        largestIncrease = Math.max(largestIncrease, increase)
        expect(
          increase,
          `kelelahan naik di history ${historyIndex} pada jam ${hour}: ${previous} -> ${current}`
        ).toBeLessThanOrEqual(1e-12)
        previous = current
        comparisons += 1
      }
    }

    // Jumlahnya dipatok: kalau bentuk loop-nya berubah, jangkauan probe berubah tanpa suara.
    expect(comparisons).toBe(108000)
    expect(largestIncrease).toBeLessThanOrEqual(1e-12)
  }, 60000)

  it('menghapus satu sesi dari riwayat tidak pernah MENAIKKAN kelelahan otot mana pun', () => {
    const random = makeRandom(0x5eed1234)
    let deletionComparisons = 0

    for (let historyIndex = 0; historyIndex < 100; historyIndex += 1) {
      const sessionCount = 3 + Math.floor(random() * 10)
      const history = Array.from({ length: sessionCount }, () => {
        const ageHours = Math.floor(random() * 120 * 24)
        const weight = 40 + Math.floor(random() * 141)
        const count = 1 + Math.floor(random() * 12)
        return workout(BASE - ageHours * HOUR, weight, count)
      })

      const before = fatigueOf(history, BASE)
      for (let deleted = 0; deleted < history.length; deleted += 1) {
        const after = fatigueOf(history.filter((_, i) => i !== deleted), BASE)
        for (const [slug, was] of Object.entries(before)) {
          expect(
            after[slug],
            `menghapus sesi ${deleted} di history ${historyIndex} menaikkan ${slug}`
          ).toBeLessThanOrEqual(was + Number.EPSILON)
          deletionComparisons += 1
        }
      }
    }
    expect(deletionComparisons).toBe(14076)
  }, 60000)

  it('impor yang lebih tua dari jendela pemindaian tidak mengubah kelelahan sekarang', () => {
    const today = workout(BASE, 100, 5)
    const baseline = fatigueOf([today], BASE).chest
    for (const oldImport of [workout(BASE - 90 * DAY, 140, 10), workout(BASE - 90 * DAY, 100, 20)]) {
      expect(fatigueOf([oldImport, today], BASE).chest).toBe(baseline)
    }
  })

  it('menghapus sesi dari riwayat yang dipatok tidak menaikkan otot mana pun', () => {
    const history = [
      workout(BASE - FATIGUE_SCAN_MS - DAY, 100, 15),
      workout(BASE - 3 * DAY, 100, 8),
      workout(BASE - 2 * DAY, 100, 8),
      workout(BASE - DAY, 60, 4),
      workout(BASE, 120, 10)
    ]
    const before = fatigueOf(history, BASE)
    for (let deleted = 0; deleted < history.length; deleted += 1) {
      const after = fatigueOf(history.filter((_, i) => i !== deleted), BASE)
      for (const [slug, was] of Object.entries(before)) {
        expect(after[slug], `menghapus sesi ${deleted} menaikkan ${slug}`)
          .toBeLessThanOrEqual(was + Number.EPSILON)
      }
    }
  })
})
