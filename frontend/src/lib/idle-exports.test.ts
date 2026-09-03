import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * EKSPOR `lib/` YANG TIDAK PERNAH DIPANGGIL — dan kenapa daftarnya harus eksplisit.
 *
 * Repo ini sudah dua kali mengirim fungsi yang dibangun, dites, lalu tidak pernah disambungkan:
 *
 *   · `trainingWindows` — jendela latihan hari puasa, bertes sejak mode Ramadan dipasang dan
 *     TIDAK PERNAH DIPANGGIL sampai 2026-08-28.
 *   · `isRamadanByHisab` — docstring-nya menyatakan "dipakai kartu Home untuk memberi konteks",
 *     dan pemanggilnya NOL sampai 2026-09-02.
 *
 * Yang mahal bukan kode matinya. Yang mahal adalah **fungsi yang dokumentasinya menjanjikan
 * pemakaian yang tidak pernah ada**: dia lolos review justru karena ada tesnya, dan setiap sesi
 * berikutnya membacanya sebagai fitur yang sudah jalan.
 *
 * Jadi daftar di bawah ini bukan pengecualian teknis, dia KEPUTUSAN. Pola yang sama dengan
 * `ID_KEEPS_ENGLISH` di `scripts/check-locales.mjs`: yang menganggur harus SAMA DENGAN daftar
 * ini, dan pemeriksaannya dua arah — entri yang ternyata sudah dipakai berarti daftarnya basi.
 *
 * Kalau kamu menambahkan ekspor baru yang belum dipanggil, pilih satu:
 *   1. sambungkan (itu yang benar untuk fitur yang setengah jalan), atau
 *   2. daftarkan di sini beserta alasan kenapa dia layak tetap ada.
 */

const SRC = new URL('../', import.meta.url)
const LIB = new URL('./lib/', SRC)

/**
 * MENGANGGUR DENGAN SENGAJA. Kunci = nama ekspor, nilai = kenapa dia tetap ada.
 *
 * Yang TIDAK boleh masuk sini: konstanta yang cuma dipakai modulnya sendiri tapi diekspor untuk
 * tes. Itu bukan menganggur — pemakainya tesnya, dan itu sah. Pemindai di bawah cuma melihat
 * FUNGSI, karena konstanta yang diekspor untuk dipaku tes adalah pola yang benar di repo ini.
 */
