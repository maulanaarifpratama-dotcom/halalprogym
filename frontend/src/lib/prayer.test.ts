import { describe, expect, it } from 'vitest'
import {
  CITIES, IMSAK_BEFORE_FAJR_MIN, JUMUAH_WINDOW_MIN, PRAYER_LABEL, SALAT_TIMES,
  activePrayerWindow, cityById, fmtPrayer, nextPrayer, prayerClash, scheduleFor,
  type PrayerName
} from './prayer.js'

/**
 * PATOKAN TERHADAP JADWAL RESMI KEMENAG.
 *
 * Nilai di bawah diambil dari jadwal Kemenag (lewat api.myquran.com) dan DIPAKU di sini,
 * bukan diambil saat tes berjalan. Alasannya dua: tes tidak boleh butuh jaringan, dan kalau
 * seseorang mengubah parameter perhitungan, tes ini harus gagal — bukan diam-diam ikut
 * bergeser bersama sumbernya.
 *
 * Toleransinya BUKAN simetris, dan itu intinya:
 *
 *   Untuk waktu MASUK salat, lebih awal berarti tidak sah — salat sebelum waktunya tidak
 *   terhitung. Magrib berlapis: dia juga waktu berbuka. Jadi Subuh, Asar, Magrib, Isya
 *   dipatok **tidak boleh lebih awal sedetik pun** dari Kemenag, dan boleh sampai +5 menit
 *   lebih lambat. Terbit dibalik: dia menandai AKHIR waktu Subuh, jadi lebih awal justru
 *   lebih hati-hati.
 *
 * Kalau tes ini gagal setelah mengubah parameter, JANGAN dilonggarkan toleransinya. Jalankan
 * ulang perbandingan enam kota (lihat catatan di prayer.ts) dan pahami dulu apa yang bergeser.
 */
const KEMENAG: Array<{ city: string; iso: string; ref: Record<PrayerName, string> }> = [
  {
    city: 'jakarta', iso: '2026-08-28',
    ref: { subuh: '04:39', terbit: '05:52', zuhur: '11:58', asar: '15:16', magrib: '17:56', isya: '19:06' }
  },
  {
    // Bandung 768 m — kota inilah yang membuktikan koreksi ketinggian dibutuhkan. Tanpa
    // koreksi itu, Magrib di sini 7 menit LEBIH AWAL dari Kemenag, dan itu arah yang
    // membatalkan puasa orang.
    city: 'bandung', iso: '2026-08-28',
    ref: { subuh: '04:37', terbit: '05:45', zuhur: '11:54', asar: '15:13', magrib: '17:57', isya: '19:02' }
  },
  {
    // Surabaya melengkapi ENAM kota yang diwajibkan di prayer.ts — kepala berkas ini sudah
    // menyebut "perbandingan enam kota" sementara isinya lima. Dan dia membawa hal yang tidak
    // dibawa lima lainnya: satu-satunya titik di TIMUR meridian zona di dalam Asia/Jakarta
    // (112,75°E lawan meridian 105°E). Jakarta 106,85 hampir di meridian dan Medan 98,7 di
    // baratnya, jadi tanpa Surabaya sisi timur zona ini tidak pernah diuji.
    //
    // Tanggalnya SAMA dengan Jakarta dan Bandung dengan sengaja: itu yang membuat
    // perbandingannya soal bujur saja. Uji kewajarannya lolos persis — Zuhur 11:34 lawan
    // 11:58 Jakarta, 24 menit untuk jarak bujur 5,9° (~23,6 menit waktu surya).
    city: 'surabaya', iso: '2026-08-28',
    ref: { subuh: '04:17', terbit: '05:29', zuhur: '11:34', asar: '14:53', magrib: '17:32', isya: '18:41' }
  },
  {
    // Jayapura — ujung timur, WIT. Dekat Ramadan 1448.
    city: 'jayapura', iso: '2027-02-08',
    ref: { subuh: '04:28', terbit: '05:42', zuhur: '11:55', asar: '15:13', magrib: '18:01', isya: '19:11' }
  },
  {
    // Medan — satu-satunya sampel di lintang UTARA, dekat solstis Desember.
    city: 'medan', iso: '2026-12-21',
    ref: { subuh: '05:04', terbit: '06:22', zuhur: '12:27', asar: '15:50', magrib: '18:24', isya: '19:38' }
  },
  {
    city: 'makassar', iso: '2027-02-08',
    ref: { subuh: '04:50', terbit: '06:04', zuhur: '12:20', asar: '15:37', magrib: '18:29', isya: '19:40' }
  }
]

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h as number) * 60 + (m as number)
}
const dateOf = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y as number, (m as number) - 1, d as number, 12, 0, 0)
}

