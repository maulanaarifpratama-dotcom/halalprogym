import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fmtDur, exCount, setCount } from './format.js'
import { _setLangState } from './i18n-core.js'
import id from '../locales/id.js'

// Idiom yang sudah dipakai tes lain di sini: `setLang` versi Vite memuat pack lewat
// import.meta.glob, jadi tes memasang state-nya langsung.
const bahasa = (l: string, dict: Record<string, string> = {}) => _setLangState(l, dict, null, null)

/**
 * STRING BERHITUNG: BENTUK TUNGGAL, DAN SATUAN YANG IKUT DITERJEMAHKAN.
 *
 * Dua cacat yang ditemukan dengan MEMAKAI app-nya, bukan dengan membaca kode — satu sesi
 * latihan sungguhan dari nol, lalu layarnya dibaca ulang dalam Bahasa Indonesia.
 *
 * =================================================================================
 * 1. "1 workouts"
 *
 * `t()` melakukan `dict[s] || s`, jadi string Inggrisnya ADALAH kuncinya — dan plural
 * Inggris tidak pernah otomatis. `lib/format.ts` sudah menyatakannya di komentar
 * `exCount` sejak lama ("Plural forms are not automatic when the English string is the
 * key"), dan tiga tempat sudah memakai idiomnya. Tempat keempat sampai kedelapan tidak:
 * Riwayat membaca "1 workouts", Statistik "1 sets", Pengaturan "1 equipment types".
 *
 * Kesadarannya ada, penerapannya tidak menyeluruh — bentuk yang persis sama dengan
 * `--acc-ink` dan `--label-3`, dan itu sebabnya penjaganya memindai KELASNYA.
 *
 * Yang mengoper PECAHAN sengaja dikecualikan: "1/17 sets" benar, dan "1/17 set" salah.
 *
 * =================================================================================
 * 2. Durasi selalu Inggris, di ketiga belas bahasa
 *
 * `fmtDur` menulis satuannya sendiri (`' min'`, `'h '`, `'m'`), jadi Beranda menulis
 * "Zuhur 20 mnt" sementara Riwayat menulis "2 min" — satuan yang sama, dua singkatan,
 * satu layar apart. Tooltip heatmap juga.
 *
 * Ini titik buta yang SUDAH DIKETAHUI: keempat checker bekerja dari `t()`, jadi teks yang
 * tidak pernah mengaku sebagai teks tidak pernah terlihat. `no-untranslated-id.test.ts`
 * memindai `components/`, `views/`, `store/` — dan sengaja BUKAN `lib/`. Jadi celahnya
 * ada di direktori yang paling tidak diawasi untuk urusan teks UI, yang juga direktori
 * yang paling banyak dipanggil.
 */

const SRC = new URL('../', import.meta.url)

const kumpulkan = (dir: URL, pola: RegExp): string[] => {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name === 'locales' || e.name === 'instr' || e.name === 'exercise-names') continue
      out.push(...kumpulkan(new URL(e.name + '/', dir), pola))
    } else if (pola.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(fileURLToPath(new URL(e.name, dir)))
    }
  }
  return out
}

