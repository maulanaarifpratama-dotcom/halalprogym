/**
 * Ilustrasi gerakan dari RepDB — dan kenapa dia MENANG atas foto.
 *
 * =============================================================================================
 * ALASANNYA ATURAN BRAND, BUKAN SELERA
 *
 * Foto free-exercise-db adalah foto ORANG SUNGGUHAN, dan sebagian di antaranya bertelanjang dada.
 * `DESIGN.md` melarang itu eksplisit, di bagian "Yang tidak boleh masuk":
 *
 *     "Figur manusia berpakaian minim sebagai demo gerakan — soal aurat DAN lisensi."
 *
 * Aturannya ada sejak hari pertama. Yang tidak pernah terjadi adalah MEMERIKSANYA ke foto yang
 * benar-benar dikirim — dan itu cuma ketahuan saat delapan foto dibuka satu per satu untuk
 * memverifikasi kecocokan gerakan. Tidak ada metadata di free-exercise-db yang menyatakan "model
 * bertelanjang dada", jadi aturan otomatis apa pun tidak akan pernah menangkapnya. Kelas yang sama
 * dengan `--acc-ink` dan `--label-3`: kesadaran ada di dokumen, pengukurannya tidak.
 *
 * Jadi untuk latihan yang tercakup KEDUA sumber, ilustrasi yang dipakai. Bukan karena lebih bagus
 * — karena dia memenuhi aturan yang fotonya langgar.
 *
 * =============================================================================================
 * LISENSI: RepDB Free Tier v1.0
 *
 *   1. Gratis untuk penggunaan pribadi DAN KOMERSIAL di dalam aplikasi.
 *   2. Atribusi WAJIB: tautan terlihat "Exercise data by RepDB (repdb.co)".
 *   3. TIDAK BOLEH diredistribusi sebagai dataset — termasuk dataset turunan. In-app saja.
 *   4. Gambar boleh diubah ukuran/dipotong/diwarnai ulang untuk pemakaian in-app.
 *   5. TIDAK BOLEH jadi input model generatif.
 *
 * **Term 3 menentukan cara berkas ini bekerja.** Repo ini publik — AGPL mewajibkannya — jadi
 * meng-commit gambarnya berarti mempublikasikan ulang datasetnya di repositori publik. Yang
 * di-commit cuma PETA (id katalog kami -> nama berkas mereka), dan peta itu karya kami.
 * Gambarnya dimuat dari distribusi RepDB sendiri lewat jsDelivr.
 *
 * Term 4 itu yang membuat pembundelan APK sah: menyalin ke dalam app adalah pemakaian in-app.
 * Cache-nya di luar repo dan diabaikan git.
 *
 * Atribusi ada di `NOTICE.md` dan di Pengaturan -> Tentang, dan dipaku
 * `exercise-illustrations.test.ts`. **Jangan hapus** — itu syarat lisensi, bukan sopan santun.
 *
 * =============================================================================================
 * COMMIT DI-PIN, DAN ITU BUKAN KERAPIAN
 *
 * Alasan yang sama dengan `FEDB_COMMIT`: kalau peta menunjuk satu commit dan gambar datang dari
 * commit lain, yang muncul di layar adalah GERAKAN YANG SALAH, tanpa error dan tanpa peringatan.
 * `@main` yang bergerak berarti peta dan gambar bisa berpisah tanpa suara.
 *
 * Nilainya harus sama di DUA tempat: di sini dan di `scripts/build-repdb-illustrations.mjs`.
 * Dipaku `exercise-illustrations.test.ts`.
 */
import MAP from './exercise-illustrations.json'
import type { Exercise } from './types.js'
import { normalizeBase } from './media-base.js'

const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}

export const REPDB_COMMIT = '8f25d055e243b882aa05acaa66c2c51b1a9fc2d1'

const CDN = `https://cdn.jsdelivr.net/gh/RepDB/exercise-dataset@${REPDB_COMMIT}/`

/**
 * Basis media bisa di-override saat build, sama seperti foto — dipakai build APK yang membundel
 * gambarnya sendiri.
 *
 * Jalur RepDB berbentuk `images/flat/nama-start.webp`, jalur foto berbentuk `Nama_Latihan/0.jpg`.
 * Bentuknya berbeda, jadi keduanya bisa hidup di bawah satu basis tanpa bertabrakan — dan itu
 * disengaja, karena APK cuma punya satu direktori demo.
 */
const BASE = normalizeBase(ENV.VITE_DEMO_BASE || CDN)

const FRAMES = MAP as Record<string, string[] | undefined>

/** Berapa latihan katalog yang punya ilustrasi. */
export const ILLUSTRATION_COUNT = Object.keys(FRAMES).length

/** Id latihan yang punya ilustrasi — dipakai `exercise-media.ts` untuk menghitung gabungannya. */
export const illustratedIds = (): string[] => Object.keys(FRAMES)

/**
 * URL bingkai ilustrasi untuk satu latihan; kosong kalau tidak ada yang dipetakan.
 *
 * Dua bingkai, selalu: awal dan puncak. Skrip pembuatnya menolak entri yang cuma punya satu,
 * karena UI ini dibangun di sekitar dua posisi yang bisa dibolak-balik — dan satu gambar diam
 * menjawab pertanyaan yang berbeda dari yang dijanjikan.
 */
export function illustrationFrames(ex: Pick<Exercise, 'id'> | null | undefined): string[] {
  const paths = ex?.id ? FRAMES[ex.id] : undefined
  return paths ? paths.map(p => BASE + p) : []
}

