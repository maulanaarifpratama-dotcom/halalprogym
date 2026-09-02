import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Kontras aksen SEBAGAI TEKS di tema terang.
 *
 * BUG YANG MELAHIRKAN BERKAS INI, dan kenapa dia bertahan lama
 *
 * Lime `#94e900` di atas putih memberi **1.5:1**. WCAG AA menuntut 4.5:1 untuk teks biasa dan
 * 3:1 untuk teks besar. Jadi di tema terang, label tombol ("Log", "New"), label tab yang aktif,
 * angka kalori hari ini, dan delta berat badan semuanya praktis tidak terbaca.
 *
 * Kesadarannya sebenarnya SUDAH ADA di `index.css`: catatan di blok tema terang menulis "di atas
 * paper, lime .12 nyaris hilang — garis terang pakai tinta, bukan aksen". Tapi itu cuma
 * diterapkan ke GARIS. Teks tidak ikut, dan tidak ada yang mengukurnya.
 *
 * Ini kelas kegagalan yang sama dengan "full body" yang tampil Inggris di 13 bahasa: cuma
 * terlihat kalau kamu benar-benar memakai mode yang bukan default. Pengembangnya memakai tema
 * gelap, dan di tema gelap lime di atas #101c13 sudah 11:1.
 *
 * KENAPA TES ANGKA, BUKAN TES RENDER
 *
 * Kontras itu aritmetika atas dua warna, dan aritmetika bisa dipaku persis. Tes render akan
 * menghitung warna yang sama lewat jalan yang jauh lebih panjang, dan di lingkungan tes dia juga
 * tidak bisa dipercaya: pengukuran pertama di browser sempat melaporkan 1.26:1 untuk teks yang
 * sebenarnya baik-baik saja, karena transisi CSS `background` MACET di currentTime 0 selama pane
 * tidak meng-komposit frame. Angka yang dibaca dari token tidak punya masalah itu.
 */

const CSS = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

/** Luminansi relatif WCAG dari #rrggbb. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const v = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number): number => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * f(v[0] as number) + 0.7152 * f(v[1] as number) + 0.0722 * f(v[2] as number)
}

const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Membaca satu nilai token dari sebuah blok selektor di index.css. */
function token(selector: string, name: string): string {
  const i = CSS.indexOf(selector)
  expect(i, 'selektor ' + selector + ' harus ada di index.css').toBeGreaterThan(-1)
  const blok = CSS.slice(i, CSS.indexOf('}', i))
  const m = blok.match(new RegExp('--' + name + '\\s*:\\s*([^;\\n]+)'))
  expect(m, 'token --' + name + ' harus ada di ' + selector).toBeTruthy()
  return (m as RegExpMatchArray)[1]!.trim()
}

/** Permukaan tema terang, dari token yang sama yang dipakai app. */
const PAPER = token(':root[data-theme="light"]', 'surface')       // #ffffff
const PAPER_2 = token(':root[data-theme="light"]', 'surface-2')   // #e8efe1

/**
 * Tinta aksen per aksen, dibaca dari `index.css`.
 *
 * Nilainya ditulis di sini sebagai HARAPAN, bukan diambil dari CSS: kalau diambil dari CSS,
 * tesnya akan setuju dengan apa pun yang ada di sana dan tidak menjaga apa pun. Yang diambil
 * dari CSS adalah PERMUKAANNYA, karena itu yang tidak boleh menyimpang dari app.
 *
 * NILAI-NILAI INI DITURUNKAN 10-15% pada 2026-09-02, dan alasannya adalah lapisan kedua dari
 * bug yang melahirkan berkas ini. Versi sebelumnya diukur ke PUTIH dan lolos di sana — tapi
 * setiap permukaan `tinted` di app ini adalah wash 16-18% dari warna itu sendiri di atas paper
 * atau `--surface-2`, dan keduanya lebih gelap dari putih. Di sana KETUJUHNYA gagal:
 *
 *     lime 4,03 · sky 3,94 · oranye 4,05 · violet 4,26 · pink 3,66 · merah 3,74 · teal 4,05
 *
 * Jadi kesimpulan lama "cuma lime dan oranye yang bermasalah" adalah kesimpulan dari mengukur
 * SATU permukaan. Sekarang kasus terburuk yang jadi target, dan yang lolos di atas tint otomatis
 * lolos di paper dan di putih.
 */
