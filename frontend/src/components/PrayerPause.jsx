// Jeda salat di tengah sesi.
//
// KENAPA INI "JEDA" DAN BUKAN "BLOKIR"
//
// App ini tidak menghalangi apa pun saat waktu salat masuk. Yang dilakukannya dua hal, dan
// keduanya sengaja kecil:
//
//   1. MENGHENTIKAN TIMER ISTIRAHAT. Timer yang terus berhitung lalu berbunyi saat orang sedang
//      salat adalah gangguan di momen yang paling tidak boleh diganggu — dan itu satu-satunya
//      hal di app ini yang bisa mengeluarkan suara sendiri.
//   2. MENGATAKANNYA. Banner dengan nama waktu salatnya dan sampai kapan jendelanya.
//
// Yang TIDAK dilakukan: mengunci layar, menolak mencatat set, atau menghapus apa pun. Orang yang
// memilih menyelesaikan satu set terakhir dulu bukan sedang melakukan kesalahan yang perlu
// dicegah app latihan.
//
// TIDAK ADA DATA TERSIMPAN YANG RUSAK. `active.start` cuma penanda kapan sesi dimulai (dipakai
// model pemulihan dan grafik), bukan durasi — jadi tidak ada hitungan yang perlu akuntansi
// "waktu terjeda" tersendiri.
//
// Jam berjalan di header MEMANG ikut bertambah selama salat, dan itu dibiarkan: dia menampilkan
// waktu dinding, dan sesinya memang selesai selama itu. Mengurangi waktu salat dari situ berarti
// memperkenalkan konsep "durasi bersih" yang tidak ada di tempat lain di app ini.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { activePrayerWindow, cityById, fmtPrayer, PRAYER_LABEL, DEFAULT_CITY_ID } from '../lib/prayer.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'

/**
 * Seberapa sering jendela salat diperiksa.
 *
 * 20 detik, bukan tiap detik: jendela salat panjangnya 20–75 menit, jadi presisi detik tidak
 * membeli apa pun, dan interval yang berjalan tiap detik di layar yang dibuka paling lama di
 * app ini itu pekerjaan main-thread yang tidak dibayar.
 */
const CHECK_MS = 20_000

export default function PrayerPause() {
  const S = useStore(s => s.S)
  const stopRest = useUI(s => s.stopRest)
  const enabled = S.prayerPause !== false
  const city = cityById(S.city || DEFAULT_CITY_ID)

  const [win, setWin] = useState(() => (enabled ? activePrayerWindow(city, new Date()) : null))
  // Jendela yang sudah ditutup manual. Disimpan sebagai NAMA + waktu mulainya, bukan boolean:
  // boolean akan membuat penutupan Zuhur ikut menutup Asar beberapa jam kemudian.
  const [dismissed, setDismissed] = useState(null)
  // Timer dihentikan SEKALI per jendela. Tanpa penanda ini, tiap tick 20 detik akan menghentikan
  // timer baru yang mungkin sengaja dijalankan orang setelah dia kembali dari salat.
  const stoppedFor = useRef(null)

  useEffect(() => {
    if (!enabled) { setWin(null); return }
    const tick = () => setWin(activePrayerWindow(city, new Date()))
    tick()
    const iv = setInterval(tick, CHECK_MS)
    // Layar sesi sering ditinggal dan dibuka lagi; memeriksa saat kembali membuat banner-nya
    // benar tanpa menunggu tick berikutnya.
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', tick) }
  }, [enabled, city])

  useEffect(() => {
    if (!win) { stoppedFor.current = null; return }
    const key = win.name + '@' + win.at.getTime()
    if (stoppedFor.current === key) return
    stoppedFor.current = key
    stopRest()
  }, [win, stopRest])

  if (!enabled || !win) return null
  const key = win.name + '@' + win.at.getTime()
  if (dismissed === key) return null

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
      borderColor: 'color-mix(in srgb, var(--acc) 45%, transparent)',
      background: 'color-mix(in srgb, var(--acc) 10%, transparent)',
    }}>
      <span style={{ color: 'var(--acc-ink)', fontSize: 22, display: 'flex' }}><Icon name="moon" /></span>
      <div className="grow" style={{ lineHeight: 1.4 }}>
        <div style={{ fontWeight: 650 }}>{t('{0} — session paused', t(PRAYER_LABEL[win.name]))}</div>
        <div className="small dim">{t('Until {0}. Your sets are saved — pick up where you left off.', fmtPrayer(win.until, city))}</div>
      </div>
      <button className="iconbtn" onClick={() => setDismissed(key)} aria-label={t('Dismiss')}>
        <Icon name="xmark" />
      </button>
    </div>
  )
}
