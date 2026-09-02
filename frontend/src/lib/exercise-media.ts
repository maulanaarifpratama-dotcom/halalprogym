import MAP from './exercise-media.json'
import type { Exercise } from './types.js'
import { normalizeBase } from './media-base.js'
import { illustrationFrames, illustratedIds } from './exercise-illustrations.js'

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
 * PEMETAANNYA CUMA 376 DARI 1.324 (28,4%), DENGAN SENGAJA
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
 * Di-reexport dari `media-base.ts`, yang jadi modul sendiri untuk MEMUTUS SIKLUS IMPOR antara
 * berkas ini dan `exercise-illustrations.ts`. Alasan lengkapnya di sana; ringkasnya: keduanya
 * memakai fungsi ini saat inisialisasi, jadi siklusnya menghasilkan basis `undefined/...` tanpa
 * satu pun error.
 *
 * Tetap diekspor dari sini karena `exercise-media.test.ts` dan skrip build sudah mengimpornya
 * dari sini, dan memindahkan titik impornya tidak menambah kejelasan apa pun.
 */
export { normalizeBase }

/**
 * Basis media bisa di-override saat build. Dua kegunaannya nyata, dan keduanya dipakai:
 *
 * - **Build mobile membundel fotonya sendiri**, jadi APK tidak butuh jaringan. Ini bukan
 *   kenyamanan: di build native `main.jsx` sengaja tidak mendaftarkan service worker, jadi tidak
 *   ada cache foto yang kita kendalikan dan `prefetchMedia` diam-diam tidak melakukan apa pun.
 *   Tanpa bundel, setiap foto butuh jaringan setiap kali — di kendaraan yang justru jalur utama
 *   produk ini. Diisi `scripts/fetch-demo-media.mjs`, dipanggil `npm run build:mobile`.
 * - Yang self-host di belakang jaringan tanpa akses CDN.
 */
const BASE = normalizeBase(ENV.VITE_DEMO_BASE || CDN)

const FRAMES = MAP as Record<string, string[] | undefined>

/** Berapa latihan katalog yang punya FOTO — bukan total demo. Lihat `DEMO_COUNT`. */
export const PHOTO_COUNT = Object.keys(FRAMES).length

/**
 * Berapa latihan katalog yang punya demo apa pun: ilustrasi ATAU foto.
 *
 * GABUNGAN, bukan penjumlahan. Puluhan latihan punya keduanya, dan menjumlahkannya akan mengklaim
 * cakupan yang tidak ada — angka ini tampil di header Latihan, jadi salahnya terlihat pengguna.
 */
export const DEMO_COUNT = new Set([...illustratedIds(), ...Object.keys(FRAMES)]).size

/**
 * URL bingkai demo untuk satu latihan; kosong kalau tidak ada yang dipetakan dengan aman.
 *
 * **ILUSTRASI MENANG ATAS FOTO**, dan alasannya aturan brand bukan selera: foto free-exercise-db
 * adalah foto orang sungguhan dan sebagian bertelanjang dada, yang `DESIGN.md` larang eksplisit
 * ("Figur manusia berpakaian minim sebagai demo gerakan — soal aurat DAN lisensi"). Alasan
 * lengkapnya di kepala `exercise-illustrations.ts`.
 *
 * Urutannya hidup DI SINI, bukan di pemanggil: `Media.jsx`, `prefetch.ts`, dan seluruh tesnya
 * memanggil `demoFrames` dan tidak perlu tahu ada dua sumber. Menyebarkan pilihan sumber ke
 * pemanggil berarti tiga tempat yang bisa memilih berbeda.
 */
export function demoFrames(ex: Pick<Exercise, 'id'> | null | undefined): string[] {
  const gambar = illustrationFrames(ex)
  if (gambar.length) return gambar
  const paths = ex?.id ? FRAMES[ex.id] : undefined
  return paths ? paths.map(p => BASE + p) : []
}

/** Ada foto demo untuk latihan ini? */
export const hasDemo = (ex: Pick<Exercise, 'id'> | null | undefined): boolean =>
  demoFrames(ex).length > 0