const TINTA_TERANG: Record<string, string> = {
  lime: '#00743a',    // --deep #008140 cuma 4,03 di atas tint lime
  sky: '#0055c6',
  orange: '#934f00',
  violet: '#7f3f9f',
  pink: '#b7002e',
  red: '#b90012',
  teal: '#006694',
}

/** Tinta aksen tema GELAP. Di sini tintanya NAIK ke arah putih — arah yang berlawanan. */
const TINTA_GELAP: Record<string, string> = {
  lime: '#94e900',    // = var(--acc); 6,75 di atas tint lime, cukup apa adanya
  sky: '#4aa1ff',
  orange: '#ff9500',  // = var(--acc); 5,19
  violet: '#c581e7',
  pink: '#ff6481',
  red: '#ff6a62',
  teal: '#48bcd0',
}

/** Aksen mentah, untuk menghitung permukaan bertint-nya sendiri. */
const AKSEN_MENTAH: Record<string, string> = {
  lime: '#94e900', sky: '#0070eb', orange: '#ff9500', violet: '#a34cce',
  pink: '#de274a', red: '#db3329', teal: '#30b0c7',
}

/** `color-mix(in srgb, a p%, b)` untuk dua hex opak. */
function campur(a: string, b: string, p: number): string {
  const [x, y] = [a, b].map(h => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16)))
  const out = [0, 1, 2].map(i => Math.round((x as number[])[i]! * p + (y as number[])[i]! * (1 - p)))
  return '#' + out.map(c => c.toString(16).padStart(2, '0')).join('')
}

