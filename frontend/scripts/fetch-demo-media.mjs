/**
 * Menyiapkan foto demo gerakan untuk APK, supaya app native membawanya sendiri.
 *
 * KENAPA INI ADA, DAN APA YANG SEBENARNYA RUSAK TANPANYA
 *
 * Aturan #1 CLAUDE.md: app tidak boleh menunggu jaringan. Di web itu sudah tertangani — service
 * worker men-cache foto dari CDN (`public/sw.js`), dan `lib/prefetch.ts` menyiapkan foto rencana
 * hari ini selagi masih di wifi.
 *
 * **Di APK, tidak ada satu pun dari keduanya.** `main.jsx` sengaja TIDAK mendaftarkan service
 * worker di build native — dan itu keputusan yang benar, karena shell-nya memang sudah disajikan
 * dari disk. Tapi akibat sampingannya tidak pernah ditutup: tanpa service worker, tidak ada cache
 * foto yang kita kendalikan, dan `prefetchMedia` diam-diam tidak melakukan apa pun karena tidak
 * ada registrasi untuk dikirimi pesan. Jadi di APK setiap foto gerakan butuh jaringan, setiap
 * kali — di kendaraan yang justru jadi jalur utama produk ini.
 *
 * `lib/exercise-media.ts` sudah menyiapkan pintunya sejak awal: `VITE_DEMO_BASE` menggantikan
 * basis CDN, dan komentarnya menyebut "build mobile yang membundel gambarnya sendiri (jadi APK
 * tidak butuh jaringan)". Pintu itu ada, tapi tidak pernah ada yang lewat: workflow Android tidak
 * menyetel variabelnya dan tidak ada yang mengunduh berkasnya. Skrip ini yang mengisinya.
 *
 * HARGANYA DIUKUR, BUKAN DITEBAK: 640 bingkai, **39 MB**. (Perkiraan awal dari 8 sampel bilang
 * 25 MB, dan itu salah — sampelnya kebetulan foto peregangan yang kecil.) Fotonya 850x567, yang
 * sudah ukuran wajar untuk layar HP, jadi tidak ada kemenangan mudah di kompresi. Yang dibeli
 * dengan 39 MB adalah demo gerakan yang tetap ada di basement gym tanpa sinyal — untuk app yang
 * alasan keberadaannya latihan, itu pertukaran yang jelas. Kalau APK-nya harus lebih kecil,
 * bangun tanpa `VITE_DEMO_BASE` dan foto kembali datang dari CDN.
 *
 * DUA DIREKTORI, DAN ITU BUKAN KERAPIAN
 *
 * Cache-nya di `media-cache/demo/`, BUKAN di `public/demo/`. Vite menyalin seluruh `public/` ke
 * `dist/` di SETIAP build, jadi menaruhnya di sana membuat build WEB ikut membawa 39 MB yang
 * tidak dipakai sama sekali — terukur: `dist` jadi 49 MB, dan itu terkirim ke Vercel tiap deploy.
 * Jadi: `--emit` yang menyalin cache ke `dist/demo/`, dan cuma build mobile yang memanggilnya.
 *
 * BERKASNYA TIDAK DI-COMMIT. Lisensinya Unlicense jadi boleh, tapi 39 MB biner di git berarti
 * setiap clone membayarnya selamanya. Diunduh saat build; `media-cache/` masuk .gitignore.
 *
 * Dua mode:
 *   node scripts/fetch-demo-media.mjs           unduh ke media-cache/demo/ (lewati yang sudah ada)
 *   node scripts/fetch-demo-media.mjs --force   unduh ulang semuanya
 *   node scripts/fetch-demo-media.mjs --emit     salin cache ke dist/demo/ (SETELAH vite build)
 */
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/** Cache unduhan. Di luar `public/`, supaya build web tidak ikut membawanya. */
export const CACHE = join(ROOT, 'media-cache', 'demo')

/** Tujuan di dalam hasil build. Harus cocok dengan `VITE_DEMO_BASE=demo/`. */
const DIST = join(ROOT, 'dist', 'demo')

/**
 * Commit di-pin, dan dibaca DARI `lib/exercise-media.ts` — bukan ditulis ulang di sini.
 *
 * CLAUDE.md sudah mewajibkan commit itu sama di dua tempat. Menuliskannya ketiga kali berarti
 * tiga tempat yang bisa menyimpang, dan menyimpangnya sunyi: peta menunjuk satu commit, foto
 * datang dari commit lain, dan yang muncul di layar adalah gerakan yang salah tanpa satu pun
 * error.
 */
