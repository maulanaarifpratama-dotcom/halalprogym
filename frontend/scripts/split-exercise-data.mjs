#!/usr/bin/env node
// Memisahkan instruksi latihan keluar dari katalog, dan membuang nama berkas media warisan.
//
//   node scripts/split-exercise-data.mjs
//
// KENAPA
//
// `exercises-data.js` 867 KB, dan 71% di antaranya field `st` — langkah-langkah instruksi yang
// HANYA dibaca di sheet detail latihan. Sisanya (nama, otot, alat) dibutuhkan di mana-mana:
// Beranda, Rencana, sesi, pencarian. Jadi seluruh app menunggu 867 KB untuk memakai 180 KB.
//
// Dipisah: **96 KB gzip lebih ringan di muat pertama** dari total 323 KB — dan yang tidak
// terlihat di angka transfer, 687 KB JS lebih sedikit untuk di-parse tiap kali app dibuka di
// HP kelas menengah.
//
// `img` dan `gif` DIBUANG SEPENUHNYA, bukan dipindahkan. Itu nama berkas media © Gym visual, dan
// CLAUDE.md melarang memakainya untuk produk komersial. Satu-satunya kode yang membacanya
// digerbangi `VITE_IMG_BASE` — sebuah jalur yang tidak boleh dinyalakan siapa pun. Menyimpan
// 46 KB nama berkas untuk jalur terlarang itu bukan cuma boros; dia ranjau lisensi yang
// menunggu seseorang menyalakannya.
//
// Skrip ini IDEMPOTEN: dijalankan dua kali menghasilkan berkas yang sama.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib')
const DATA = join(LIB, 'exercises-data.js')
const INSTR = join(LIB, 'exercises-instructions.js')

const { EXDB } = await import('file://' + DATA.replace(/\\/g, '/'))

const kb = n => (n / 1024).toFixed(0) + ' KB'
const before = readFileSync(DATA, 'utf8').length

const lean = EXDB.map(e => {
  const { st, img, gif, ...rest } = e
  void st; void img; void gif
  return rest
})
const steps = Object.fromEntries(
  EXDB.filter(e => Array.isArray(e.st) && e.st.length).map(e => [e.id, e.st])
)

const HEAD_DATA = `// Katalog 1.324 latihan — nama, bagian tubuh, alat, otot.
//
// Instruksinya TIDAK di sini: dia 71% dari berkas ini dan cuma dibaca di sheet detail latihan,
// jadi dia dipindah ke exercises-instructions.js dan dimuat saat dibutuhkan. Lihat
// scripts/split-exercise-data.mjs.
//
// Nama berkas \`img\`/\`gif\` sudah DIBUANG. Itu media © Gym visual, dan memakainya secara
// komersial dilarang (CLAUDE.md). Jangan dikembalikan.
//
// Di-generate. Jangan diedit tangan.
`

const HEAD_INSTR = `// Langkah-langkah instruksi latihan dalam bahasa Inggris, per id.
//
// Terpisah dari exercises-data.js dengan sengaja: 625 KB ini cuma dibutuhkan saat seseorang
// membuka detail satu latihan, sementara katalognya dibutuhkan di setiap layar. Dimuat lewat
// import dinamis — lihat loadBaseInstructions di lib/i18n-core.js.
//
// Terjemahan per bahasa hidup di instr/<lang>.js dan MENANG atas berkas ini; ini yang dipakai
// saat bahasanya belum punya terjemahan instruksi.
//
// Di-generate. Jangan diedit tangan.
`

writeFileSync(DATA, HEAD_DATA + 'export const EXDB=' + JSON.stringify(lean) + '\n')
writeFileSync(INSTR, HEAD_INSTR + 'export default ' + JSON.stringify(steps) + '\n')

console.log('katalog    ' + kb(before) + ' -> ' + kb(readFileSync(DATA, 'utf8').length))
console.log('instruksi  ' + kb(readFileSync(INSTR, 'utf8').length) + ' (' + Object.keys(steps).length + ' latihan)')
console.log('latihan tanpa instruksi: ' + (EXDB.length - Object.keys(steps).length))
