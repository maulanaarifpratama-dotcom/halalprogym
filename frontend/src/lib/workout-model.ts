// Focused workout semantics shared by session, history, and strength views.
// Legacy records have no explicit phase or mode, so the defaults preserve main's work/reps shape.
//
// PORT KE TYPESCRIPT — kenapa berkas ini yang pertama:
// Baris set punya DUA diskriminator ortogonal, dan semantiknya pernah membuat implementasi
// upstream salah (riwayatnya di docs/upstream/DOMAIN-NOTES-dropset-restpause.md). Sekarang
// keduanya jadi union eksplisit, dan yang paling penting — perbedaan yang bikin bug itu
// sekarang tertulis di tipe, bukan cuma di komentar:
//
//   drops    = kerja TAMBAHAN di atas set utama   -> ikut dihitung extraVolumeOf
//   clusters = PECAHAN dari `r` baris itu sendiri -> extraVolumeOf SELALU 0 untuk restpause
//
// Menukar dua makna itu adalah bug persisnya: `r` pernah menyimpan cuma potongan terbesar,
// jadi yang tampil di layar adalah pecahan acak dari angka yang diketik user.

import type { Cluster, Drop, SetMode, SetPhase, SetRow, SetType, WorkoutEntry } from './types.js'

// Tipe datanya tinggal di ./types.js — satu rumah untuk bentuk data tersimpan, dan Fase 2
// memetakannya ke tabel Supabase dari sana. Berkas ini memegang PERILAKU-nya.
export type { Cluster, Drop, SetMode, SetPhase, SetRow, SetType, WorkoutEntry }

const MODES: readonly SetMode[] = ['reps', 'time', 'cardio']
const isMode = (v: unknown): v is SetMode =>
  typeof v === 'string' && (MODES as readonly string[]).includes(v)

/**
 * Setiap objek diperlakukan sebagai SetRow yang mungkin cacat. Cast-nya disengaja: sumbernya
 * localStorage dan rekaman lama, jadi bentuknya memang tidak dijamin — dan justru karena itu
 * setiap pembaca di bawah tetap memeriksa sendiri.
 */
const objectOf = (value: unknown): SetRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SetRow) : {}

const num = (v: unknown): number => Number(v) || 0

function normalizedPhase(value: unknown, fallback: SetPhase = 'work'): SetPhase {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (token === 'warmup' || token === 'warm-up' || token === 'warm_up') return 'warmup'
  if (token === 'work') return 'work'
  return fallback === 'warmup' ? 'warmup' : 'work'
}

/** Resolve a row's phase. An explicit phase wins over the legacy warmup boolean. */
export function phaseForSet(set: unknown, fallback: SetPhase = 'work'): SetPhase {
  const source = objectOf(set)
  if (source.phase != null && source.phase !== '') return normalizedPhase(source.phase, fallback)
  return source.warmup === true ? 'warmup' : normalizedPhase(undefined, fallback)
}

export function isWarmupRow(set: unknown): boolean {
  return phaseForSet(set) === 'warmup'
}

// A row's shape beyond warm-up/work: 'straight' (default), 'dropset' (a main set followed by
// weight drops logged with no rest) or 'restpause' (an activation set followed by short-rest
// bursts). Both extras ride on the row itself — same card, not a new set in the array — the
// same trick `phase` uses for warm-ups, so the rest of the app can keep reading a row's own
// `w`/`r` and stay correct without knowing this field exists.
export function setType(set: unknown): SetType {
  const source = objectOf(set)
  return source.type === 'dropset' || source.type === 'restpause' ? source.type : 'straight'
}
export const isDropSet = (set: unknown): boolean => setType(set) === 'dropset'
export const isRestPauseSet = (set: unknown): boolean => setType(set) === 'restpause'

/** A drop-set's weight drops, oldest first; empty for anything else. */
export function dropsOf(set: unknown): Drop[] {
  const source = objectOf(set)
  return isDropSet(source) && Array.isArray(source.drops) ? source.drops : []
}

/** A rest-pause set's short-rest bursts, oldest first; empty for anything else. */
export function clustersOf(set: unknown): Cluster[] {
  const source = objectOf(set)
  return isRestPauseSet(source) && Array.isArray(source.clusters) ? source.clusters : []
}

/**
 * Weight x reps from a drop-set's drops, on top of its own main set. The 1RM estimate and the
 * progression engine deliberately read only a row's own `w`/`r` (the heaviest effort), so this
 * is the one place a drop-set's extra volume gets added back in for totals.
 *
 * A rest-pause row is different: its own `r` IS the total (every burst's reps included), and
 * `clusters` is only how that total breaks down — not extra volume on top of it. Adding
 * `clustersOf(set)` here as well would double-count the same reps twice.
 */
export function extraVolumeOf(set: unknown): number {
  return dropsOf(set).reduce((v, d) => v + num(d?.w) * num(d?.r), 0)
}

/** Append a weight drop to a row, marking it a drop-set. */
export function addDrop(set: unknown, drop?: Partial<Drop> | null): SetRow {
  const source = objectOf(set)
  const prev = Array.isArray(source.drops) ? source.drops : []
  return { ...source, type: 'dropset', drops: [...prev, { w: num(drop?.w), r: num(drop?.r) }] }
}