const MENGANGGUR: Record<string, string> = {
  // Pemakainya `notificationAllowed` sendiri sudah dijelaskan panjang di CLAUDE.md: app ini
  // tidak punya notifikasi hydration maupun meal, jadi tidak ada yang memanggilnya. Dibiarkan
  // hidup karena bahayanya nyata — pengingat "minum air" jam 2 siang di bulan Ramadan — dan
  // siapa pun yang menambahkan notifikasi jenis itu WAJIB melewatinya.
  notificationAllowed: 'penjaga jam puasa untuk notifikasi hydration/meal yang belum ada',
  // Beban otot dari sesi yang SEDANG berjalan. Pasangannya `loadOfRoutine` dipakai di
  // RoutineEdit ("Yang dikerjakan sesi ini"); versi in-progress-nya belum punya tempat di layar
  // latihan. Dibiarkan karena dia murni, bertes, dan pasangannya sudah membuktikan bentuknya
  // benar — bukan karena "nanti pasti dipakai".
  loadOfActive: 'padanan loadOfRoutine untuk sesi berjalan; belum ada tempatnya di layar',
  // Saringan latihan menurut KELOMPOK OTOT. Library menyaring menurut bagian tubuh dan alat,
  // bukan kelompok otot, jadi belum ada yang memanggilnya.
  matchesMuscleGroups: 'saringan per kelompok otot; Library menyaring per bagian tubuh dan alat',
  // Sisa waktu sampai berbuka. Kartu salat sudah menampilkan jam Magrib dan hitungan mundur ke
  // salat berikutnya, jadi angka ini belum punya tempat yang tidak mengulang keduanya.
  msUntilIftar: 'hitungan mundur berbuka; kartu salat sudah menampilkan Magrib dan mundurnya',
  // TABRAKAN SALAT SEBELUM SESI DIMULAI, dan docstring-nya menjanjikan pemakaian yang belum ada:
  // "Dipakai saat merencanakan". Menyambungkannya butuh perkiraan DURASI sesi, dan repo ini
  // belum punya satu pun — `fmtDur` cuma memformat yang sudah lewat. Jadi ini bukan "lupa
  // dipanggil", ini fitur yang menunggu satu keputusan: dari mana angka durasinya datang
  // (median riwayat rutin itu? jumlah set x waktu istirahat?). Dibiarkan sampai itu diputuskan.
  prayerClash: 'peringatan tabrakan salat sebelum sesi; butuh perkiraan durasi yang belum ada',
  // Versi TANPA saringan otot dari baris kekuatan. Yang dipakai Statistik
  // `strengthExerciseRowsForMuscle`, karena daftarnya selalu muncul setelah satu otot diketuk.
  strengthExerciseRows: 'baris kekuatan tanpa saringan otot; Statistik selalu menyaring per otot',
  // `modeOf(cfg) === 'time'` satu baris, dan pemanggil yang butuh sudah menulis `modeOf`
  // langsung karena mereka juga butuh mode lainnya di baris yang sama.
  isTimed: 'pembungkus satu baris atas modeOf; pemanggil butuh modeOf utuh, bukan boolean',
  // Penggabung className Tailwind untuk `components/ui/button.tsx` — satu-satunya komponen
  // shadcn di repo, dan komponen itu sendiri belum dipakai layar mana pun. Keduanya bibit
  // Fase 3 (migrasi UI per layar), bukan sisa scaffold: `styles/tailwind.css` menjelaskannya.
  cn: 'penggabung className untuk bibit shadcn Fase 3; komponennya sendiri belum dipakai',
}

/** Berkas `lib/` yang dipindai: sumber saja, bukan tes maupun data yang di-generate. */
const BERKAS = readdirSync(fileURLToPath(LIB))
  .filter(f => /\.(ts|js)$/.test(f))
  .filter(f => !/\.test\.|\.d\.ts$/.test(f))
  .filter(f => !/^(exercises-data|exercises-instructions|food-usda|food-retail|body-paths)\./.test(f))

