// Effort as a statistic: one internal scale, both display scales.
//
// A set carries either `rir` or `rpe` and is never rewritten — switching the setting changes
// what new sets ask for, nothing else (see history.js). For a *chart* that is a problem: a
// history that mixes the two (own logs in RIR, an imported file in RPE) would draw two
// half-empty series. So everything aggregates in RIR and is converted back for display.
// RIR is the internal unit because it has a real zero — a set taken to failure — where RPE's
// floor of 6 is only a convention about which sets are worth rating. RPE 8 == RIR 2.
import { EFFORT, effortOf } from './history.js'
import { startOfWeek, weekKey } from './format.js'
import { isWarmupRow } from './workout-model.js'
import type { AppState, SetRow, Workout, WorkoutEntry } from './types.js'

/** Skala yang ditampilkan. Internalnya SELALU RIR — lihat catatan di atas. */
export type EffortScale = 'rir' | 'rpe'

/** Baris set dengan rating effort. Keduanya opsional: effort itu opsional dan mati by default. */
type RatedSet = SetRow & { rir?: number | null; rpe?: number | null }

// At or below this a set is close enough to failure to be the kind that drives adaptation.
// 3 rather than 2: the line is a convention, and drawn one rep too generously it still
// separates working sets from the ones left in the warm-up range.
export const HARD_RIR = 3
// Below this many rated sets an average is noise. Showing "RIR 1.0" off a single set reads
// like a finding when it is one tap, so the callers show a dash instead.
export const MIN_RATED = 5

/** A set's effort in RIR, or null when it was never rated. 0 is a rating, not "empty". */
export const rirOf = (s: RatedSet | null | undefined): number | null =>
  !s ? null : s.rir != null ? s.rir : s.rpe != null ? 10 - s.rpe : null

/** RIR → the scale being displayed. The reverse of rirOf, for one number. */
export const toScale = (kind: string, rir: number | null | undefined): number | null =>
  rir == null ? null : Math.round((kind === 'rpe' ? 10 - rir : rir) * 10) / 10

/**
 * Which scale to *label* aggregates with. The profile's own setting wins; a profile that
 * logs nothing itself but carries rated history (the imported-from-Hevy case) is shown the
 * scale that history is actually written in, rather than an RIR it has never seen.
 */
export function displayScale(S: AppState): EffortScale {
  const k = effortOf(S)
  if (k === 'rir' || k === 'rpe') return k
  let rir = 0, rpe = 0
  eachDoneSet(S, s => { if (s.rir != null) rir++; else if (s.rpe != null) rpe++ })
  return rpe > rir ? 'rpe' : 'rir'
}
// EFFORT diimpor dari history.js yang masih JS, jadi tipenya hasil inferensi tanpa index
// signature. Dilebarkan sekali di sini, bukan di setiap pembaca.
const EFFORT_MAP = EFFORT as Record<string, { hd: string } | undefined>

/**
 * Label skala untuk agregat.
 *
 * Diketik ke EffortScale supaya pemanggil TS tidak bisa mengirim 'none'; guard runtime-nya
 * untuk pemanggil .jsx yang belum diketik. Jalur lama melakukan `EFFORT[kind].hd` tanpa
 * penjagaan sama sekali — 'none' atau null di situ berarti TypeError, bukan label kosong.
 * Tidak terjangkau hari ini (kedua pemanggil di Stats.jsx mengirim displayScale(), yang
 * selalu 'rir' atau 'rpe'), tapi stepEffort dan capEffort di history KEDUANYA menjaga, jadi
 * fungsi inilah yang keluar dari pola. Fallback-nya RIR karena RIR unit internalnya.
 */
export const scaleName = (kind: EffortScale | string): string =>
  EFFORT_MAP[kind]?.hd ?? 'RIR'

// Every finished set in the profile, oldest first. `fn` gets the set plus the workout it
// belongs to, which is what the windowed and per-week views need.
function eachDoneSet(
  S: AppState,
  fn: (s: RatedSet, w: Workout, e: WorkoutEntry) => void
): void {
  ;(S.workouts || []).forEach(w =>
    (w.entries || []).forEach(e =>
      (e.sets || []).forEach(s => { if (s.done && !isWarmupRow(s)) fn(s as RatedSet, w, e) })))
}

// A window in days, counted back from now. 0 = everything, which is also what an empty
// history means for every caller here.
const inWindow = (w: Workout, days: number | undefined): boolean =>
  !days || startMsOf(w) > Date.now() - days * 86400000

// `start` kalau ada, kalau tidak dari tanggalnya. Riwayat impor sering tidak punya jam, dan
// tanggal yang juga hilang menghasilkan NaN — perbandingan apa pun dengan NaN itu false,
// jadi sesi tanpa waktu jatuh keluar dari setiap window. Itu perilaku jalur lama, dipertahankan.
const startMsOf = (w: Workout): number => w.start || new Date(w.d as string).getTime()