describe('waktu salat vs jadwal resmi Kemenag', () => {
  /**
   * KEENAM kota yang diwajibkan harus benar-benar ada di sini.
   *
   * `prayer.ts` dan kepala berkas ini sama-sama menyebut "enam kota", dan sampai 2026-09-03
   * isinya LIMA — Surabaya tidak ada. Itu kelas kesalahan yang paling sering di repo ini:
   * dokumentasi yang benar, penerapan yang kurang satu, dan tidak ada yang membandingkannya.
   *
   * Alasannya juga dipaku, bukan cuma jumlahnya: ketiga zona waktu Indonesia harus terwakili,
   * karena `scheduleFor` menurunkan hari kalender dari `city.tz` dan bug pergeseran hari cuma
   * muncul di zona yang bukan zona perangkat.
   */
  const WAJIB = ['jakarta', 'bandung', 'surabaya', 'medan', 'makassar', 'jayapura']

  it('keenam kota yang diwajibkan ada patokannya', () => {
    const ada = KEMENAG.map(k => k.city)
    for (const c of WAJIB) {
      expect(ada, c + ' hilang dari patokan Kemenag — prayer.ts mewajibkannya').toContain(c)
    }
  })

  it('ketiga zona waktu Indonesia terwakili', () => {
    const zona = new Set(KEMENAG.map(k => cityById(k.city)?.tz).filter(Boolean))
    expect([...zona].sort()).toEqual(['Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar'])
  })

  it('setiap patokan menunjuk kota yang benar-benar ada di CITIES', () => {
    // Patokan untuk kota yang sudah dihapus dari daftar akan hijau selamanya tanpa menguji
    // apa pun — `cityById` mengembalikan undefined dan perbandingannya dilewati.
    for (const k of KEMENAG) {
      expect(cityById(k.city), k.city + ' tidak ada di CITIES').toBeTruthy()
    }
  })

  for (const { city: cityId, iso, ref } of KEMENAG) {
    const city = cityById(cityId)

    it(`${city.name} ${iso}: waktu masuk salat tidak pernah lebih awal dari Kemenag`, () => {
      const s = scheduleFor(city, dateOf(iso))
      for (const name of SALAT_TIMES) {
        const ours = toMin(fmtPrayer(s.times[name], city))
        const theirs = toMin(ref[name])
        const delta = ours - theirs
        expect(delta, `${city.name} ${iso} ${name}: kita ${fmtPrayer(s.times[name], city)} vs Kemenag ${ref[name]}`)
          .toBeGreaterThanOrEqual(0)
        // Batas atas supaya "aman" tidak berubah jadi "jauh melenceng".
        expect(delta, `${city.name} ${iso} ${name}: terlalu lambat`).toBeLessThanOrEqual(5)
      }
    })

    it(`${city.name} ${iso}: terbit dalam 3 menit, dan lebih awal itu boleh`, () => {
      const s = scheduleFor(city, dateOf(iso))
      const delta = toMin(fmtPrayer(s.times.terbit, city)) - toMin(ref.terbit)
      // Terbit menandai AKHIR waktu Subuh, jadi lebih awal = lebih hati-hati.
      expect(Math.abs(delta), `terbit kita ${fmtPrayer(s.times.terbit, city)} vs ${ref.terbit}`).toBeLessThanOrEqual(3)
    })
  }
})