/** Append a short-rest burst to a row, marking it a rest-pause set. */
export function addCluster(set: unknown, cluster?: Partial<Cluster> | null): SetRow {
  const source = objectOf(set)
  const prev = Array.isArray(source.clusters) ? source.clusters : []
  return {
    ...source,
    type: 'restpause',
    clusters: [...prev, { r: num(cluster?.r), restSec: num(cluster?.restSec) }]
  }
}

/** Remove one drop by index. Clearing the last one reverts the row to a straight set. */
export function removeDropAt(set: unknown, i: number): SetRow {
  const source = objectOf(set)
  const drops = (source.drops || []).filter((_, idx) => idx !== i)
  return drops.length ? { ...source, drops } : { ...source, type: 'straight', drops }
}

/** Remove one burst by index. Clearing the last one reverts the row to a straight set. */
export function removeClusterAt(set: unknown, i: number): SetRow {
  const source = objectOf(set)
  const clusters = (source.clusters || []).filter((_, idx) => idx !== i)
  return clusters.length ? { ...source, clusters } : { ...source, type: 'straight', clusters }
}

/** Patch one drop's fields in place (weight/reps steppers edit an existing drop). */
export function setDropAt(set: unknown, i: number, patch: Partial<Drop>): SetRow {
  const source = objectOf(set)
  const drops = (source.drops || []).slice()
  const at = drops[i]
  if (!at) return source
  drops[i] = { ...at, ...patch }
  return { ...source, drops }
}

/** Patch one burst's fields in place (a reps stepper edits an existing burst). */
export function setClusterAt(set: unknown, i: number, patch: Partial<Cluster>): SetRow {
  const source = objectOf(set)
  const clusters = (source.clusters || []).slice()
  const at = clusters[i]
  if (!at) return source
  clusters[i] = { ...at, ...patch }
  return { ...source, clusters }
}

/** Suggested weight for the next drop: pct% lighter than the previous weight, rounded to .5. */
export function nextDropWeight(prevWeight: unknown, pct: unknown = 20): number {
  const p = Math.min(90, Math.max(1, Number(pct) || 20))
  return Math.round(Math.max(0, num(prevWeight) * (1 - p / 100)) * 2) / 2
}

/** Suggested reps for the next rest-pause burst: roughly half the previous rep count. */
export function nextBurstReps(prevReps: unknown): number {
  return Math.max(1, Math.round(num(prevReps) / 2))
}

/**
 * Split a rest-pause total (the extra reps you want past the activation set) into a descending,
 * roughly-halving sequence of bursts that adds back up to it — e.g. 12 -> [6, 3, 2, 1]. This is
 * what a planned rest-pause exercise configures directly, rather than a burst count picked by
 * hand: you say how many reps you want out of the whole rest-pause portion, not how many rests.
 */
export function splitBurstReps(total: unknown): number[] {
  const bursts: number[] = []
  let remaining = Math.max(0, Math.round(num(total)))
  while (remaining > 0) {
    const burst = Math.min(remaining, nextBurstReps(remaining))
    bursts.push(burst)
    remaining -= burst
  }
  return bursts
}

export function normalizeMode(value: unknown, fallback: unknown = 'reps'): SetMode {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (isMode(token)) return token
  return isMode(fallback) ? fallback : 'reps'
}

function modeFromUnit(value: unknown): SetMode | null {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (['rep', 'reps', 'repetition', 'repetitions'].includes(token)) return 'reps'
  if (['sec', 'secs', 'second', 'seconds'].includes(token)) return 'time'
  if (['min', 'mins', 'minute', 'minutes'].includes(token)) return 'cardio'
  return null
}

function explicitMode(source: unknown): SetMode | null {
  const value = objectOf(source)
  const token = typeof value.mode === 'string' ? value.mode.trim().toLowerCase() : ''
  return isMode(token) ? token : modeFromUnit(value.unit)
}

function inferredMode(source: unknown): SetMode | null {
  const value = objectOf(source)
  const explicit = explicitMode(value)
  if (explicit) return explicit
  if (String(value.mode || '').trim().toLowerCase() === 'amrap') return 'reps'
  if (value.min != null || value.speed != null) return 'cardio'
  if (value.sec != null || value.seconds != null || value.durationSec != null) return 'time'
  if (value.r != null || value.reps != null || value.actualReps != null) return 'reps'
  return null
}

/** Resolve one row's mode: explicit row, parent target, then legacy result fields. */
export function modeForSet(set: unknown, target: unknown = {}): SetMode {
  return explicitMode(set) || inferredMode(target) || inferredMode(set) || 'reps'
}

/** Resolve a single mode for an entry; mixed work-row modes intentionally return null. */
export function modeForEntry(entry: unknown, fallback: unknown = null): SetMode | null {
  const source = objectOf(entry) as WorkoutEntry & SetRow
  const target = objectOf(source.target || source)
  const sets = Array.isArray(source.sets) ? source.sets : []
  const work = sets.filter(set => !isWarmupRow(set))
  const observed = work.length ? work : sets
  const modes = [...new Set(observed.map(set => modeForSet(set, target)))]
  if (modes.length > 1) return null
  // noUncheckedIndexedAccess: modes[0] itu SetMode | undefined, dan bedanya bermakna di sini —
  // array kosong berarti "tidak ada baris untuk dibaca", bukan "mode-nya reps".
  const only = modes[0]
  if (only) return only
  const targetMode = inferredMode(target)
  if (targetMode) return targetMode
  return fallback == null ? modeForSet(source, target) : normalizeMode(fallback)
}
