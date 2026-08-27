import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { demoFrames } from '../lib/exercise-media.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import ExerciseAnatomy from './ExerciseAnatomy.jsx'

// Demo gerakan. `compact` mengecilkannya (kartu superset); `minimizable` (layar Workout)
// menambah kontrol kecilkan/besarkan yang pilihannya tersimpan di Settings (issue #12).
//
// TIGA TINGKAT, urut dari yang paling spesifik:
//
//   1. VITE_DEMO_BASE / media lokal kalau VITE_IMG_BASE disetel eksplisit — jalur untuk yang
//      self-host dengan lisensi medianya sendiri. Tidak aktif secara default.
//   2. Foto free-exercise-db (Unlicense, domain publik) — dua bingkai, posisi awal dan akhir.
//      Tap membolak-balik keduanya. Ini yang dipakai 329 latihan.
//   3. Diagram otot MuscleMap (MIT) untuk sisanya.
//
// Tingkat 3 bukan keadaan error, dan penting untuk tidak memperlakukannya begitu: dia menjawab
// pertanyaan yang berbeda — otot mana yang dikerjakan — yang justru tidak pernah dijawab foto
// atau GIF. Lihat ExerciseAnatomy.jsx.
//
// Gagal muat di tingkat mana pun jatuh ke tingkat 3. Tidak ada kotak kosong, tidak ada ikon
// gambar-rusak bawaan browser.

const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {}
// Hanya kalau di-set EKSPLISIT saat build. Jalur warisan menunjuk media Gym visual yang tidak
// kita distribusikan, jadi dia mati kecuali seseorang sengaja menyalakannya.
const LEGACY_MEDIA = !!ENV.VITE_IMG_BASE

export default function Media({ ex, id, compact, minimizable }) {
  // Bingkai mana yang ditampilkan. Bukan "playing": tidak ada yang berputar — dua posisi diam
  // yang bisa ditatap justru lebih berguna untuk mempelajari bentuk gerakan daripada animasi
  // tiga detik, karena kamu bisa berhenti di posisi yang ingin kamu tiru.
  const [frame, setFrame] = useState(0)
  // Disimpan sebagai id latihan, bukan boolean: satu komponen Media dipakai ulang saat latihan
  // berganti di dalam sesi, dan boolean akan membawa kegagalan latihan sebelumnya ke berikutnya.
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
  const cls = extra => 'exmedia' + extra + (compact ? ' compact' : '') + (mini ? ' mini' : '')

  const frames = demoFrames(ex)
  const failed = failedId === ex.id
  const legacy = LEGACY_MEDIA && ex.gif

  if (!failed && (frames.length > 0 || legacy)) {
    const srcs = legacy ? [gifSrc(ex), imgSrc(ex)] : frames
    const shown = srcs[frame % srcs.length]
    const many = srcs.length > 1
    return (
      <div className={cls('')} id={id} onClick={many ? () => setFrame(f => f + 1) : undefined}>
        <img
          decoding="async"
          src={shown}
          alt={exerciseNameFor(ex)}
          onError={() => setFailedId(ex.id)}
        />
        {sizeToggle}
        {!mini && many && (
          <span className="gifhint">
            <Icon name="reset" />
            {frame % srcs.length === 0 ? t('start position') : t('end position')}
          </span>
        )}
      </div>
    )
  }

  const anat = <ExerciseAnatomy ex={ex} compact={compact} mini={mini} />
  if (!anat) return null
  return (
    <div className={cls(' anat')} id={id}>
      {anat}
      {sizeToggle}
    </div>
  )
}

/**
 * Ikon cadangan thumbnail, mengikuti BAGIAN TUBUH.
 *
 * Peta otot tidak terbaca pada 50px, jadi thumbnail memakai ikon. Tapi ikon dumbbell yang sama
 * di setiap baris tidak memberi informasi apa pun — dan daftar latihan diurut alfabet, jadi
 * satu layar bisa berisi 37 baris tanpa foto berturut-turut. Ikon per bagian tubuh membuat
 * daftar itu bisa dipindai mata: kamu melihat kelompok latihannya tanpa membaca namanya.
 */
const BP_ICON = {
  chest: 'figureStrength',
  back: 'pullup',
  shoulders: 'dumbbell',
  'upper arms': 'arm',
  'lower arms': 'arm',
  waist: 'abs',
  'upper legs': 'legs',
  'lower legs': 'legs',
  neck: 'person',
  cardio: 'figureRun'
}

export function Thumb({ ex }) {
  const [failed, setFailed] = useState(false)
  // Bingkai pertama demo kalau ada; ikon kalau tidak — termasuk saat gambarnya GAGAL muat,
  // bukan cuma saat tidak ada. Tanpa itu setiap baris daftar menampilkan ikon gambar-rusak
  // bawaan browser.
  const frames = demoFrames(ex)
  const src = frames[0] || (LEGACY_MEDIA && ex.img ? imgSrc(ex) : null)
  if (!src || failed) {
    return <div className="thumb thumb-x"><Icon name={BP_ICON[ex.bp] || 'dumbbell'} /></div>
  }
  return (
    <img
      className="thumb" loading="lazy" decoding="async"
      src={src} alt="" onError={() => setFailed(true)}
    />
  )
}