describe('koreksi ketinggian', () => {
  it('menggeser Magrib Bandung lebih LAMBAT daripada Bandung di permukaan laut', () => {
    // Assertion pertama saya di sini SALAH: dia membandingkan Magrib Bandung dengan Jakarta
    // dan menuntut Bandung lebih lambat. Bandung memang lebih tinggi, tapi juga lebih TIMUR
    // 0,77 derajat, jadi matahari terbenam ~3 menit lebih awal secara astronomis — dua efek
    // yang hampir saling menghapus, dan sisanya lebih kecil dari pembulatan satu menit.
    //
    // Yang benar-benar ingin dibuktikan bukan perbandingan antar kota, tapi bahwa koreksinya
    // BEKERJA: Bandung pada 768 m harus Magrib lebih lambat daripada Bandung yang sama di
    // permukaan laut. Itu properti yang bersih, tanpa variabel bujur yang mengaburkan.
    const d = dateOf('2026-08-28')
    const real = cityById('bandung')
    const sealevel = { ...real, id: 'bandung-uji-permukaan-laut', alt: 0 }

    const withAlt = scheduleFor(real, d).times.magrib.getTime()
    const without = scheduleFor(sealevel, d).times.magrib.getTime()
    expect(withAlt).toBeGreaterThan(without)

    // Besarnya harus mendekati rumusnya: 0,117*sqrt(768) ~= 3,2 menit, dibulatkan jadi 3.
    expect(Math.round((withAlt - without) / 60000)).toBe(3)

    // Dan terbit bergerak ke arah SEBALIKNYA dengan besar yang sama.
    const sunWith = scheduleFor(real, d).times.terbit.getTime()
    const sunWithout = scheduleFor(sealevel, d).times.terbit.getTime()
    expect(Math.round((sunWithout - sunWith) / 60000)).toBe(3)
  })

  it('tidak menyentuh kota di bawah 20 m — geserannya membulat ke nol', () => {
    const low = CITIES.filter(c => c.alt <= 20)
    expect(low.length).toBeGreaterThan(5)
  })
})

describe('imsak', () => {
  it('tepat 10 menit sebelum Subuh — konvensi Kemenag', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    expect((s.times.subuh.getTime() - s.imsak.getTime()) / 60000).toBe(IMSAK_BEFORE_FAJR_MIN)
  })

  it('cocok dengan imsak Kemenag di Jakarta', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    // Kemenag: imsak 04:29, subuh 04:39. Subuh kita boleh sampai +5, jadi imsak juga.
    const delta = toMin(fmtPrayer(s.imsak, city)) - toMin('04:29')
    expect(delta).toBeGreaterThanOrEqual(0)
    expect(delta).toBeLessThanOrEqual(5)
  })
})

describe('nextPrayer', () => {
  it('mengembalikan salat berikutnya di hari yang sama', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    // Satu menit setelah Zuhur: yang berikutnya harus Asar.
    const n = nextPrayer(city, new Date(s.times.zuhur.getTime() + 60000))
    expect(n.name).toBe('asar')
    expect(n.tomorrow).toBe(false)
    expect(n.inMs).toBeGreaterThan(0)
  })

  it('setelah Isya, berikutnya Subuh BESOK — dihitung dari jadwal besok, bukan hari ini + 24 jam', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    const n = nextPrayer(city, new Date(s.times.isya.getTime() + 60000))
    expect(n.name).toBe('subuh')
    expect(n.tomorrow).toBe(true)
    // Waktu salat bergeser tiap hari, jadi Subuh besok tidak boleh sama dengan Subuh hari ini.
    const besok = scheduleFor(city, new Date(dateOf('2026-08-28').getTime() + 86400000))
    expect(n.at.getTime()).toBe(besok.times.subuh.getTime())
  })

  it('terbit tidak pernah dikembalikan — dia bukan salat', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    // Satu menit sebelum terbit: yang berikutnya harus Zuhur, melewati terbit.
    const n = nextPrayer(city, new Date(s.times.terbit.getTime() - 60000))
    expect(n.name).toBe('zuhur')
  })
})