async function pinnedCommit() {
  const src = await readFile(join(ROOT, 'src', 'lib', 'exercise-media.ts'), 'utf8')
  const m = src.match(/FEDB_COMMIT = '([0-9a-f]{40})'/)
  if (!m) throw new Error('FEDB_COMMIT tidak ketemu di src/lib/exercise-media.ts')
  return m[1]
}

const framePaths = async () => {
  const map = JSON.parse(await readFile(join(ROOT, 'src', 'lib', 'exercise-media.json'), 'utf8'))
  return [...new Set(Object.values(map).flat())]
}

const exists = async p => {
  try { return (await stat(p)).size > 0 } catch { return false }
}

async function unduh(force) {
  const commit = await pinnedCommit()
  const paths = await framePaths()
  const cdn = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${commit}/exercises/`

  console.log(`${paths.length} bingkai, commit ${commit.slice(0, 8)} → media-cache/demo/`)

  let sudah = 0
  let baru = 0
  let bytes = 0
  const gagal = []

  // Berurutan, bukan paralel. jsDelivr membatasi laju, dan 640 request bersamaan menghasilkan
  // 429 yang terbaca seperti berkas hilang — itu tepat jenis kegagalan yang paling mahal di sini,
  // karena hasilnya APK dengan foto bolong-bolong dan tidak ada yang menyadarinya.
  for (const rel of paths) {
    const dest = join(CACHE, rel)
    if (!force && await exists(dest)) { sudah++; continue }
    await mkdir(dirname(dest), { recursive: true })
    try {
      const res = await fetch(cdn + rel)
      if (!res.ok) { gagal.push(`${rel} → HTTP ${res.status}`); continue }
      const buf = Buffer.from(await res.arrayBuffer())
      if (!buf.length) { gagal.push(`${rel} → kosong`); continue }
      await writeFile(dest, buf)
      baru++
      bytes += buf.length
      if (baru % 100 === 0) console.log(`  ${baru} terunduh…`)
    } catch (e) {
      gagal.push(`${rel} → ${e.message}`)
    }
  }

  console.log(`${sudah} sudah ada, ${baru} terunduh (${(bytes / 1024 / 1024).toFixed(1)} MB)`)

  if (gagal.length) {
    // GAGAL KERAS. Bingkai yang hilang berarti peta mengklaim foto yang tidak ada, dan di app itu
    // muncul sebagai gambar rusak — BUKAN sebagai diagram otot, karena `hasDemo` sudah bilang
    // fotonya ada. Membiarkannya lolos berarti APK yang dibagikan dengan lubang di dalamnya.
    console.error(`\n${gagal.length} bingkai GAGAL:`)
    for (const g of gagal.slice(0, 20)) console.error('  ' + g)
    if (gagal.length > 20) console.error(`  … dan ${gagal.length - 20} lagi`)
    console.error('\nBingkai yang hilang tampil sebagai gambar rusak, bukan diagram otot —')
    console.error('hasDemo sudah mengatakan fotonya ada. Jangan bangun APK ini.')
    process.exit(1)
  }
}

/** Menghitung berkas di satu pohon, supaya `--emit` bisa membuktikan salinannya lengkap. */
async function hitung(dir) {
  let n = 0
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of entries) {
    if (e.isDirectory()) n += await hitung(join(dir, e.name))
    else n++
  }
  return n
}

async function emit() {
  const paths = await framePaths()
  const punya = await hitung(CACHE)
  if (punya < paths.length) {
    // Menyalin cache yang belum lengkap menghasilkan APK dengan lubang, dan lubangnya tidak
    // terlihat sampai seseorang membuka gerakan yang kebetulan hilang.
    console.error(`media-cache/demo/ cuma punya ${punya} dari ${paths.length} bingkai.`)
    console.error('Jalankan `npm run media:demo` dulu.')
    process.exit(1)
  }
  await mkdir(dirname(DIST), { recursive: true })
  await cp(CACHE, DIST, { recursive: true })
  const disalin = await hitung(DIST)
  if (disalin < paths.length) {
    console.error(`Salinan tidak lengkap: ${disalin} dari ${paths.length}.`)
    process.exit(1)
  }
  console.log(`${disalin} bingkai disalin ke dist/demo/`)
}

const argv = process.argv.slice(2)
const jalan = argv.includes('--emit') ? emit(argv) : unduh(argv.includes('--force'))
jalan.catch(e => { console.error(e); process.exit(1) })