/** Seluruh sumber yang bisa memanggil sesuatu: lib + komponen + view + store + sheets. */
function semuaSumber(): { nama: string; isi: string }[] {
  const out: { nama: string; isi: string }[] = []
  const jelajah = (dir: URL, prefix: string) => {
    for (const e of readdirSync(fileURLToPath(dir), { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (['locales', 'instr', 'exercise-names'].includes(e.name)) continue
        jelajah(new URL(e.name + '/', dir), prefix + e.name + '/')
        continue
      }
      if (!/\.(ts|js|jsx)$/.test(e.name)) continue
      if (/\.test\./.test(e.name)) continue
      out.push({ nama: prefix + e.name, isi: readFileSync(fileURLToPath(new URL(e.name, dir)), 'utf8') })
    }
  }
  jelajah(SRC, '')
  return out
}

const SUMBER = semuaSumber()

describe('ekspor lib/ yang menganggur adalah keputusan, bukan sisa', () => {
  it('ada berkas yang dipindai — penjaga yang tidak memindai apa pun bukan penjaga', () => {
    expect(BERKAS.length).toBeGreaterThan(20)
    expect(SUMBER.length).toBeGreaterThan(40)
  })

  /** Nama FUNGSI yang diekspor dari satu berkas lib. */
  const fungsiDiekspor = (isi: string): string[] => {
    const out: string[] = []
    // `export function x`, `export async function x`, dan `export const x = (...) =>`
    for (const m of isi.matchAll(/^export\s+(?:async\s+)?function\s+([a-zA-Z_$][\w$]*)/gm)) {
      out.push(m[1] as string)
    }
    for (const m of isi.matchAll(/^export\s+const\s+([a-zA-Z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?\(/gm)) {
      out.push(m[1] as string)
    }
    return out
  }

  it('nol fungsi menganggur di luar daftar', () => {
    const menganggur: string[] = []
    for (const f of BERKAS) {
      const isi = readFileSync(fileURLToPath(new URL(f, LIB)), 'utf8')
      for (const nama of fungsiDiekspor(isi)) {
        // Ekspor bergaris bawah di depan adalah PINTU TES yang disengaja
        // (`_resetCatalogueCache`), bukan kode mati: pemakainya tesnya, dan itu sah. Disaring
        // sebagai konvensi, bukan didaftarkan satu-satu, supaya berlaku untuk yang berikutnya.
        if (nama.startsWith('_')) continue
        if (Object.prototype.hasOwnProperty.call(MENGANGGUR, nama)) continue
        const re = new RegExp('\\b' + nama + '\\b')
        // Pemakaian di berkas LAIN, atau pemakaian kedua di berkas yang sama (bukan cuma
        // deklarasinya). Alias `export const x = y` juga dihitung sebagai pemakaian.
        const dipakai = SUMBER.some(s => {
          if (s.nama === 'lib/' + f) {
            return (isi.match(new RegExp('\\b' + nama + '\\b', 'g')) || []).length > 1
          }
          return re.test(s.isi)
        })
        if (!dipakai) menganggur.push('lib/' + f + ' -> ' + nama)
      }
    }
    expect(
      menganggur,
      'Fungsi ini diekspor tapi tidak pernah dipanggil dari sumber mana pun. Pilih satu: '
      + 'sambungkan, atau daftarkan di MENGANGGUR beserta alasannya. Yang paling mahal bukan '
      + 'kode matinya — tapi docstring yang menjanjikan pemakaian yang tidak ada.\n'
      + menganggur.join('\n')
    ).toEqual([])
  })

  it('setiap entri daftar MEMANG masih menganggur — pemeriksaannya dua arah', () => {
    // Entri yang ternyata sudah dipakai berarti daftarnya basi, dan daftar basi berhenti
    // menjaga apa pun. Ini yang menangkap `isRamadanByHisab` kalau seseorang mencabut
    // pemanggilannya lagi tanpa mengembalikan entrinya.
    const salah: string[] = []
    for (const nama of Object.keys(MENGANGGUR)) {
      const re = new RegExp('\\b' + nama + '\\b')
      const pemakai = SUMBER.filter(s => !/^lib\//.test(s.nama) && re.test(s.isi))
      if (pemakai.length) salah.push(nama + ' dipakai di ' + pemakai.map(p => p.nama).join(', '))
    }
    expect(salah, 'daftar MENGANGGUR sudah basi:\n' + salah.join('\n')).toEqual([])
  })

  it('setiap alasan benar-benar menjelaskan sesuatu', () => {
    for (const [nama, alasan] of Object.entries(MENGANGGUR)) {
      expect(alasan.length, nama + ': alasan terlalu pendek untuk jadi keputusan')
        .toBeGreaterThan(25)
    }
  })

  it('isRamadanByHisab TIDAK lagi menganggur — docstring-nya sekarang benar', () => {
    // Dia dulu di daftar ini secara efektif: docstring-nya menyatakan "dipakai kartu Home",
    // dan pemanggilnya nol. Sekarang kartu salat memanggilnya. Kalau baris itu dicabut,
    // penjaga pertama di atas yang menangkapnya.
    const kartu = SUMBER.find(s => s.nama === 'components/PrayerCard.jsx')
    expect(kartu, 'PrayerCard.jsx harus ada').toBeTruthy()
    expect((kartu as { isi: string }).isi).toContain('isRamadanByHisab')
  })
})
