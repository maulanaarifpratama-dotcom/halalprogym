#!/usr/bin/env node
// Cari identifier yang DIPAKAI tapi tidak pernah dideklarasikan atau diimpor.
//
//   node scripts/check-undefined-names.mjs
//
// KENAPA INI ADA
//
// tsconfig memakai `allowJs: true` dengan `checkJs: false` — itu keputusan yang benar, karena
// migrasi ke TS berjalan bertahap dan menyalakan checkJs sekarang menghasilkan 2.365 error yang
// hampir semuanya implicit-any, bukan bug. Tapi harganya nyata: di berkas .jsx, TypeScript tidak
// memeriksa apa pun, termasuk apakah sebuah nama benar-benar ada.
//
// Dua bug lolos lewat celah itu, dan dua-duanya mematikan satu layar penuh:
//
//   Settings.jsx  `CITIES` dipakai di pemilih kota tapi tidak pernah diimpor. Layar Pengaturan
//                 langsung jatuh ke error boundary — bukan sebagian, seluruhnya.
//   Stats.jsx     `MuscleBalance` memanggil `onExercise` yang tidak pernah dikirim dan tidak
//                 pernah dideklarasikan. Modul ESM selalu strict, jadi ketukan pertama pada
//                 baris latihan melempar ReferenceError.
//
// Yang bikin pahit: tes yang ada MEMAKU baris `onExercise` itu lewat pencocokan teks sumber.
// Tes bisa hijau di atas simbol yang tidak ada, karena yang diperiksanya string, bukan program.
//
// CARA KERJANYA
//
// Jalankan tsc dengan --checkJs, lalu SARING hanya kode diagnostik yang menjawab pertanyaan
// "apakah nama ini ada":
//
//   TS2304  Cannot find name 'X'
//   TS2552  Cannot find name 'X'. Did you mean 'Y'?
//
// Semua kebisingan implicit-any diabaikan. Jadi guard ini bisa dipatok NOL hari ini tanpa perlu
// menunggu migrasi TS selesai, dan tetap gagal begitu ada nama baru yang menggantung.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CODES = /error TS(2304|2552):/

// tsc dijalankan sebagai skrip Node biasa, bukan lewat npx. Dua alasan, keduanya kena di mesin
// ini: npx di Windows adalah `npx.cmd`, dan Node 24 menolak spawn berkas .cmd tanpa `shell: true`
// (EINVAL), sementara `shell: true` sendiri memicu peringatan deprecation karena argumennya cuma
// digabung tanpa di-escape. Memanggil lib/tsc.js langsung tidak butuh shell di platform mana pun.
const TSC = join(ROOT, 'node_modules', 'typescript', 'lib', 'tsc.js')
const tsc = spawnSync(
  process.execPath,
  [TSC, '--noEmit', '-p', 'tsconfig.json', '--checkJs'],
  { cwd: ROOT, encoding: 'utf8' }
)

const out = (tsc.stdout || '') + (tsc.stderr || '')

// tsc keluar dengan kode bukan-nol karena error implicit-any yang memang kita abaikan, jadi
// exit code-nya tidak bisa dipakai. Yang menandakan tsc benar-benar gagal jalan adalah tidak
// adanya keluaran diagnostik sama sekali — diam-diam lolos itu justru kegagalan terburuk.
if (!out.trim()) {
  console.error('tsc tidak menghasilkan keluaran apa pun. Guard ini tidak memeriksa apa-apa.')
  console.error(tsc.error ? String(tsc.error) : 'status: ' + tsc.status)
  process.exit(2)
}

const hits = out.split(/\r?\n/).filter(line => CODES.test(line))

if (hits.length) {
  console.error(hits.length + ' nama dipakai tapi tidak pernah dideklarasikan atau diimpor:\n')
  for (const h of hits) console.error('  ' + h.trim())
  console.error('\nImpor namanya, atau terima sebagai prop. Nama yang menggantung di .jsx tidak')
  console.error('ketangkap typecheck biasa, dan melempar ReferenceError saat dijalankan.')
  process.exit(1)
}

console.log('Nol nama menggantung di seluruh src/ (termasuk .jsx yang tidak dicek typecheck).')
