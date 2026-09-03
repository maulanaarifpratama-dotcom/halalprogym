import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import {
  PRAYER_LABEL, SALAT_TIMES, activePrayerWindow, cityById, fmtPrayer, nextPrayer, scheduleFor
} from '../lib/prayer.js'
import { isFastingDay, trainingWindows } from '../lib/ramadan.js'
import { isRamadanByHisab } from '../lib/hijri.js'

/**
 * Jadwal salat hari ini, dengan yang berikutnya ditandai.
 *
 * INI ALASAN APP INI ADA, jadi dia ditaruh di Home dan bukan disembunyikan di Settings.
 *
 * Tiga keputusan yang membentuk tampilannya:
 *
 * 1. Yang BERIKUTNYA yang ditonjolkan, bukan semuanya sama rata. Pertanyaan yang orang bawa
 *    ke app ini di antara set bukan "kapan Subuh tadi" tapi "berapa lama lagi sampai Magrib" —
 *    dan itu yang menentukan apakah dia masih punya waktu untuk dua set lagi.
 *
 * 2. Ada catatan bahwa ini PERHITUNGAN. Angkanya sudah diverifikasi terhadap jadwal resmi
 *    Kemenag dan tidak pernah lebih awal darinya, tapi untuk imsak dan buka puasa di bulan
 *    Ramadan, selisih semenit pun berarti. Menyembunyikan itu supaya app terasa lebih pintar
 *    adalah kebohongan kecil yang mahal.
 *
 * 3. Di HARI PUASA, dan hanya di hari puasa, kartu ini juga menjawab pertanyaan berikutnya:
 *    kapan masuk akal latihan. Dua jendela yang benar-benar dipakai orang — tepat sebelum
 *    Magrib (selesai lalu langsung berbuka) dan setelah Tarawih. Logikanya sudah ada dan bertes
 *    di `lib/ramadan.ts` sejak mode Ramadan dipasang, tapi TIDAK PERNAH DIPANGGIL dari mana
 *    pun; kartu ini yang membuatnya nyata.
 *
 *    Di hari biasa barisnya tidak muncul sama sekali. Sama alasannya dengan pengelompokan
 *    sahur/berbuka di layar makan: kotak yang menjelaskan sesuatu yang tidak sedang terjadi
 *    cuma menambah hal untuk dibaca dan dilewati.
 */

// Jam ulang tiap 30 detik. Cukup untuk hitungan mundur bermenit, dan tidak membangunkan
// perangkat lebih sering daripada yang berguna.
const TICK_MS = 30000

/**
 * Hitungan mundur ke waktu salat berikutnya.
 *
 * Satuannya lewat `t()`, dan itu perbaikan bug: versi sebelumnya menuliskan "jam" dan "mnt"
 * langsung di template. Akibatnya UI Mandarin menampilkan "Magrib 1 jam 53 mnt", dan begitu juga
 * kedua belas bahasa lain. `check:locale-keys` tidak bisa melihatnya karena tidak ada satu pun
 * pemanggilan `t()` untuk dicocokkan — teks Indonesia yang tidak pernah mengaku sebagai teks
 * yang perlu diterjemahkan adalah titik buta yang tidak ditutup checker mana pun.
 */
const countdown = ms => {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? t('{0} hr {1} min', h, m) : t('{0} min', m)
}

