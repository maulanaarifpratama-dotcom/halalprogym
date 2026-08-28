import { EXDB } from './exercises-data.js'
import { USER_EXERCISE_MUSCLE_OVERRIDES, exerciseMuscleMetadataFor } from './exercise-muscle-batch-1.js'
import { t, getVersion, exerciseNameSearchText } from './i18n-core.js'
import type { Exercise, MuscleSource } from './types.js'

export { EXDB }

// The generated dataset remains the compatibility/raw export. The runtime catalogue applies
// owner-approved muscle metadata as a narrow overlay, so imports and historical tests that rely
// on the upstream shape keep working while EXIDX and pickers see the corrected model.
const catalogueExercise = (ex: Exercise): Exercise => {
  const metadata = exerciseMuscleMetadataFor(ex?.id)
  if (!Object.keys(metadata).length) return ex
  const out = { ...ex, ...metadata } as Exercise & MuscleSource
  const overrides = USER_EXERCISE_MUSCLE_OVERRIDES as Record<string, Record<string, unknown> | undefined>
  const user = overrides[ex?.id] || {}
  // A future dataset row may carry explicit arrays of its own; preserve those over generated
  // defaults unless the owner has deliberately supplied a correction for the same field.
  for (const key of ['primaries', 'secondaries']) {
    if (Object.prototype.hasOwnProperty.call(ex, key) && !Object.prototype.hasOwnProperty.call(user, key)) {
      out[key] = (ex as unknown as MuscleSource)[key]
    }
  }
  if (Array.isArray(out.primaries)) out.primaries = [...out.primaries]
  if (Array.isArray(out.secondaries)) out.secondaries = [...out.secondaries]
  return out
}

export const CATALOGUE: Exercise[] = (EXDB as Exercise[]).map(catalogueExercise)

// The generated dataset already supplies secondary muscles for most exercises. Keep the
// handful of conservative catalogue additions that are useful to the muscle map here so a
// dataset refresh does not erase them. Values follow the dataset's existing alias vocabulary.
const SECONDARY_ADDITIONS: Record<string, string[]> = {
  '0027': ['rear deltoids'], // barbell bent over row
  '0293': ['rear deltoids'], // dumbbell bent over row
  '0499': ['rear deltoids'], // inverted row
  '0861': ['rear deltoids'], // cable seated row
}

// Secondary muscles for an exercise, with the small conservative additions applied as an
// overlay. The raw dataset is never mutated - consumers that want the pristine catalogue
// (export, print, import) keep reading EXDB untouched, while the muscle map sees the
// enriched list. Values follow the dataset's existing alias vocabulary.
/**
 * Otot sekunder, dengan tambahan konservatif sebagai overlay.
 *
 * Parameternya rekaman longgar dengan sengaja: dia dipanggil dari muscles.ts dengan sumber
 * metadata apa pun — entri katalog, entri riwayat, atau snapshot yang tertinggal setelah
 * latihan buatan user dihapus. Yang dibaca cuma `id` dan `sm`.
 */
export const smOf = (ex: MuscleSource | null | undefined): string[] => {
  const base = (Array.isArray(ex?.sm) ? ex.sm : (ex?.sm ? [ex.sm] : [])) as string[]
  return [...new Set([...base, ...(SECONDARY_ADDITIONS[String(ex?.id ?? '')] || [])])]
}

/**
 * Indeks id -> latihan. Memuat katalog bawaan DAN latihan buatan user, yang digabungkan
 * `registerCustom` — jadi setiap pencarian `EXIDX[id]` tetap bekerja apa pun asal latihannya.
 *
 * Nilainya `Exercise | undefined` dan itu penting: id bisa datang dari berkas rencana yang
 * dibangun terhadap dataset lain, atau dari latihan buatan user yang sudah dihapus di
 * perangkat lain sebelum sync tiba. `exOr` yang menangani kasus itu.
 */
