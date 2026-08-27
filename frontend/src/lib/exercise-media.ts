import MAP from './exercise-media.json'
import type { Exercise } from './types.js'

/**
 * Foto demo gerakan, dari free-exercise-db (Unlicense — dedikasi domain publik).
 *
 * KENAPA SUMBERNYA INI
 *
 * Gambar dan GIF dari dataset asal openGym adalah © Gym visual; memakainya secara komersial
 * butuh lisensi sendiri, jadi media itu dicabut dari fork ini (NOTICE.md). Itu meninggalkan
 * setiap latihan tanpa visual — untuk app latihan, hal paling intinya.
 *
 * free-exercise-db lisensinya **Unlicense**, diverifikasi lewat API GitHub (`spdx_id`),
 * bukan dari badge README. 873 latihan, masing-masing dua foto: posisi awal dan akhir.
 *
 * DUA BINGKAI, BUKAN ANIMASI — dan itu bukan kompromi
 *
 * Dua posisi diam yang bisa ditatap dan dibolak-balik sebenarnya lebih baik untuk mempelajari
 * bentuk gerakan daripada GIF tiga detik yang berputar terus: kamu bisa berhenti di posisi
 * yang ingin kamu tiru. GIF menang untuk tempo, dan tempo bukan yang orang cari saat menatap
 * demo di antara set.
 *
 * PEMETAANNYA CUMA 329 DARI 1.324 (24,8%), DENGAN SENGAJA
 *
 * Dibangun `scripts/build-exercise-media.mjs`, dan aturannya konservatif: nama identik, atau
 * selisih kata yang tidak membawa makna gerakan DAN otot primer setuju. Skor kemiripan
 * ditolak karena percobaannya menghasilkan kesalahan yang paling berbahaya — "rear delt raise"
 * dipetakan ke "rear delt ROW", "reverse close-grip" ke "close-grip". Orang meniru demo yang
 * dia lihat. Latihan tanpa foto mendapat diagram otot (`components/ExerciseAnatomy.jsx`),
 * yang informatif dan license-clean, bukan kotak kosong.
 */

// Dijaga: `import.meta.env` tidak ada di Node biasa, dan modul ini ikut terbawa tes.
const ENV: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && import.meta.env) || {}

/**
 * Commit yang di-pin, sama dengan yang dipakai skrip pembangun peta. Terpin, bukan `main`:
 * URL jsDelivr yang terpin bisa di-cache selamanya, dan peta ini dibangun terhadap commit
 * itu — `main` yang bergerak berarti peta dan gambar bisa berpisah tanpa suara.
 */
export const FEDB_COMMIT = 'b0eed061e1c832b3ed815fbaa4b45b3cdc14df49'

const CDN = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${FEDB_COMMIT}/exercises/`

/**
 * Basis media bisa di-override saat build. Dua kegunaannya nyata: build mobile yang membundel
 * gambarnya sendiri (jadi APK tidak butuh jaringan), dan yang self-host di belakang jaringan
 * tanpa akses CDN.
 */
const BASE = ENV.VITE_DEMO_BASE || CDN

const FRAMES = MAP as Record<string, string[] | undefined>

/** Berapa latihan katalog yang punya foto demo. Ditampilkan di header Latihan. */
export const DEMO_COUNT = Object.keys(FRAMES).length

/** URL bingkai demo untuk satu latihan; kosong kalau tidak ada yang dipetakan dengan aman. */
export function demoFrames(ex: Pick<Exercise, 'id'> | null | undefined): string[] {
  const paths = ex?.id ? FRAMES[ex.id] : undefined
  return paths ? paths.map(p => BASE + p) : []
}

/** Ada foto demo untuk latihan ini? */
export const hasDemo = (ex: Pick<Exercise, 'id'> | null | undefined): boolean =>
  demoFrames(ex).length > 0