export default function PrayerCard() {
  const cityId = useStore(s => s.S.city)
  const city = cityById(cityId)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  const sched = scheduleFor(city, now)
  const next = nextPrayer(city, now)
  const active = activePrayerWindow(city, now)

  // Sakelar puasa dibaca dari state, bukan dari kalender: yang menentukan hari ini hari puasa
  // atau bukan adalah keputusan pengguna, dan itu memang harus manual (lihat lib/ramadan.ts).
  const ramadan = useStore(s => s.S.ramadan)
  const hijriOffset = useStore(s => s.S.hijriOffset || 0)
  const puasa = isFastingDay(ramadan, now)
  const latihan = puasa ? trainingWindows(city, now) : null
  /**
   * ISYARAT KALENDER, bukan gerbang — dan kenapa dia ada meski sakelarnya sengaja manual.
   *
   * Mode Ramadan ada karena mesin progresi tidak tahu itu Ramadan dan akan MEREGRESI beban;
   * sebulan begitu membuat program mundur jauh. Dan sakelarnya manual karena awal Ramadan
   * ditetapkan sidang isbat, jadi menyala sehari lebih awal berarti menahan beban di hari orang
   * belum berpuasa.
   *
   * Kedua hal itu benar sekaligus, dan di antaranya ada lubang: orang yang tidak tahu setelan
   * itu ada berpuasa sebulan penuh sementara bebannya diregresi. Baris ini menutup lubang itu
   * tanpa menyentuh sakelarnya — beda kepentingan yang sama dengan pita Ramadan di grafik berat
   * badan, yang juga dihitung dari kalender.
   *
   * Kata-katanya tidak menyatakan "ini Ramadan" sebagai fakta: hisab bisa beda sehari dari
   * isbat, dan yang boleh dikatakan cuma apa yang kalender tunjukkan.
   *
   * `sunnah` tidak ikut dihitung: di bulan Ramadan SETIAP hari puasa, jadi mode Senin-Kamis
   * memang tidak cukup dan isyaratnya tetap layak muncul.
   */
  const isyaratRamadan = !ramadan?.on && isRamadanByHisab(now, hijriOffset)

  return (
    <div className="card prayer">
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="lrow-t">{t('Prayer times')} · {city.name}</span>
        {active
          ? <span className="tag acc">{t('{0} now', PRAYER_LABEL[active.name])}</span>
          : <span className="small muted">
              {PRAYER_LABEL[next.name]} {countdown(next.inMs)}
              {next.tomorrow ? ' · ' + t('tomorrow') : ''}
            </span>}
      </div>

      <div className="prayer-row">
        {SALAT_TIMES.map(name => {
          const isNext = !active && name === next.name && !next.tomorrow
          const isActive = active?.name === name
          return (
            <div key={name} className={'prayer-cell' + (isNext ? ' next' : '') + (isActive ? ' on' : '')}>
              <div className="pl">{PRAYER_LABEL[name]}</div>
              <div className="pt">{fmtPrayer(sched.times[name], city)}</div>
            </div>
          )
        })}
      </div>

      {/* Imsak dan terbit tidak ikut baris utama: keduanya BUKAN salat, dan menaruhnya di
          antara lima waktu itu membuat orang salah hitung. */}
      <div className="prayer-sub">
        <span>{t('Imsak')} {fmtPrayer(sched.imsak, city)}</span>
        <span>{PRAYER_LABEL.terbit} {fmtPrayer(sched.times.terbit, city)}</span>
      </div>

      {/* Jendela latihan hari puasa. SARAN, bukan paksaan — ini app latihan pribadi, bukan
          pelatih yang menolak membuka layar di luar jam. */}
      {latihan && (
        <div className="prayer-train">
          <Icon name="dumbbell" />
          <span>
            <b>{t('Good time to train')}</b>{' '}
            {fmtPrayer(latihan.beforeIftar.from, city)}–{fmtPrayer(latihan.beforeIftar.to, city)}{' '}
            {t('before iftar')} · {t('after Tarawih')} {fmtPrayer(latihan.afterTarawih.from, city)}
          </span>
        </div>
      )}

      {/* Kelas SENDIRI, bukan `.prayer-train`. Keduanya baris kecil di bawah jadwal, tapi
          artinya berbeda — yang satu jendela latihan di hari puasa, yang ini isyarat kalender —
          dan memakai kelas yang sama membuat tes tidak bisa membedakannya. Terbukti: tiga tes
          `.prayer-train` yang sudah ada langsung merah, karena tanggal yang mereka pakai
          (4 Maret 2026) memang di dalam Ramadan 1447 menurut hisab. */}
      {isyaratRamadan && (
        <div className="prayer-hint">
          <Icon name="moon" />
          <span>{t('Calendar shows Ramadan — Ramadan mode is off. Turn it on in Settings to hold the weight.')}</span>
        </div>
      )}

      <div className="prayer-note">
        <Icon name="info" />
        {t('Calculated times. For Ramadan, check your local official schedule.')}
      </div>
    </div>
  )
}
