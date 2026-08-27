import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import {
  PRAYER_LABEL, SALAT_TIMES, activePrayerWindow, cityById, fmtPrayer, nextPrayer, scheduleFor
} from '../lib/prayer.js'

/**
 * Jadwal salat hari ini, dengan yang berikutnya ditandai.
 *
 * INI ALASAN APP INI ADA, jadi dia ditaruh di Home dan bukan disembunyikan di Settings.
 *
 * Dua keputusan yang membentuk tampilannya:
 *
 * 1. Yang BERIKUTNYA yang ditonjolkan, bukan semuanya sama rata. Pertanyaan yang orang bawa
 *    ke app ini di antara set bukan "kapan Subuh tadi" tapi "berapa lama lagi sampai Magrib" —
 *    dan itu yang menentukan apakah dia masih punya waktu untuk dua set lagi.
 *
 * 2. Ada catatan bahwa ini PERHITUNGAN. Angkanya sudah diverifikasi terhadap jadwal resmi
 *    Kemenag dan tidak pernah lebih awal darinya, tapi untuk imsak dan buka puasa di bulan
 *    Ramadan, selisih semenit pun berarti. Menyembunyikan itu supaya app terasa lebih pintar
 *    adalah kebohongan kecil yang mahal.
 */

// Jam ulang tiap 30 detik. Cukup untuk hitungan mundur bermenit, dan tidak membangunkan
// perangkat lebih sering daripada yang berguna.
const TICK_MS = 30000

const countdown = ms => {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} jam ${m} mnt` : `${m} mnt`
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

      <div className="prayer-note">
        <Icon name="info" />
        {t('Calculated times. For Ramadan, check your local official schedule.')}
      </div>
    </div>
  )
}