describe('jendela salat', () => {
  it('aktif tepat saat waktunya masuk, dan berakhir setelah durasinya', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    const at = s.times.asar
    expect(activePrayerWindow(city, new Date(at.getTime() - 1))).toBeNull()
    expect(activePrayerWindow(city, at)?.name).toBe('asar')
    expect(activePrayerWindow(city, new Date(at.getTime() + 19 * 60000))?.name).toBe('asar')
    expect(activePrayerWindow(city, new Date(at.getTime() + 21 * 60000))).toBeNull()
  })

  it('Jumat memberi Zuhur jendela yang jauh lebih panjang — itu salat Jumat, ada khutbah', () => {
    const city = cityById('jakarta')
    // 2026-08-28 adalah hari Jumat.
    const jumat = dateOf('2026-08-28')
    expect(jumat.getDay()).toBe(5)
    const s = scheduleFor(city, jumat)
    const lateInWindow = new Date(s.times.zuhur.getTime() + 60 * 60000)
    expect(activePrayerWindow(city, lateInWindow)?.name).toBe('zuhur')

    // Hari Sabtu, satu jam setelah Zuhur sudah di luar jendela.
    const sabtu = dateOf('2026-08-29')
    expect(sabtu.getDay()).toBe(6)
    const s2 = scheduleFor(city, sabtu)
    expect(activePrayerWindow(city, new Date(s2.times.zuhur.getTime() + 60 * 60000))).toBeNull()
    expect(JUMUAH_WINDOW_MIN).toBeGreaterThan(60)
  })
})

describe('prayerClash', () => {
  it('menandai sesi yang akan menabrak waktu salat', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    // Mulai 30 menit sebelum Asar, latihan 60 menit: pasti menabrak.
    const clash = prayerClash(city, new Date(s.times.asar.getTime() - 30 * 60000), 60)
    expect(clash?.name).toBe('asar')
  })

  it('membiarkan sesi yang selesai sebelum waktunya masuk', () => {
    const city = cityById('jakarta')
    const s = scheduleFor(city, dateOf('2026-08-28'))
    // Mulai 90 menit sebelum Asar, latihan 60 menit: selesai 30 menit sebelum Asar.
    expect(prayerClash(city, new Date(s.times.asar.getTime() - 90 * 60000), 60)).toBeNull()
  })
})

describe('daftar kota', () => {
  it('mencakup tiga zona waktu Indonesia', () => {
    const zones = new Set(CITIES.map(c => c.tz))
    expect(zones).toContain('Asia/Jakarta')   // WIB
    expect(zones).toContain('Asia/Makassar')  // WITA
    expect(zones).toContain('Asia/Jayapura')  // WIT
  })

  it('cityById jatuh ke kota pertama untuk id yang tidak dikenal, bukan undefined', () => {
    // State tersimpan bisa memuat id kota dari versi app yang lebih lama.
    expect(cityById('tidak-ada-kota-ini').id).toBe(CITIES[0]?.id)
    expect(cityById(null).id).toBe(CITIES[0]?.id)
  })

  it('setiap kota punya id unik', () => {
    expect(new Set(CITIES.map(c => c.id)).size).toBe(CITIES.length)
  })

  it('label salat mengikuti ejaan KBBI', () => {
    // Magrib tanpa h, Asar tanpa h, Zuhur dengan Z — lihat docs/GLOSARIUM-ID.md.
    expect(PRAYER_LABEL.magrib).toBe('Magrib')
    expect(PRAYER_LABEL.asar).toBe('Asar')
    expect(PRAYER_LABEL.zuhur).toBe('Zuhur')
  })
})