const BERKAS = kumpulkan(SRC, /\.(jsx?|ts)$/)
const rel = (p: string) => p.replace(/\\/g, '/').replace(/^.*\/src\//, 'src/')

/** Kunci plural yang dipanggil dengan hitungan, dan bentuk tunggalnya. */
const PASANGAN: [string, string][] = [
  ['{0} sets', '{0} set'],
  ['{0} workouts', '{0} workout'],
  ['{0} exercises', '{0} exercise'],
  ['{0} equipment types', '{0} equipment type'],
  ['{0} sets · {1} work', '{0} set · {1} work'],
]

describe('string berhitung', () => {
  it('setiap pemanggilan kunci plural punya cabang tunggal — atau mengoper pecahan', () => {
    const pelanggaran: string[] = []
    for (const p of BERKAS) {
      const src = readFileSync(p, 'utf8')
      src.split('\n').forEach((baris0, i) => {
        // Komentar dibuang — dan sekali lagi karena penjaganya menuduh dirinya sendiri:
        // dokumentasi di repo ini padat, dan komentar `setCount` di `format.ts` MENGUTIP
        // pemanggilan yang salah untuk menjelaskan kenapa helper-nya ada.
        const baris = /^\s*(\/\/|\*|\/\*)/.test(baris0) ? '' : baris0
        for (const [plural, tunggal] of PASANGAN) {
          const panggil = "t('" + plural + "'"
          if (!baris.includes(panggil)) continue
          // Sah kalau bentuk tunggalnya disebut di baris yang sama (idiom `n === 1 ? … : …`),
          // atau kalau yang dioper jelas-jelas sebuah pecahan.
          if (baris.includes("'" + tunggal + "'")) continue
          if (/\+ *'\/' *\+|\+ *'\/'|'\/' *\+/.test(baris)) continue
          pelanggaran.push(rel(p) + ':' + (i + 1) + '  ' + baris.trim().slice(0, 100))
        }
      })
    }
    expect(pelanggaran, 'hitungan 1 akan membaca plural Inggris:\n' + pelanggaran.join('\n'))
      .toEqual([])
  })

  it('setiap pack yang menerjemahkan pluralnya juga menerjemahkan tunggalnya', async () => {
    const nama = readdirSync(fileURLToPath(new URL('../locales/', import.meta.url)))
      .filter(f => /\.js$/.test(f))
    expect(nama.length).toBe(13)
    const kurang: string[] = []
    for (const f of nama) {
      // pt-BR cuma lapisan override di atas pt: apa yang tidak dia sebut, dia warisi.
      if (f === 'pt-BR.js' || f === 'id.js') continue
      const mod = await import(/* @vite-ignore */ '../locales/' + f)
      const dict = mod.default as Record<string, string>
      for (const [plural, tunggal] of PASANGAN) {
        if (dict[plural] && !dict[tunggal]) kurang.push(f + ' :: ' + tunggal)
      }
    }
    expect(kurang, 'pack menerjemahkan plural tapi tidak tunggalnya:\n' + kurang.join('\n'))
      .toEqual([])
  })

  /**
   * `id.js` dikecualikan di atas karena dua bentuk tunggal ini memang TIDAK diterjemahkan,
   * dan itu keputusan yang harus tetap terlihat.
   *
   * Orang Indonesia membaca barisnya "1 set" dan labelnya "Set 1" — persis kuncinya. Pemetaan
   * identik dilarang di pack ini karena bikin persentase cakupan bohong, jadi jalurnya adalah
   * `ID_KEEPS_ENGLISH` di `scripts/check-locales.mjs`. Tes ini memaku keduanya ada di sana:
   * tanpa itu, "id tidak punya kunci ini" tidak bisa dibedakan dari kelalaian.
   */
  it('dua tunggal yang sengaja Inggris di id.js terdaftar sebagai keputusan', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../scripts/check-locales.mjs', import.meta.url)), 'utf8')
    const blok = src.slice(src.indexOf('const ID_KEEPS_ENGLISH'), src.indexOf('])', src.indexOf('const ID_KEEPS_ENGLISH')))
    expect(blok).toContain("'{0} set',")
    expect(blok).toContain("'Set {0}',")
    // Dan yang BUKAN keputusan itu tidak boleh ikut menumpang: '{0} equipment type' punya
    // terjemahan Indonesia yang sebenarnya ('{0} jenis alat'), jadi dia harus ada di pack.
    expect(blok).not.toContain("'{0} equipment type',")
  })

  it('hitungan 1 memakai nomina tunggal dalam bahasa Inggris', () => {
    bahasa('en')
    expect(setCount(1)).toBe('1 set')
    expect(setCount(2)).toBe('2 sets')
    expect(exCount(1)).toBe('1 exercise')
    expect(exCount(3)).toBe('3 exercises')
  })
})