export const EXIDX: Record<string, Exercise | undefined> = {}
CATALOGUE.forEach(e => { EXIDX[e.id] = e })
export const BODYPARTS: string[] = [...new Set(CATALOGUE.map(e => e.bp))].sort()

// Equipment options present in a given list of exercises, most common first (issue #6).
// Deriving them from the *already filtered* list keeps the chip row short and means
// every body-part × equipment combination on screen has results behind it.
export function equipmentOf(list: Pick<Exercise, 'eq'>[]): string[] {
  const c: Record<string, number> = {}
  list.forEach(e => { if (e.eq) c[e.eq] = (c[e.eq] || 0) + 1 })
  return Object.keys(c).sort((a, b) => (c[b] ?? 0) - (c[a] ?? 0) || (a < b ? -1 : 1))
}

// Custom (user-created) exercises live in synced state S.customEx (issue #11) and are
// merged into the id index here so every EXIDX[id] lookup keeps working unchanged.
let customIds: string[] = []
export function registerCustom(list: Exercise[] | null | undefined): void {
  customIds.forEach(id => {
    delete EXIDX[id]
    const builtIn = CATALOGUE.find(ex => ex.id === id)
    if (builtIn) EXIDX[id] = builtIn
  })
  customIds = (list || []).map(e => e.id)
  ;(list || []).forEach(e => { EXIDX[e.id] = e })
}
// Full searchable catalogue — customs first so your own exercises are easy to find.
export const allExercises = (st: { customEx?: Exercise[] }): Exercise[] =>
  [...(st.customEx || []), ...CATALOGUE]

function searchableText(value: unknown): string {
  if (Array.isArray(value)) return value.map(searchableText).join(' ')
  if (value == null) return ''
  try { return String(value) } catch { return '' }
}

/** Case-insensitive search over built-in and legacy custom exercise metadata. */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0
  for (const ch of hay) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

// Fuzzy match score for one exercise against a query. Best hits: exact field match, then
// field prefix, then word-boundary starts, then substrings (closer to the start scores
// better), and finally typo-tolerant ordered subsequences. Fields are weighted - the name
// dominates, target/equipment matter, muscles and description are supporting evidence.
// 0 means no match, so matchesExerciseSearch stays a boolean filter while the picker can
// rank results by score.
export function searchScore(exercise: unknown, query: unknown): number {
  const needle = searchableText(query).toLowerCase().trim()
  if (!needle) return 1
  const source = (exercise && typeof exercise === 'object' ? exercise : {}) as Record<string, unknown>
  const fields: Array<[string, number]> = [['n', 100], ['tg', 40], ['eq', 40], ['sm', 30], ['muscleGroups', 30], ['primaries', 30], ['secondaries', 30], ['desc', 10], ['cues', 10]]
  // Token-level matching: every query word must match somewhere (any order), so
  // "press bench" finds "Bench Press". The score sums each token's best hit.
  const tokens = needle.split(/[^a-z0-9]+/).filter(Boolean)
  if (!tokens.length) return 0
  let total = 0
  for (const token of tokens) {
    let best = 0
    for (const [field, weight] of fields) {
      const hay = searchableText(source[field]).toLowerCase()
      if (!hay) continue
      if (hay === token) best = Math.max(best, weight * 4)
      else if (hay.startsWith(token)) best = Math.max(best, weight * 3)
      const idx = hay.indexOf(token)
      if (idx > 0) best = Math.max(best, weight * 2 - Math.min(idx, 20) * 0.5)
      if (hay.split(/[^a-z0-9]+/).some(w => w.startsWith(token))) best = Math.max(best, weight * 2.5)
      if (isSubsequence(token, hay)) best = Math.max(best, weight + Math.max(0, 10 - (hay.length - token.length)))
    }
    if (!best) return 0 // every token must match
    total += best
  }
  return total
}

export function matchesExerciseSearch(exercise: unknown, query: unknown): boolean {
  return searchScore(exercise, query) > 0
}

