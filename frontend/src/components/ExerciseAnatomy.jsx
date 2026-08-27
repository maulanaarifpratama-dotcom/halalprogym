import BodyMap from './BodyMap.jsx'
import { MUSCLE_NAME, musclesOf } from '../lib/muscles.js'
import { t } from '../lib/i18n.js'
import { useStore } from '../store/useStore.js'

/**
 * Peta otot untuk satu latihan, dipakai di slot yang dulu diisi animasi demo.
 *
 * KENAPA INI ADA, dan kenapa dia bukan placeholder:
 *
 * Gambar dan GIF 1.324 latihan dari dataset asal openGym adalah © Gym visual. Memakainya
 * secara komersial butuh lisensi sendiri, jadi media itu dicabut — dan tanpa penggantinya,
 * app latihan kehilangan hal paling inti: melihat gerakannya.
 *
 * Yang MASIH boleh dipakai: geometri otot MuscleMap (MIT, sudah di repo, `lib/body-paths.js`),
 * plus nama dan instruksi latihan (MIT, ExerciseDB). Jadi yang ditampilkan di sini bukan
 * "gambar yang hilang", tapi jawaban atas pertanyaan yang berbeda dan sering lebih berguna:
 * **otot mana yang dikerjakan gerakan ini.** GIF tidak pernah menjawab itu.
 *
 * Efek sampingnya kebetulan menyelesaikan soal aurat sekaligus: nol figur manusia berpakaian
 * minim, dan itu selesai di level gaya visual, bukan ditambal per-gambar.
 *
 * Begitu aset visual sendiri ada, Media.jsx menampilkannya dan panel ini jadi cadangan.
 */

// Skala absolut, bukan relatif. `levelsOf` tanpa threshold menaungi relatif terhadap otot
// terberat di load yang sama — benar untuk peta keseimbangan latihan, SALAH di sini: latihan
// satu-otot akan tampil identik dengan latihan multi-otot, karena keduanya punya satu
// maksimum. Dipatok: primer (1) selalu l4, sekunder (0.4) selalu l2. Jadi setiap diagram
// terbaca dengan aturan yang sama.
const THRESHOLDS = [
  { at: 0.01, level: 2 },
  { at: 0.9, level: 4 }
]

const PRIMARY_AT = 0.9

// Sekunder dipotong setelah tiga. Squat mengembalikan lima (abs, calves, hamstrings, lower
// back, obliques) dan pada 12,5px itu dinding teks, bukan informasi. Aman dipotong karena
// DIAGRAM-nya sudah menaungi semuanya — keterangan ini tugasnya menyebut yang utama, bukan
// mengulang apa yang sudah terlihat. Sisanya disebut jumlahnya supaya tidak terkesan hilang.
const SECONDARY_SHOWN = 3

const nameOf = slug => t(MUSCLE_NAME[slug] || slug)

/**
 * Apakah latihan ini punya metadata otot untuk digambar?
 *
 * Diekspor, dan itu bukan kenyamanan: `<ExerciseAnatomy />` adalah React ELEMENT dan karena
 * itu SELALU truthy — komponen yang mengembalikan null tidak membuat elemennya null. Media.jsx
 * pernah memakai `if (anat)` dan akibatnya merender pembungkus `.exmedia.anat` yang KOSONG
 * untuk latihan buatan user, alih-alih jatuh ke tingkat berikutnya. Predikat ini membuat
 * keputusan itu bisa diambil SEBELUM elemennya dibuat.
 */
export const hasAnatomy = ex => Object.keys(musclesOf(ex)).length > 0

export default function ExerciseAnatomy({ ex, compact, mini }) {
  const body = useStore(s => s.S.body)
  const load = musclesOf(ex)
  const slugs = Object.keys(load)
  if (!slugs.length) return null

  const primary = slugs.filter(s => load[s] >= PRIMARY_AT).map(nameOf).sort()
  const secondaryAll = slugs.filter(s => load[s] < PRIMARY_AT).map(nameOf).sort()
  const hidden = Math.max(0, secondaryAll.length - SECONDARY_SHOWN)
  const secondary = secondaryAll.slice(0, SECONDARY_SHOWN)

  return (
    <div className={'exanat' + (compact ? ' compact' : '') + (mini ? ' mini' : '')}>
      <BodyMap load={load} thresholds={THRESHOLDS} body={body === 'female' ? 'female' : 'male'} />
      {!mini && (primary.length > 0 || secondary.length > 0) && (
        <div className="exanat-lg">
          {primary.length > 0 && (
            <span className="exanat-p">{primary.join(', ')}</span>
          )}
          {secondary.length > 0 && (
            <span className="exanat-s">
              {t('also')} {secondary.join(', ')}{hidden > 0 ? ` +${hidden}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
