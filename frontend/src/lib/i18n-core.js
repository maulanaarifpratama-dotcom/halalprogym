// Runtime-agnostic core of the i18n module: state, constants and readers (t, dateLocale,
// instrFor, exerciseNameFor, getLang). Plain Node-loadable — the browser-only pieces
// (import.meta.glob lazy
// loads, the React subscription hook) live in i18n.js and re-export from here.

export const LANGS = {
  // id ditaruh kedua, bukan menurut alfabet: itu bahasa pasar sasaran app ini.
  en: 'English', id: 'Bahasa Indonesia',
  de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português (Portugal)', 'pt-BR': 'Português (Brasil)', pl: 'Polski',
  tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी'
}
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko', 'pt-BR']
export const EXERCISE_NAME_LANGS = ['pt-BR']

/**
 * Bahasa yang meminjam pack INSTRUKSI dari saudara regionalnya.
 *
 * `pt` tidak punya pack instruksi, `pt-BR` punya — jadi pengguna Portugal mendapat instruksi
 * INGGRIS sementara pack Portugis yang hampir sempurna sudah ada di repo ini. Untuk teks
 * panjang seperti langkah gerakan, jarak Brasil-Portugal jauh lebih kecil daripada jarak
 * Portugis-Inggris.
 *
 * Cuma INSTRUKSI yang meminjam, bukan nama latihan: nama itu pendek, sudah bilingual dengan
 * Inggris di dalam kurung, dan perbedaan istilahnya jauh lebih terasa per-baris.
 *
 * `de` dan `id` tidak punya saudara, jadi keduanya tetap Inggris. Untuk `id` itu keputusan yang
 * sudah tercatat (instruksi Indonesia ~106 ribu kata, ditunda).
 */
export const INSTR_FALLBACK = { pt: 'pt-BR' }

/** Pack instruksi mana yang benar-benar dimuat untuk `lang` — null kalau memang Inggris. */
export const instrPackFor = lang => {
  if (!lang || lang === 'en') return null
  if (INSTR_LANGS.includes(lang)) return lang
  const pinjam = INSTR_FALLBACK[lang]
  return pinjam && INSTR_LANGS.includes(pinjam) ? pinjam : null
}
export const DATE_LOCALES = {
  en: 'en-GB', id: 'id-ID', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', 'pt-BR': 'pt-BR',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN'
}

let lang = 'en'                 // set only by _setLangState, called from i18n.js setLang
let dict = {}                   // current locale pack (empty = English fallback)
let instr = null                // { exId: [steps] } for the current language, null = English
let exerciseNames = null        // { exId: translated name }, null = original catalogue name
let version = 0                 // bumped on every setLang; drives the React subscription selector

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'
export const getVersion = () => version

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}

// Langkah instruksi bahasa Inggris, dimuat saat dibutuhkan. Lihat loadBaseInstructions.
let baseInstr = null
let baseInstrP = null

/**
 * Memuat instruksi bahasa Inggris (626 KB) sekali, di luar muat pertama.
 *
 * Dulu instruksinya menempel di tiap latihan sebagai field `st`, jadi seluruh app menunggu
 * 867 KB untuk memakai 180 KB — dan yang 71%-nya cuma dibaca saat seseorang membuka detail
 * SATU latihan. Sekarang dia berkas sendiri, diminta saat sheet-nya dibuka.
 *
 * Kegagalannya diam: instruksi yang tidak termuat berarti daftar kosong, bukan layar yang mati.
 * Nama, otot, dan alat latihannya tetap tampil, dan itu yang paling sering dicari orang.
 */
export function loadBaseInstructions() {
  if (baseInstr) return Promise.resolve(baseInstr)
  if (!baseInstrP) {
    baseInstrP = import('./exercises-instructions.js')
      .then(m => { baseInstr = m.default || {}; version++; return baseInstr })
      .catch(() => { baseInstrP = null; return {} })
  }
  return baseInstrP
}

/**
 * Instruksi untuk satu latihan dalam bahasa yang aktif.
 *
 * Urutannya: terjemahan bahasa itu, lalu bahasa Inggris, lalu `ex.st` untuk latihan buatan
 * pengguna (yang memang menyimpan langkahnya di objeknya sendiri, bukan di katalog).
 *
 * Mengembalikan daftar KOSONG kalau berkas Inggrisnya belum termuat. Pemanggil memicu
 * `loadBaseInstructions()` dan me-render ulang saat selesai.
 */
export const instrFor = ex =>
  (instr && instr[ex.id]) || (baseInstr && baseInstr[ex.id]) || ex.st || []

// Built-in catalogue names are bilingual when a complete translated name pack is active.
// User-created exercises have no entry in the pack and keep their exact chosen name.
export const exerciseNameFor = ex => {
  const translated = exerciseNames && ex && exerciseNames[ex.id]
  if (!translated) return ex?.n || ''
  // Some names (Burpee, Pilates, brand/model terms) are the established pt-BR term too.
  // Repeating an identical loanword in parentheses adds noise rather than context.
  return translated.toLocaleLowerCase('pt-BR') === ex.n.toLocaleLowerCase('en')
    ? translated
    : `${translated} (${ex.n})`
}

// Search both the localized and canonical English title without changing persisted data.
export const exerciseNameSearchText = ex => {
  const translated = exerciseNames && ex && exerciseNames[ex.id]
  return translated ? `${translated} ${ex.n}` : (ex?.n || '')
}

// Called by i18n.js's setLang once the locale pack has been loaded — kept here rather than
// exported as setLang because loading packs requires import.meta.glob, which is Vite-only.
// `dict`, `instr` and `exerciseNames` may be null to reset to their English fallbacks.
export function _setLangState(newLang, newDict, newInstr, newExerciseNames) {
  lang = LANGS[newLang] ? newLang : 'en'
  dict = lang === 'en' ? {} : (newDict || {})
  // `instrPackFor`, BUKAN `INSTR_LANGS.includes(lang)`. Baris ini mengulang gerbang yang sama
  // dengan pemuatnya, dan pengulangan itu yang membuang pack `pt-BR` yang baru saja diunduh
  // untuk `pt`: browser mengambil berkasnya, lalu baris ini menyetelnya ke null. Terlihat cuma
  // dari layar — labelnya sudah benar, isinya masih Inggris, dan nol error di mana pun.
  instr = instrPackFor(lang) ? (newInstr || null) : null
  exerciseNames = lang === 'en' || !EXERCISE_NAME_LANGS.includes(lang) ? null : (newExerciseNames || null)
  version++
  return version
}