describe('satuan durasi', () => {
  it('fmtDur lewat t(), jadi ikut bahasa app', () => {
    bahasa('en')
    expect(fmtDur(120000)).toBe('2 min')
    expect(fmtDur(3720000)).toBe('1 hr 2 min')
    bahasa('id', id)
    // Kunci yang SAMA dengan hitungan mundur kartu salat — itu inti perbaikannya: dua tempat
    // yang menyebut durasi ke orang yang sama tidak boleh memakai dua singkatan.
    expect(fmtDur(120000)).toBe('2 mnt')
    expect(fmtDur(3720000)).toBe('1 jam 2 mnt')
    bahasa('en')
  })

  it('tidak ada satuan waktu yang ditulis keras di luar t()', () => {
    const pelanggaran: string[] = []
    for (const p of BERKAS) {
      if (/lib[\\/]i18n/.test(p)) continue
      const src = readFileSync(p, 'utf8')
      src.split('\n').forEach((baris, i) => {
        const bersih = baris.replace(/^\s*(\/\/|\*).*$/, '')
        // `${x} min`, `+ ' min'` — bentuk yang melewati t() sepenuhnya.
        //
        // Interpolasi yang isinya SENDIRI sebuah `t(` dikecualikan, dan itu bukan kelonggaran:
        // `${t('{0} min', a.min)}` cocok dengan pola naif karena `[^}]+` berhenti di kurung
        // tutup pertama, lalu " min'" dari dalam kuncinya yang terbaca. Jadi pemanggilan yang
        // BENAR menuduh dirinya sendiri — versi pertama tes ini melaporkan Heatmap.jsx yang
        // baru saja diperbaiki. Lookahead lebih baik daripada mengurai literal string, yang
        // harus melacak escape dan justru rapuh.
        if (/\$\{(?:(?!\bt\()[^}])+\}\s*(min|mnt|hr|jam)\b/.test(bersih)
          || /\+\s*'\s*(min|mnt|hr)\b/.test(bersih)) {
          pelanggaran.push(rel(p) + ':' + (i + 1) + '  ' + bersih.trim().slice(0, 100))
        }
      })
    }
    expect(pelanggaran, 'satuan waktu tidak diterjemahkan:\n' + pelanggaran.join('\n'))
      .toEqual([])
  })
})

describe('checkbox set punya nama', () => {
  /**
   * Diukur di pohon aksesibilitas hidup sebelum diperbaiki: layar latihan menyebut
   * "checkbox" empat kali berturut-turut, tanpa satu pun nama. Tetangganya di baris yang
   * sama — 'Start set' dan 'Remove set' — sudah ber-aria-label sejak awal, jadi ini
   * kelalaian satu komponen, bukan kebijakan.
   *
   * Orang yang memakai pembaca layar justru orang yang TIDAK bisa melihat nomor set di
   * kolom kiri, jadi "checkbox" telanjang menghilangkan satu-satunya penanda baris.
   */
  it('setiap <Check> dikirimi nama', () => {
    const pelanggaran: string[] = []
    for (const p of BERKAS) {
      const src = readFileSync(p, 'utf8')
      // ambil setiap tag <Check ... /> termasuk yang menyeberang baris
      for (const m of src.matchAll(/<Check\b[\s\S]{0,400}?\/>/g)) {
        if (!/\blabel=|\baria-label(?:ledby)?=/.test(m[0])) {
          pelanggaran.push(rel(p) + '  ' + m[0].replace(/\s+/g, ' ').slice(0, 120))
        }
      }
    }
    expect(pelanggaran, '<Check> tanpa nama:\n' + pelanggaran.join('\n')).toEqual([])
  })

  it('Check meneruskan label itu ke aria-label', () => {
    const src = readFileSync(fileURLToPath(new URL('../components/ui.jsx', import.meta.url)), 'utf8')
    const blok = src.slice(src.indexOf('export function Check'))
    expect(blok.slice(0, 600)).toContain('aria-label={label')
  })
})
