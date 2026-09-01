import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * TAUTAN SOURCE YANG DITAWARKAN APP HARUS MENUNJUK REPO KITA.
 *
 * AGPL-3.0 menuntut penawaran **Corresponding Source dari versi yang dimodifikasi**. Menunjuk
 * openGym yang tidak dimodifikasi tidak memenuhinya — pengguna yang mengikuti tautan itu tidak
 * mendapat sumber dari app yang sedang dia pakai.
 *
 * Ini bukan hipotesis. Konstanta `REPO` di `lib/demo.js` tertinggal menunjuk
 * `gitlab.com/DuarteSantos8/opengym` setelah fork, dan dipakai sebagai tautan berlabel
 * "Source code" di Pengaturan dan di layar masuk. Dia lolos berbulan-bulan karena kedua
 * pemakaiannya ada di cabang `DEMO` dan build demo tidak pernah dikirim — jadi bukan pelanggaran
 * yang hidup, tapi jebakan yang menunggu orang pertama yang menjalankan `VITE_DEMO=1`.
 *
 * ATRIBUSI KE UPSTREAM TETAP WAJIB, dan tes ini tidak melarangnya: tempatnya `NOTICE.md` dan
 * baris "fork dari" di Pengaturan. Yang dilarang cuma satu hal — tautan yang MENGAKU sebagai
 * source code app ini menunjuk repo orang lain.
 */

const KITA = 'github.com/maulanaarifpratama-dotcom/halalprogym'
const UPSTREAM = 'gitlab.com/DuarteSantos8/opengym'

const SRC = new URL('../', import.meta.url)

const kumpulkan = (dir: URL): string[] => {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...kumpulkan(new URL(e.name + '/', dir)))
    else if (/\.(jsx?|tsx?)$/.test(e.name) && !/\.test\./.test(e.name)) {
      out.push(fileURLToPath(new URL(e.name, dir)))
    }
  }
  return out
}

const BERKAS = kumpulkan(SRC)
const nama = (p: string): string => p.split(/[\\/]/).slice(-2).join('/')

describe('tautan source AGPL menunjuk repo kita', () => {
  it('konstanta REPO menunjuk repo kita, bukan upstream', () => {
    const s = readFileSync(new URL('./demo.js', import.meta.url), 'utf8')
    const m = s.match(/export const REPO = '([^']+)'/)
    expect(m, 'konstanta REPO tidak ketemu di lib/demo.js').toBeTruthy()
    const url = (m as RegExpMatchArray)[1] as string
    expect(url, 'REPO menunjuk repo yang salah — AGPL menuntut source versi yang DIMODIFIKASI')
      .toContain(KITA)
  })

  it('layar Pengaturan menawarkan source kita', () => {
    // Ini kewajiban AGPL yang sudah tercatat di CLAUDE.md sebagai "jangan dihapus".
    const s = readFileSync(new URL('../views/Settings.jsx', import.meta.url), 'utf8')
    expect(s).toContain(KITA)
  })

  it('tidak ada URL upstream yang dipakai sebagai tautan source di UI', () => {
    /**
     * Dicari di SELURUH sumber, bukan cuma di dua berkas yang saya ingat — pola yang disalin
     * tidak pernah diperbaiki dengan memperbaiki satu pemakaian.
     *
     * Baris yang menyebut upstream sebagai ATRIBUSI ("fork dari …") sengaja diizinkan: yang
     * dilarang cuma tautan yang mengaku sebagai source code app ini.
     */
    const salah: string[] = []
    for (const f of BERKAS) {
      const s = readFileSync(f, 'utf8')
      s.split('\n').forEach((l, i) => {
        if (!l.includes(UPSTREAM)) return
        // Atribusi fork boleh. Yang tidak boleh: dilabeli source/AGPL.
        const atribusi = /fork|opengym|upstream|NOTICE/i.test(l)
        const mengakuSource = /source code|Source code|AGPL/i.test(l)
        if (mengakuSource || !atribusi) salah.push(nama(f) + ':' + (i + 1))
      })
    }
    expect(
      salah,
      'URL upstream dipakai sebagai tautan source. AGPL menuntut Corresponding Source dari '
      + 'versi yang DIMODIFIKASI; pengguna yang mengikuti tautan itu tidak mendapat sumber app '
      + 'yang sedang dia pakai. Atribusi ke openGym tetap wajib — tempatnya NOTICE.md dan baris '
      + '"fork dari" di Pengaturan.'
    ).toEqual([])
  })

  it('atribusi ke upstream TETAP ada — tesnya tidak boleh menghapusnya', () => {
    // Penjaga arah sebaliknya: memperbaiki tautan source tidak boleh jadi alasan mencabut
    // atribusi fork, yang juga kewajiban lisensi.
    const notice = readFileSync(new URL('../../../NOTICE.md', import.meta.url), 'utf8')
    expect(notice).toContain('opengym')
    const settings = readFileSync(new URL('../views/Settings.jsx', import.meta.url), 'utf8')
    expect(settings.toLowerCase()).toContain('opengym')
  })
})
