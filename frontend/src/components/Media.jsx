import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import ExerciseAnatomy from './ExerciseAnatomy.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
//
// TANPA MEDIA, SLOT INI TIDAK DIBIARKAN KOSONG.
//
// Jalur lama mengembalikan null kalau `ex.gif` tidak ada — benar waktu itu, karena cuma
// latihan buatan user yang tidak punya media. Sekarang tidak: gambar Gym visual dicabut dari
// build ini karena lisensinya, jadi TIDAK ADA latihan yang punya media sampai aset sendiri
// dibuat. Slot kosong di setiap latihan berarti app kehilangan hal paling intinya.
//
// Jadi absennya media atau gagal-muat jatuh ke peta otot (MuscleMap, MIT) — lihat
// ExerciseAnatomy.jsx untuk alasan lengkapnya. Media tetap DICOBA lebih dulu: yang self-host
// dengan lisensi Gym visual sendiri, atau nanti aset kita sendiri, tetap tampil seperti biasa.
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  // Disimpan sebagai id, bukan boolean: satu komponen Media dipakai ulang saat latihan berganti
  // di dalam sesi, dan boolean akan membawa kegagalan latihan sebelumnya ke latihan berikutnya.
  const [failedId, setFailedId] = useState(null)
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)

  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  const sizeToggle = minimizable && (
    <button className="giftoggle" onClick={toggleSize}>
      <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
    </button>
  )

  const noMedia = !ex.gif || failedId === ex.id
  if (noMedia) {
    const anat = <ExerciseAnatomy ex={ex} compact={compact} mini={mini} />
    if (!anat) return null
    return (
      <div className={'exmedia anat' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id}>
        {anat}
        {sizeToggle}
      </div>
    )
  }

  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      <img
        decoding="async"
        src={playing ? gifSrc(ex) : imgSrc(ex)}
        alt={exerciseNameFor(ex)}
        onError={() => setFailedId(ex.id)}
      />
      {sizeToggle}
      {!mini && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  const [failed, setFailed] = useState(false)
  // Peta otot tidak terbaca pada 50px, jadi thumbnail tetap memakai ikon — tapi sekarang juga
  // saat gambarnya GAGAL muat, bukan cuma saat tidak ada. Tanpa itu setiap baris daftar
  // menampilkan ikon gambar-rusak bawaan browser.
  if (!ex.img || failed) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return (
    <img
      className="thumb" loading="lazy" decoding="async"
      src={imgSrc(ex)} alt="" onError={() => setFailed(true)}
    />
  )
}