export const avgRir = (sets: RatedSet[] | null | undefined): number | null => {
  const vs = (sets || []).map(rirOf).filter((v): v is number => v != null)
  return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null
}

export interface EffortSummary {
  done: number
  rated: number
  hard: number
  avg: number | null
  hardPct: number | null
}

/**
 * The headline numbers for a window: how hard, how much of it was hard, and — the part that
 * keeps the rest honest — how much of the training was rated at all. Effort is optional and
 * off by default, so partial coverage is the normal case; an average without its denominator
 * would quietly speak for sets that were never rated.
 */
export function effortSummary(S: AppState, days?: number): EffortSummary {
  let done = 0, rated = 0, sum = 0, hard = 0
  eachDoneSet(S, (s, w) => {
    if (!inWindow(w, days)) return
    done++
    const r = rirOf(s)
    if (r == null) return
    rated++; sum += r
    if (r <= HARD_RIR) hard++
  })
  return {
    done, rated, hard,
    avg: rated >= MIN_RATED ? sum / rated : null,
    hardPct: rated >= MIN_RATED ? hard / rated : null
  }
}

/** Does this profile hold any rated set at all? Decides whether the effort UI exists. */
export function hasEffort(S: AppState): boolean {
  let any = false
  eachDoneSet(S, s => { if (!any && rirOf(s) != null) any = true })
  return any
}

export interface EffortWeek {
  /** Ahad minggu itu, dalam ms — posisi x titiknya. */
  t: number
  rir: number
  /** Berapa set yang DIRATING minggu itu. */
  n: number
  /** Berapa set total minggu itu, dirating atau tidak. Pasangannya yang jadi intinya. */
  sets: number
}

/**
 * Average effort per calendar week, with the week's set count alongside: the pair is the
 * point. Volume up with effort up is fatigue accumulating; volume up with effort flat is the
 * adaptation you were training for. Weeks with a single rated set are dropped rather than
 * drawn — one tap should not become a peak in the curve.
 */
export function effortWeeks(S: AppState, days?: number): EffortWeek[] {
  interface Acc { k: string; t: number; sum: number; n: number; sets: number }
  const wk = new Map<string, Acc>()
  eachDoneSet(S, (s, w) => {
    if (!inWindow(w, days)) return
    const k = weekKey(w.d as string)
    let e = wk.get(k)
    if (!e) wk.set(k, e = { k, t: startOfWeekMs(w.d as string), sum: 0, n: 0, sets: 0 })
    e.sets++
    const r = rirOf(s)
    if (r != null) { e.sum += r; e.n++ }
  })
  return [...wk.values()].filter(e => e.n >= 2).sort((a, b) => a.t - b.t)
    .map(e => ({ t: e.t, rir: e.sum / e.n, n: e.n, sets: e.sets }))
}

// Ahad-nya minggu itu, dalam ms — posisi x titik minggunya. Dulu Senin; sekarang mengikuti
// startOfWeek supaya sumbu grafik dan pengelompokan weekKey menandai minggu yang SAMA.
// Kalau keduanya beda basis, satu latihan hari Ahad akan digambar di minggu yang berbeda dari
// tempat dia dihitung.
const startOfWeekMs = (iso: string): number => +startOfWeek(new Date(iso + 'T12:00:00'))

export interface HistogramBin {
  rir: number
  /** Bucket teratas mengumpulkan semua yang lebih longgar dari itu. */
  tail: boolean
  n: number
  pct: number
}

/**
 * How the rated sets spread across the scale, in whole steps with everything past the top
 * bucket collapsed into it. This is the chart that answers "am I training too far from
 * failure, or leaving nothing for the next session" — an average alone hides both, because
 * half the sets at 0 and half at 4 average to a healthy-looking 2.
 */
export const BUCKETS = 4        // 0,1,2,3 and a "4+" tail
export function effortHistogram(S: AppState, days?: number): HistogramBin[] {
  const bins: number[] = new Array<number>(BUCKETS + 1).fill(0)
  let rated = 0
  eachDoneSet(S, (s, w) => {
    if (!inWindow(w, days)) return
    const r = rirOf(s)
    if (r == null) return
    rated++
    const i = Math.min(BUCKETS, Math.max(0, Math.floor(r)))
    // noUncheckedIndexedAccess: i sudah diclamp ke [0, BUCKETS] dan bins panjangnya
    // BUCKETS+1, jadi ini tidak mungkin undefined — tapi tipenya tidak tahu itu.
    bins[i] = (bins[i] ?? 0) + 1
  })
  return bins.map((n, i) => ({ rir: i, tail: i === BUCKETS, n, pct: rated ? n / rated : 0 }))
}

/** A set that counts as hard — the filter behind the muscle map's "hard sets" mode. */
export const isHardSet = (s: RatedSet | null | undefined): boolean => {
  const r = rirOf(s)
  return r != null && r <= HARD_RIR
}
