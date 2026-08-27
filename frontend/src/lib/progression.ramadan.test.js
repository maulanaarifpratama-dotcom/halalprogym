import { describe, expect, it } from 'vitest'
import { nextPrescription } from './progression.js'
import { buildSets } from './history.js'
import { EXDB } from './exercises.js'

/**
 * SAMBUNGAN mode Ramadan ke mesin progresi dan ke pembangun set.
 *
 * lib/ramadan.test.ts sudah menguji fungsi murninya. Berkas ini menguji hal yang berbeda dan
 * lebih mudah rusak: apakah mesinnya BENAR-BENAR memakai fungsi itu.
 *
 * Ini bukan kehati-hatian berlebih. `basePrescription` punya sebelas jalan keluar, dan satu
 * cabang yang tidak lewat penahanan sudah cukup untuk meregresi beban orang sepanjang bulan
 * puasa. Dan pangkas volume dipasang di satu tempat yang dilewati semua mode logging justru
 * karena cabang yang lupa tidak akan terlihat dari kodenya.
 */
const LIFT = EXDB.find(e => e.bp !== 'cardio' && !['upper legs', 'lower legs', 'back'].includes(e.bp)).id

// 30 Agustus 2026 = Ahad; 31 Agustus = Senin.
const AHAD = new Date(2026, 7, 30, 12, 0, 0)
const SENIN = new Date(2026, 7, 31, 12, 0, 0)
const SELASA = new Date(2026, 8, 1, 12, 0, 0)

const TARGET = { sets: 3, reps: 5, weight: 100 }

/** Riwayat: tiap baris [beban, ...reps per set]. reps null = set tidak dicentang. */
const hist = (rows, extra = {}) => ({
  unit: 'kg',
  workouts: rows.map((row, i) => ({
    d: '2026-08-' + String(i + 1).padStart(2, '0'),
    entries: [{
      id: LIFT,
      target: { ...TARGET, weight: row[0] },
      sets: row.slice(1).map(r => (r === null ? { w: row[0], r: 0, done: false } : { w: row[0], r, done: true }))
    }]
  })),
  ...extra
})

const CFG = { id: LIFT, sets: 3, reps: 5, prog: 'linear', inc: 2.5 }

describe('nextPrescription — penahanan Ramadan', () => {
  // Tiga sesi gagal berturut-turut: mesinnya akan deload kalau dibiarkan.
  const STALLED = [[100, 5, 5, 3], [100, 5, 4, 3], [100, 5, 3, 3]]
  // Tiga sesi bersih: mesinnya akan menaikkan beban.
  const CLEAN = [[100, 5, 5, 5]]

  it('TANPA mode Ramadan, tiga sesi gagal memicu deload — ini garis dasarnya', () => {
    const p = nextPrescription(hist(STALLED), CFG, null, SENIN)
    expect(p.kind).toBe('deload')
    expect(p.weight).toBeLessThan(100)
  })

  it('DENGAN mode Ramadan, deload itu jadi hold di beban sebelum puasa', () => {
    const S = hist(STALLED, { ramadan: { on: true, volumeKeepPct: 65 } })
    const p = nextPrescription(S, CFG, null, SENIN)
    expect(p.kind).toBe('hold')
    expect(p.weight).toBe(100)
    expect(p.why[0]).toContain('Ramadan')
  })

  it('kenaikan beban juga ditahan — jangan naik, jangan turun', () => {
    const S = hist(CLEAN, { ramadan: { on: true } })
    expect(nextPrescription(hist(CLEAN), CFG, null, SENIN).kind).toBe('up')
    expect(nextPrescription(S, CFG, null, SENIN).kind).toBe('hold')
    expect(nextPrescription(S, CFG, null, SENIN).weight).toBe(100)
  })

  it('mode puasa sunah menahan HANYA di Senin dan Kamis', () => {
    const S = hist(STALLED, { ramadan: { sunnah: true } })
    expect(nextPrescription(S, CFG, null, SENIN).kind).toBe('hold')
    expect(nextPrescription(S, CFG, null, SELASA).kind).toBe('deload')
    expect(nextPrescription(S, CFG, null, AHAD).kind).toBe('deload')
  })

  it('progresi yang dimatikan pemiliknya tetap mati', () => {
    // Mode Ramadan menahan, bukan menghidupkan. Menyetel kind ke 'hold' di sini akan membuat
    // app menyodorkan angka pada orang yang memang tidak mau disodori.
    const S = hist(STALLED, { ramadan: { on: true } })
    expect(nextPrescription(S, { ...CFG, prog: 'off' }, null, SENIN).kind).toBe('off')
  })

  it('latihan yang belum pernah dicatat tidak ikut ditahan', () => {
    const S = { unit: 'kg', workouts: [], ramadan: { on: true } }
    expect(nextPrescription(S, CFG, null, SENIN).kind).toBe('first')
  })

  it('mode waktu ditahan di detik sebelum puasa, bukan di detik hasil hitungan', () => {
    const timedCfg = { id: LIFT, sets: 3, sec: 60, mode: 'time', prog: 'time', inc: 5 }
    const rows = [{ d: '2026-08-01', entries: [{ id: LIFT, target: { sets: 3, sec: 60, mode: 'time' }, sets: [{ sec: 60, done: true }, { sec: 60, done: true }, { sec: 60, done: true }] }] }]
    const plain = nextPrescription({ unit: 'kg', workouts: rows }, timedCfg, null, SENIN)
    expect(plain.kind).toBe('up')
    expect(plain.sec).toBe(65)

    const held = nextPrescription({ unit: 'kg', workouts: rows, ramadan: { on: true } }, timedCfg, null, SENIN)
    expect(held.kind).toBe('hold')
    expect(held.sec).toBe(60)
  })
})

describe('buildSets — pangkas volume Ramadan', () => {
  const S = () => ({ unit: 'kg', workouts: [] })

  it('tanpa mode puasa, jumlah setnya apa adanya', () => {
    expect(buildSets(S(), CFG, { now: SENIN })).toHaveLength(3)
  })

  it('mode Ramadan memangkas set kerja', () => {
    const st = { ...S(), ramadan: { on: true, volumeKeepPct: 65 } }
    expect(buildSets(st, CFG, { now: SENIN })).toHaveLength(2)   // ceil(3 * .65)
  })

  it('mode puasa sunah memangkas hanya di hari puasanya', () => {
    const st = { ...S(), ramadan: { sunnah: true, volumeKeepPct: 65 } }
    expect(buildSets(st, CFG, { now: SENIN })).toHaveLength(2)
    expect(buildSets(st, CFG, { now: SELASA })).toHaveLength(3)
  })

  it('set WARM-UP tidak ikut dipangkas', () => {
    // Warm-up justru lebih penting saat energi rendah, dan dia tidak dihitung ke volume maupun
    // ke progresi. Memangkasnya berarti memangkas hal yang bukan bebannya.
    const cfg = { ...CFG, sets: 3, warmupSets: 2 }
    const st = { ...S(), ramadan: { on: true, volumeKeepPct: 65 } }
    const rows = buildSets(st, cfg, { now: SENIN })
    const warm = rows.filter(r => r.phase === 'warmup')
    const work = rows.filter(r => r.phase !== 'warmup')
    expect(warm).toHaveLength(2)
    expect(work).toHaveLength(2)
  })

  it('latihan satu set tetap satu set, tidak pernah nol', () => {
    const st = { ...S(), ramadan: { on: true, volumeKeepPct: 40 } }
    expect(buildSets(st, { ...CFG, sets: 1 }, { now: SENIN })).toHaveLength(1)
  })
})
