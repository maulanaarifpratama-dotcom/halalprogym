/**
 * Pembakuan basis URL media. Modul sendiri, dan itu bukan kerapian — dia MEMUTUS SIKLUS IMPOR.
 *
 * `exercise-media.ts` dan `exercise-illustrations.ts` sama-sama membutuhkannya, dan
 * `exercise-media.ts` juga mengimpor resolver ilustrasi. Kalau `normalizeBase` tetap tinggal di
 * `exercise-media.ts`, keduanya saling mengimpor — dan siklus itu tidak berhenti di peringatan
 * lint: kedua modul memakai fungsi ini **saat inisialisasi** (`const BASE = normalizeBase(...)`),
 * jadi satu urutan muat yang salah membuat `normalizeBase` bernilai `undefined` dan seluruh basis
 * media jadi `undefined/Nama_Latihan/0.jpg`.
 *
 * Kegagalannya persis jenis yang paling mahal di repo ini: tidak ada error, tidak ada peringatan
 * build, cuma app yang menampilkan nol demo gerakan sementara `hasDemo` tetap bilang ada.
 */

/**
 * Memastikan basis media berakhir dengan garis miring, supaya bisa disambung langsung ke jalur
 * bingkai.
 *
 * Satu garis miring yang hilang di `VITE_DEMO_BASE` berarti `demoBench_Press/0.jpg` — dan
 * kegagalannya SUNYI. Diperbaiki di sini, bukan diserahkan ke siapa pun yang menyetel
 * variabelnya nanti.
 */
export const normalizeBase = (base: string): string =>
  (base && !base.endsWith('/') ? base + '/' : base)
