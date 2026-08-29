#!/usr/bin/env node
/**
 * Menjalankan seluruh suite di zona waktu UTC.
 *
 * KENAPA INI ADA
 *
 * Gate lokal hijau berhari-hari sementara CI merah di SETIAP commit, dan tidak ada yang tahu.
 * Sebabnya: mesin pengembang di Asia/Jakarta, runner GitHub di UTC, dan dua tes waktu salat
 * bergantung pada zona waktu mesin. Yang lebih penting, itu bukan tes yang cerewet — dia
 * mengungkap bug produksi nyata: `adhan` membaca hari kalender dari zona RUNTIME, jadi perangkat
 * yang tidak sezona dengan kota terpilih mendapat jadwal hari yang salah.
 *
 * Jadi `npm run verify` sekarang menjalankan suite DUA KALI: sekali di zona mesin, sekali di UTC.
 * Yang pertama menjaga perilaku di tempat orang benar-benar memakainya; yang kedua menjaga agar
 * tidak ada lagi kelas kegagalan yang cuma muncul setelah di-push.
 *
 * KENAPA SKRIP, BUKAN `TZ=UTC vitest run` DI package.json. Bentuk `VAR=nilai perintah` itu
 * sintaks POSIX. `npm run` di Windows memakai cmd.exe, dan di sana baris itu gagal — sementara
 * `npm run verify` justru perintah yang paling sering dijalankan di mesin Windows pemilik repo
 * ini. Menyetel env lewat Node membuatnya jalan di kedua tempat tanpa menambah dependensi.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const anak = spawn(
  process.execPath,
  [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, TZ: 'UTC' } }
)

anak.on('exit', code => process.exit(code ?? 1))
anak.on('error', err => { console.error(err); process.exit(1) })
