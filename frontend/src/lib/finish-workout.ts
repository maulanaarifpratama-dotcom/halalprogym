import type { ActiveEntry, ActiveWorkout, SetRow, Workout, WorkoutEntry } from './types.js'

// The persisted boundary for a finished session. Keep this pure so compatibility tests can
// exercise the exact shape the UI writes without mounting React or mutating store state.

/** Satu latihan seperti yang DITULIS ke riwayat — bukan seperti yang direncanakan. */
export interface CompletedEntry extends WorkoutEntry {
  id?: string
  sets: SetRow[]
  /** `null`, bukan undefined: bentuk yang ditulis harus tetap byte-for-byte seperti dulu. */
  topW: number | null
  target: SetRow | null
  muscleSnapshot?: Record<string, unknown>
  note?: string
  notePin?: boolean
}

export interface CompletedWorkout extends Workout {
  entries: CompletedEntry[]
}

export interface BuildOptions {
  end?: number
  prs?: unknown[]
  /** Diberi entry, mengembalikan metadata otot untuk dibekukan bersama riwayatnya. */
  snapshotFor?: ((entry: ActiveEntry) => Record<string, unknown> | null | undefined) | null
}

export function buildCompletedWorkout(
  active: ActiveWorkout,
  { end = Date.now(), prs = [], snapshotFor }: BuildOptions = {}
): CompletedWorkout {
  const entries: CompletedEntry[] = (active?.entries || []).map(entry => {
    const completed: CompletedEntry = {
      id: entry.id,
      sets: entry.sets || [],
      topW: entry.topW || null,
      target: entry.target || null
    }
    const snapshot = typeof snapshotFor === 'function' ? snapshotFor(entry) : null
    if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot) && Object.keys(snapshot).length) {
      completed.muscleSnapshot = { ...snapshot }
    }
    // What you typed about this exercise today, and whether you asked to see it again next
    // time. Written only when there is something to keep, so an untouched entry is byte-for-byte
    // the shape it always was.
    const note = (entry.note || '').trim()
    if (note) {
      completed.note = note
      if (entry.notePin) completed.notePin = true
    }
    return completed
  }).filter(entry => entry.sets.some(set => set.done))

  const sessionNote = (active?.note || '').trim()

  return {
    id: active.id,
    d: active.d,
    start: active.start,
    end,
    routineId: active.routineId,
    name: active.name,
    bw: active.bw,
    entries,
    prs,
    ...(sessionNote ? { note: sessionNote } : {})
  }
}