// MEDIA WARISAN SUDAH DICABUT SEPENUHNYA.
//
// Dulu di sini ada `imgSrc`/`gifSrc` yang menyusun URL ke gambar dan GIF asal openGym. Media itu
// **© Gym visual**, dan memakainya untuk produk komersial dilarang (CLAUDE.md). Satu-satunya
// yang menyalakannya adalah env `VITE_IMG_BASE` — sebuah jalur yang tidak boleh dinyalakan
// siapa pun.
//
// Nama berkasnya (`img`/`gif`, 46 KB di katalog) ikut dibuang. Menyimpan penunjuk ke media
// terlarang bukan cuma boros; dia ranjau yang menunggu seseorang menyalakannya.
//
// Yang dipakai sekarang: foto free-exercise-db berlisensi Unlicense lewat lib/exercise-media.ts,
// dan diagram otot MuscleMap untuk yang tidak punya foto.


// Cardio exercises log time + speed instead of weight × reps.
export const isCardio = (idOrEx: string | Pick<Exercise, 'bp'> | null | undefined): boolean =>
  (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.bp === 'cardio'

// Exercises the dataset already knows carry no external load (issue #32) — a quarter of the
// catalogue. This seeds the `bw` flag on a fresh config so a push-up never asks for a weight
// nobody was going to enter. It is only the default: the flag lives on the config, so a dip
// done with a belt can turn it off and a custom exercise can turn it on.
export const isBodyweightEq = (
  idOrEx: string | Pick<Exercise, 'eq'> | null | undefined
): boolean =>
  (typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx)?.eq === 'body weight'

// An id that resolves to nothing — a plan file built against a different exercise dataset,
// a custom exercise deleted on another device before the sync arrived — still has to
// render. A placeholder keeps it visible (and removable) instead of taking the whole view
// down on the first `ex.n`.
export const exOr = (id: string): Exercise => EXIDX[id] ||
  { id, n: t('Unknown exercise'), bp: '', tg: '', eq: '', sm: [], st: [], missing: true }

// Normalizes text by lowercasing and stripping diacritics/accents (e.g. "elevação" -> "elevacao")
export const normalizeStr = (s: string | null | undefined): string => (s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

// Multi-token, accent-insensitive and multilingual exercise search.
// Matches when all whitespace-separated words in the query appear anywhere in the exercise's
// name, equipment, target muscle, body part (both in English and translated to active language),
// secondary muscles or description.
//
// The haystack is built once per exercise and cached: NFD-normalising ~1300 catalogue entries
// on every keystroke costs ~8ms on a desktop and several times that on a phone. The cache key
// is the i18n version (bumped by every setLang), so switching language rebuilds the translated
// terms. Custom exercises are re-cached automatically — the store clones state on update, so an
// edited exercise arrives as a new object the WeakMap has never seen.
const corpusCache = new WeakMap<object, { v: number; s: string }>()

function corpusOf(e: MuscleSource): string {
  const v = getVersion()
  const hit = corpusCache.get(e)
  if (hit && hit.v === v) return hit.s
  const sm = (Array.isArray(e?.sm) ? e.sm : []) as string[]
  const s = normalizeStr([
    exerciseNameSearchText(e),
    String(e?.tg || ''), t(String(e?.tg || '')),
    String(e?.eq || ''), t(String(e?.eq || '')),
    String(e?.bp || ''), t(String(e?.bp || '')),
    ...sm, ...sm.map(m => t(m)),
    String(e?.desc || '')
  ].join(' '))
  corpusCache.set(e, { v, s })
  return s
}

export function matchExercise(e: MuscleSource | null | undefined, query: string | null | undefined): boolean {
  if (!query) return true
  const tokens = normalizeStr(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  if (!e || typeof e !== 'object') return false
  const corpus = corpusOf(e)
  return tokens.every(tok => corpus.includes(tok))
}