describe('aksen sebagai teks lolos WCAG AA di kedua tema', () => {
  /**
   * PERMUKAAN TERBURUK, dan kenapa dia yang jadi target.
   *
   * Tes ini dulu menuntut 4,5 di atas putih dan cuma 3 di atas `--surface-2`, dengan alasan
   * "teks kecil di atas permukaan ini jarang berwarna aksen". Itu tidak benar: `.btn.tinted`,
   * `.tag`, `.prayer-cell.next` dan `.pr` semuanya menaruh teks 12-15px berwarna aksen di atas
   * wash aksen — dan wash itu duduk di atas `--surface-2`, permukaan paling gelap dari ketiganya.
   * Jadi kombinasi yang paling sering dipakai justru yang paling longgar dijaga.
   */
  const tintTerang = (aksen: string) => campur(AKSEN_MENTAH[aksen]!, PAPER_2, 0.16)
  const tintGelap = (aksen: string) =>
    campur(AKSEN_MENTAH[aksen]!, token(':root {', 'surface-2'), 0.16)

  it('tema terang: setiap aksen ≥ 4.5:1 di atas WASH AKSEN 16% — permukaan terburuk', () => {
    for (const [nama, tinta] of Object.entries(TINTA_TERANG)) {
      const bg = tintTerang(nama)
      const r = contrast(tinta, bg)
      expect(r, nama + ' (' + tinta + ') di atas tint ' + bg + ' cuma ' + r.toFixed(2))
        .toBeGreaterThanOrEqual(4.5)
    }
  })

  it('tema terang: dan otomatis lolos di atas kartu putih', () => {
    for (const [nama, tinta] of Object.entries(TINTA_TERANG)) {
      expect(contrast(tinta, PAPER), nama + ' di atas ' + PAPER).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('tema GELAP: setiap aksen ≥ 4.5:1 di atas wash aksen 16%', () => {
    // Lima dari tujuh gagal di sini sebelum 2026-09-02, dan tidak ada yang mengukurnya: klaim
    // di `index.css` berbunyi "lime di atas #101c13 sudah 11:1" — benar, tapi cuma untuk LIME
    // di permukaan POLOS. sky 3,17 · violet 3,14 · pink 3,68 · merah 3,73 · teal 4,47.
    for (const [nama, tinta] of Object.entries(TINTA_GELAP)) {
      const bg = tintGelap(nama)
      const r = contrast(tinta, bg)
      expect(r, nama + ' (' + tinta + ') di atas tint ' + bg + ' cuma ' + r.toFixed(2))
        .toBeGreaterThanOrEqual(4.5)
    }
  })

  it('lime MENTAH gagal — ini bug aslinya, dan angkanya dipaku supaya tidak dilupakan', () => {
    // Kalau suatu saat seseorang mengembalikan --acc-ink jadi var(--acc) di tema terang,
    // inilah yang dia dapatkan.
    expect(contrast('#94e900', '#ffffff')).toBeLessThan(1.6)
  })

  it('nilai LAMA memang gagal di permukaan bertint — supaya penurunan ini tidak dibalik', () => {
    // Tanpa ini, seseorang bisa mengembalikan #008140/#a35800 dan tesnya tetap terlihat masuk
    // akal, karena keduanya memang lolos di atas putih. Yang membedakan cuma permukaannya.
    expect(contrast('#008140', tintTerang('lime'))).toBeLessThan(4.5)
    expect(contrast('#a35800', tintTerang('orange'))).toBeLessThan(4.5)
    expect(contrast('#0060df', tintTerang('sky'))).toBeLessThan(4.5)
  })

  it('di tema GELAP lime memang sudah baik di permukaan polos', () => {
    const bgGelap = token(':root {', 'surface')
    expect(contrast('#94e900', bgGelap)).toBeGreaterThan(8)
  })
})

describe('token --acc-ink terpasang di kedua tema', () => {
  it('tema gelap memakai --acc apa adanya', () => {
    expect(token(':root {', 'acc-ink')).toBe('var(--acc)')
  })

  it('tema terang menurunkannya', () => {
    expect(token(':root[data-theme="light"]', 'acc-ink')).toBe('var(--acc-2)')
  })

  it('lime dan oranye punya penurunan sendiri, karena --acc-2 mereka tidak cukup', () => {
    expect(CSS).toContain('[data-accent="lime"]')
    expect(CSS).toMatch(/data-accent="lime"[\s\S]{0,120}--acc-ink/)
    expect(CSS).toMatch(/data-accent="orange"\]\s*\{\s*--acc-ink:\s*#934f00/)
  })

  it('NOL sisa `color:var(--acc)` di CSS — semuanya harus lewat --acc-ink', () => {
    // Penukaran mekanis selalu meninggalkan sisa. Ini yang memastikan tidak ada.
    const sisa = [...CSS.matchAll(/color:\s*var\(--acc\)/g)]
    expect(sisa.length, 'pakai var(--acc-ink) untuk warna teks').toBe(0)
  })

  it('kuning sebagai teks juga punya tintanya sendiri', () => {
    // #ffcc00 di atas putih 1.5:1 — persis masalah yang sama.
    expect(contrast('#ffcc00', '#ffffff')).toBeLessThan(1.6)
    const tinta = token(':root[data-theme="light"]', 'yellow-ink')
    expect(contrast(tinta, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect([...CSS.matchAll(/color:\s*var\(--yellow\)/g)].length).toBe(0)
  })
})


/**
 * TANGGA LABEL, dan kenapa dia butuh penjaganya sendiri.
 *
 * Berkas ini lahir untuk menjaga AKSEN sebagai teks (`--acc-ink`), dan itu menutup satu kelas
 * dengan rapi. Tapi kelasnya lebih luas dari aksen: `--label-3` gagal AA di KEDUA tema tanpa ada
 * yang pernah mengukurnya — **3,49:1** di tema gelap dan **2,65:1** di tema terang, hampir separuh
 * dari yang dituntut.
 *
 * Dia dipakai 24 kali di `index.css`, dan hampir semuanya teks: label kolom, kapsi, dan yang
 * paling sering ditatap orang, **`.field::placeholder`**. Jadi setiap kolom pencarian di app ini
 * punya placeholder yang tidak lolos, di tema yang paling terang.
 *
 * Bentuknya identik dengan cerita `--acc-ink` yang sudah tercatat: kesadaran ada di komentar,
 * pengukurannya tidak, dan yang menanggungnya orang yang memakai tema bukan-default.
 *
 * Dihitung dari token, bukan dari render — kontras itu aritmetika atas dua warna, dan pengukuran
 * lewat browser di lingkungan ini sudah terbukti tidak bisa dipercaya (transisi CSS macet di
 * `currentTime` 0 dan `getComputedStyle` mengembalikan warna LAMA).
 */
describe('tangga label lolos WCAG AA di kedua tema', () => {
  /** `rgba(r,g,b,a)` dikomposit di atas latar opak, lalu dikembalikan sebagai #rrggbb. */
  function flatten(rgba: string, bg: string): string {
    const m = rgba.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/)
    expect(m, 'nilai token harus rgba(): ' + rgba).toBeTruthy()
    const g = m as RegExpMatchArray
    const rgb: number[] = [1, 2, 3].map(i => Number(g[i]))
    const a = g[4] === undefined ? 1 : Number(g[4])
    const h = bg.replace('#', '')
    const bgv: number[] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
    const out: number[] = rgb.map((c, i) => Math.round(c * a + (bgv[i] as number) * (1 - a)))
    return '#' + out.map(c => c.toString(16).padStart(2, '0')).join('')
  }

  const TEMA = [
    { nama: 'gelap', sel: ':root', permukaan: ['bg', 'surface', 'surface-2'] },
    { nama: 'terang', sel: ':root[data-theme="light"]', permukaan: ['bg', 'surface', 'surface-2'] },
  ] as const

  // `--label-3` adalah tingkat paling redup yang masih TEKS. Kalau nanti ada tingkat yang lebih
  // redup lagi, dia masuk daftar ini — atau dia bukan untuk teks, dan itu harus ditulis.
  const LABEL = ['label', 'label-2', 'label-3'] as const

  for (const tema of TEMA) {
    for (const nama of LABEL) {
      for (const permukaan of tema.permukaan) {
        it(`${tema.nama}: --${nama} di atas --${permukaan}`, () => {
          const fg = token(tema.sel, nama)
          const bg = token(tema.sel, permukaan)
          // Token label boleh berupa hex opak (--label) atau rgba (--label-2/-3).
          const datar = fg.startsWith('#') ? fg : flatten(fg, bg)
          const r = contrast(datar, bg)
          expect(
            r,
            `--${nama} di atas --${permukaan} (${tema.nama}) cuma ${r.toFixed(2)}:1. `
            + 'WCAG AA menuntut 4,5:1 untuk teks biasa, dan token ini dipakai untuk teks — '
            + 'termasuk .field::placeholder.'
          ).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  }

  it('`.dim` memang memakai --label-3, jadi penjaga di atas menjaga sesuatu', () => {
    // Tanpa ini, seseorang bisa mengganti .dim ke token lain dan penjaga di atas jadi hijau
    // sambil tidak lagi menjaga teks yang sebenarnya tampil.
    expect(CSS).toMatch(/\.dim\s*\{\s*color:var\(--label-3\)\s*\}/)
  })

  it('placeholder kolom teks memakai token yang dijaga', () => {
    expect(CSS).toMatch(/::placeholder[^{]*\{[^}]*var\(--label-3\)/)
  })
})

/**
 * WARNA SEMANTIK SEBAGAI TEKS — keluarga yang tidak punya tinta sama sekali.
 *
 * `--acc-ink` dan `--yellow-ink` sudah ada, jadi aturannya sudah tertulis: "warna sebagai TEKS
 * pakai tintanya, bukan warnanya". Tapi `--green`, `--orange` dan `--red` tidak pernah dapat
 * varian ink, dan ketiganya dipakai sebagai warna teks di 15 tempat. Terukur di layar:
 *
 *     chip "Selesai" di Beranda   --green       2,65:1   (tema terang)
 *     .mchip.miss x11 di Stats    --orange      1,93:1
 *     "Reset semuanya" Pengaturan --red         3,55:1
 *     chip "Selesai"              --green       4,38:1   (tema GELAP)
 *     .btn.danger                 --red         3,82:1   (tema gelap)
 *
 * Dan `--yellow-ink` yang SUDAH ADA pun gagal, karena dia diukur ke putih (4,92) sementara `.pr`
 * memakainya di atas wash kuning 18% — di sana 3,98. Bentuk yang sama persis dengan aksen.
 */
describe('warna semantik sebagai teks lolos WCAG AA', () => {
  const SEMANTIK = ['green', 'orange', 'red', 'yellow'] as const
  /** `.pr` memakai wash 18%, sisanya 16%. Yang lebih pekat yang jadi patokan. */
  const CAMPUR = 0.18

  for (const tema of [
    { nama: 'gelap', sel: ':root {' },
    { nama: 'terang', sel: ':root[data-theme="light"]' },
  ]) {
    for (const nama of SEMANTIK) {
      it(`${tema.nama}: --${nama}-ink di atas wash --${nama} ${CAMPUR * 100}%`, () => {
        const s2 = token(tema.sel, 'surface-2')
        // Warna mentahnya selalu didefinisikan di :root (tema gelap) dan bisa ditimpa di light.
        let mentah = token(tema.sel, nama)
        if (!mentah.startsWith('#')) mentah = token(':root {', nama)
        expect(mentah.startsWith('#'), '--' + nama + ' harus hex, dapat ' + mentah).toBe(true)

        let tinta = token(tema.sel, nama + '-ink')
        // Tema gelap boleh memakai warnanya apa adanya kalau memang sudah cukup.
        if (tinta === 'var(--' + nama + ')') tinta = mentah
        expect(tinta.startsWith('#'), '--' + nama + '-ink harus hex atau var(--' + nama + ')')
          .toBe(true)

        const bg = campur(mentah, s2, CAMPUR)
        const r = contrast(tinta, bg)
        expect(
          r,
          `--${nama}-ink (${tinta}) di atas wash ${bg} cuma ${r.toFixed(2)}:1. `
          + 'Permukaan bertint adalah kasus TERBURUK untuk tinta warna ini, dan justru yang '
          + 'paling sering dipakai: chip, badge, dan tombol tinted semuanya bentuk itu.'
        ).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  it('NOL sisa `color:var(--green|orange|red|yellow)` di CSS', () => {
    // Penukaran mekanis selalu meninggalkan sisa — pelajaran yang sudah dibayar sekali di repo
    // ini, waktu `bwDeltaColor()` mengembalikan 'var(--acc)' sebagai string dan lolos dari
    // pencarian teks.
    for (const nama of SEMANTIK) {
      const sisa = [...CSS.matchAll(new RegExp('color:\\s*var\\(--' + nama + '\\)', 'g'))]
      expect(sisa.length, 'pakai var(--' + nama + '-ink) untuk warna teks').toBe(0)
    }
  })

  it('NOL sisa di JSX juga — di sana bentuknya string, bukan deklarasi CSS', () => {
    const JSX = ['views/Home.jsx', 'views/Stats.jsx', 'views/Workout.jsx', 'views/RoutineEdit.jsx',
      'views/Plan.jsx', 'views/Food.jsx', 'views/Settings.jsx', 'views/Library.jsx',
      'views/History.jsx', 'sheets.jsx', 'components/AiFoodSheet.jsx']
    const salah: string[] = []
    for (const f of JSX) {
      let src = ''
      try { src = readFileSync(new URL('../' + f, import.meta.url), 'utf8') } catch { continue }
      for (const nama of ['green', 'orange', 'red', 'yellow']) {
        if (src.includes("color: 'var(--" + nama + ")'")) salah.push(f + ' -> --' + nama)
      }
    }
    expect(salah, 'pakai --*-ink untuk warna teks:\n' + salah.join('\n')).toEqual([])
  })
})

/**
 * LABEL DI ATAS AKSEN TERISI — dan premis yang salah selama ini.
 *
 * `index.css` dulu menyatakan: "Button text is 17px/600, so the AA bar is 3:1 (large text)",
 * lalu menyimpulkan "blue, purple, pink dan red tetap putih (3.5-4.1:1) — lolos". WCAG menyebut
 * teks besar >= 18,66px BOLD atau >= 24px; 17px/600 bukan keduanya, jadi ambangnya 4,5:1 dan
 * keempatnya GAGAL.
 *
 * Ini kelas kesalahan yang paling mahal di repo ini: bukan angka yang salah dihitung, tapi angka
 * yang BENAR dibandingkan ke ambang yang salah. Dan itu lolos review justru karena angkanya
 * tercatat — 3.5-4.1 terlihat seperti hasil kerja yang teliti.
 *
 * Perbaikannya menggelapkan keempat --acc 7-14%, bukan menukar putih jadi hitam: `--on-acc`
 * dipakai sebagai teks di `.btn.primary`, `.chip.on`, `.setrow.done .n`, `.prayer-cell.on` dan
 * `.wday.today .num`, jadi ini bukan soal satu tombol.
 */
describe('label di atas aksen terisi lolos WCAG AA', () => {
  const PASANGAN: Record<string, string> = {
    lime: '#06140a', sky: '#ffffff', orange: '#000000', violet: '#ffffff',
    pink: '#ffffff', red: '#ffffff', teal: '#000000',
  }

  for (const [nama, teks] of Object.entries(PASANGAN)) {
    it(`${nama}: --on-acc di atas --acc ≥ 4.5:1`, () => {
      const acc = AKSEN_MENTAH[nama]!
      const r = contrast(teks, acc)
      expect(
        r,
        `${teks} di atas ${acc} cuma ${r.toFixed(2)}:1. Label kontrol terisi 17px/600 BUKAN `
        + 'teks besar menurut WCAG (butuh >= 18,66px bold atau >= 24px), jadi ambangnya 4,5.'
      ).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('nilai sistem Apple yang digantikan memang gagal — supaya tidak dikembalikan', () => {
    // Empat aksen ini digelapkan dari nilai sistemnya. Tanpa baris ini, mengembalikannya
    // terlihat seperti "memperbaiki penyimpangan dari palet platform".
    expect(contrast('#ffffff', '#007aff')).toBeLessThan(4.5)   // sky sistem
    expect(contrast('#ffffff', '#af52de')).toBeLessThan(4.5)   // violet sistem
    expect(contrast('#ffffff', '#ff2d55')).toBeLessThan(4.5)   // pink sistem
    expect(contrast('#ffffff', '#ff3b30')).toBeLessThan(4.5)   // red sistem
  })

  it('aksen yang dipakai CSS memang nilai yang diuji di sini', () => {
    // Penjaga di atas menghitung dari AKSEN_MENTAH; ini yang memastikan angka itu bukan fiksi.
    for (const [nama, hex] of Object.entries(AKSEN_MENTAH)) {
      if (hex === '#94e900' || hex === '#ff9500' || hex === '#30b0c7') continue  // lewat var()
      expect(CSS, nama + ' harus memakai ' + hex + ' di index.css')
        .toMatch(new RegExp('data-accent="' + nama + '"\\]\\s*\\{\\s*--acc:' + hex))
    }
  })
})
