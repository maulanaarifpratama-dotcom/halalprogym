// Mencari makanan di katalog bawaan: bahan pokok Indonesia (USDA) + produk ritel (Open Food Facts).
//
// TIGA JALUR MENCATAT MAKANAN, DAN MASING-MASING MENJAWAB PERTANYAAN YANG BERBEDA
//
//   1. Katalog (berkas ini) — "Indomie goreng", "tempe", "Teh Pucuk". Offline, instan, nol kuota.
//   2. AI                   — "nasi uduk setengah porsi pakai telur". Masakan matang, yang tidak
//                             ada di katalog mana pun karena dia bukan produk dan bukan bahan.
//   3. Manual               — label di tangan, atau resep sendiri. Jalan tanpa apa pun.
//
// Katalog berdiri di antara keduanya, tidak menggantikan salah satu. Yang paling sering dipakai
// orang justru nomor 1, dan itu sebabnya dia jadi jalur pertama di layar makan.
//
// KENAPA HASILNYA DIADOPSI, BUKAN DIRUJUK LANGSUNG
//
// Memilih dari katalog MENYALIN barisnya ke `S.foods` satu kali. Alasannya ada di kepala
// `lib/food-db.ts`, dan yang penting di sini akibatnya bagi pengguna: makanan yang pernah dia
// catat tetap ada dan angkanya tetap sama walau katalognya dibangun ulang nanti — dan dia boleh
// mengoreksinya kalau label di tangannya beda, tanpa katalog menimpanya balik.
//
// ---------------------------------------------------------------------------------------------
// KENAPA BARISNYA BERBENTUK BEGINI
//
// Daftar makanan dibaca dengan satu pertanyaan: **"yang mana yang lebih ringan."** Itu pertanyaan
// yang dijawab dengan membaca satu kolom angka lurus ke bawah, bukan dengan mencari angka di
// tengah kalimat subjudul. Jadi kalorinya keluar dari subjudul dan jadi kolom kanan bertabular-num
// (`.kc` di index.css), dan subjudulnya menyimpan yang MEMBEDAKAN produk: ukuran kemasan dan merek.
//
// Ukuran kemasan di subjudul itu wajib, bukan tambahan: "Pocari Sweat" muncul dua kali di katalog
// (350 ml dan 500 ml) karena ukurannya sengaja dibuang dari nama, dan tanpa baris itu keduanya
// tampil sebagai dua baris kembar yang tidak bisa dipilih dengan sadar.
//
// Tanda "Bahan" HANYA di bahan pokok, dan itu keputusan bukan kelalaian. Dia minoritas (59 dari
// 817) dan penandanya membawa informasi: baris ini generik, bukan satu merek. Menandai produk juga
// berarti setiap baris punya label, dan label di setiap baris berhenti jadi label.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { fmtNum, todayISO, uid } from '../lib/format.js'
import {
  QUICK_SEEDS, adopt, loadCatalogue, searchCatalogue, servingChoices,
} from '../lib/food-db.js'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import { Button, SearchField, TextField } from './ui.jsx'

const LIMIT = 40

export default function FoodDbSheet({ close, onLogged }) {
  const foods = useStore(s => s.S.foods) || []
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [katalog, setKatalog] = useState(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState(null)
  const [gram, setGram] = useState('')

  // Dimuat sekali saat lembar dibuka. Chunk ritelnya terpisah dari bundel utama, jadi orang yang
  // tidak pernah membuka lembar ini tidak pernah mengunduhnya.
  useEffect(() => {
    let hidup = true
    loadCatalogue().then(list => { if (hidup) setKatalog(list) })
    return () => { hidup = false }
  }, [])

  const hasil = useMemo(
    () => (katalog ? searchCatalogue(katalog, q, { limit: LIMIT }) : []),
    [katalog, q]
  )

  const jumlah = useMemo(() => {
    if (!katalog) return { pokok: 0, produk: 0 }
    let pokok = 0
    for (const c of katalog) if (c.src === 'usda') pokok++
    return { pokok, produk: katalog.length - pokok }
  }, [katalog])

  if (!picked) return <>
    <h3>{t('Food database')}</h3>

    <SearchField
      autoFocus
      value={q}
      onChange={e => setQ(e.target.value)}
      onClear={() => setQ('')}
      placeholder={t('Search a product or ingredient')}
      aria-label={t('Search a product or ingredient')}
    />

    {katalog === null ? (
      // Ruang tenang, bukan teks "memuat". Chunk-nya turun dalam puluhan milidetik di jaringan
      // apa pun yang sudah memuat app-nya, dan satu baris teks yang berkedip lalu hilang lebih
      // mengganggu daripada tidak ada apa-apa selama itu. Tingginya dipatok supaya lembarnya
      // tidak melompat waktu hasilnya masuk.
      <div style={{ minHeight: 132 }} aria-busy="true" />
    ) : q.trim().length < 2 ? (
      <Kosong jumlah={jumlah} onSeed={setQ} />
    ) : !hasil.length ? (
      <div className="muted small" style={{ padding: '24px 2px' }}>
        {t('Nothing matches that')}
      </div>
    ) : (
      <div className="list" style={{ marginTop: 12 }}>
        {hasil.map(c => (
          <Baris
            key={c.id}
            c={c}
            sudah={foods.some(f => f && f.id === c.id)}
            onPick={() => { setPicked(c); setGram(String(servingChoices(c)[0].g)) }}
          />
        ))}
      </div>
    )}
  </>

  const pilihan = servingChoices(picked)
  const n = Number(gram)
  const sah = Number.isFinite(n) && n > 0
  const faktor = sah ? n / 100 : 0
  const unit = picked.unit
  const tanyaJumlah = unit === 'ml' ? t('How many ml?') : t('How many grams?')

  const simpan = (jugaCatat) => {
    if (jugaCatat && !sah) { toast(t('Enter a valid amount')); return }
    const hasilAdopsi = adopt(foods, picked)
    // Dibandingkan REFERENSINYA, bukan `sudahAda`: `adopt` juga mengembalikan daftar baru saat
    // dia memperbaiki `unit` yang hilang pada makanan yang sudah ada. Versi pertama menulis
    // `if (!sudahAda)`, jadi perbaikannya dibuang dan tidak pernah tersimpan.
    if (hasilAdopsi.foods !== foods) update(s => { s.foods = hasilAdopsi.foods })
    if (jugaCatat) {
      update(s => {
        s.meals = [...(s.meals || []), {
          id: uid(), d: todayISO(), foodId: hasilAdopsi.food.id, qty: n, at: Date.now(),
        }]
      })
      if (onLogged) onLogged(hasilAdopsi.food, n)
    }
    toast(jugaCatat ? t('Logged') : t('Saved to your foods'))
    close()
  }

  return <>
    <h3 style={{ marginBottom: 3 }}>{picked.name}</h3>

    {/* Satu baris asal-usul: merek, dan untuk bahan pokok deskripsi USDA aslinya. Padanan
        "Ikan kembung" -> king mackerel tidak sempurna, dan menyembunyikannya berarti orang tidak
        punya cara tahu. */}
    <div className="muted small" style={{ marginBottom: 16 }}>
      {[picked.brand, picked.note].filter(Boolean).join(' · ')
        || fmtNum(picked.kcal) + ' ' + t('kcal') + ' ' + t('per 100 {0}', unit)}
    </div>

    {/* Porsi pakai `.chips` sistem, bukan tombol biasa: dia komponen yang memang untuk pilihan
        tunggal, bisa digulir kalau nanti pilihannya lebih dari dua, dan keadaan terpilihnya
        (`.chip.on`) sudah memakai `--on-acc` jadi kontrasnya sudah benar di kedua tema. */}
    <div className="chips" role="group" aria-label={tanyaJumlah}>
      {pilihan.map(p => (
        <button
          key={p.g}
          type="button"
          className={'chip unit' + (String(p.g) === gram ? ' on' : '')}
          aria-pressed={String(p.g) === gram}
          onClick={() => setGram(String(p.g))}>
          {(p.label ? t(p.label) + ' · ' : '') + p.g + ' ' + unit}
        </button>
      ))}
    </div>

    <div className="small dim" style={{ margin: '16px 0 5px' }}>{tanyaJumlah}</div>
    <TextField type="number" inputMode="decimal"
      value={gram} onChange={e => setGram(e.target.value)} aria-label={tanyaJumlah} />

    <Gizi c={picked} faktor={faktor} />

    <div className="row" style={{ gap: 8, marginTop: 18 }}>
      <Button variant="primary" className="grow" onClick={() => simpan(true)}>{t('Log it')}</Button>
      <Button onClick={() => simpan(false)}>{t('Save to my foods only')}</Button>
    </div>

    <Button variant="ghost" className="dim" onClick={() => setPicked(null)}>{t('Cancel')}</Button>
  </>
}

/** Satu baris hasil. Nama, pembedanya, lalu kolom kalori yang bisa dibaca lurus ke bawah. */
function Baris({ c, sudah, onPick }) {
  // `<button>`, bukan `<div>`: barisnya memang tombol, dan CSS `.item` sudah ditulis untuk itu
  // (`text-align:left; width:100%`). Sebagai div dia tidak bisa dijangkau keyboard sama sekali.
  const pembeda = [
    c.servingG ? c.servingG + ' ' + c.unit : null,
    c.brand,
  ].filter(Boolean).join(' · ')

  return (
    <button type="button" className="item" onClick={onPick}>
      <div className="grow">
        <div className="tt">{c.name}</div>
        <div className="ss">{pembeda || t('per 100 {0}', c.unit)}</div>
      </div>

      {c.src === 'usda' && <span className="tag acc">{t('Ingredient')}</span>}

      {/* Ikon, bukan teks: "sudah ada di daftarmu" di setiap baris yang cocok akan memanjangkan
          subjudul tepat di tempat pembeda produknya berada. */}
      {sudah && (
        <Icon name="check" aria-label={t('Already in your foods')}
          style={{ color: 'var(--acc-ink)', flex: 'none', fontSize: 15 }} />
      )}

      <div className="kc">
        <b>{fmtNum(c.kcal)}</b>
        <span>{t('per 100 {0}', c.unit)}</span>
      </div>
    </button>
  )
}

/**
 * Keadaan sebelum mengetik.
 *
 * Versi pertama cuma menulis "Ketik minimal dua huruf", dan itu jalan buntu: dia memberi perintah
 * tanpa memberi tahu apa yang bisa dicari. Layar ini sekarang menjawab dua pertanyaan yang orang
 * benar-benar punya — apa isinya, dan dari mana angkanya — lalu memberi enam titik masuk yang bisa
 * diketuk. Angkanya dihitung dari katalog yang benar-benar dimuat, bukan ditulis di teks, supaya
 * dia tidak bisa jadi basi seperti komentar "329 dari 1.324" yang pernah terjadi di repo ini.
 */
function Kosong({ jumlah, onSeed }) {
  return (
    <div style={{ paddingTop: 20 }}>
      <p className="muted small" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
        {t(
          'Search {0} packaged products and {1} Indonesian staples.',
          fmtNum(jumlah.produk),
          fmtNum(jumlah.pokok)
        )}
      </p>

      {/* Benih pencarian datang dari `lib/`, bukan dari literal di berkas ini — dia nama makanan,
          bukan teks UI, dan katalognya tetap Indonesia apa pun bahasa app-nya. */}
      <div className="chips">
        {QUICK_SEEDS.map(s => (
          <button key={s} type="button" className="chip" onClick={() => onSeed(s)}>{s}</button>
        ))}
      </div>

      {/* Atribusi ODbL bukan hiasan: dia SYARAT lisensi Open Food Facts, dan dia harus ada di
          tempat datanya dipakai — bukan cuma terkubur di layar Tentang. Tempatnya di sini, bukan
          di bawah hasil: di sini dia terbaca sebagai asal-usul, di sana dia bersaing dengan daftar
          yang sedang dipindai orang. Dijaga `food-attribution.test.ts`. */}
      <p className="dim small" style={{ margin: '22px 0 0', lineHeight: 1.5 }}>
        {t('Data: Open Food Facts (ODbL 1.0) and USDA FoodData Central (public domain).')}
      </p>
    </div>
  )
}

/**
 * Angka gizi untuk jumlah yang dipilih.
 *
 * Kalori dapat ukurannya sendiri karena dia yang dicari orang; makro berbaris di bawahnya sebagai
 * satu kelompok. Makro yang TIDAK ADA tidak dirender — bukan dirender sebagai 0, karena nol
 * berarti "produk ini benar-benar nol protein" dan itu klaim yang berbeda dari "kemasannya tidak
 * menyatakannya".
 */
function Gizi({ c, faktor }) {
  const g1 = v => Math.round(v * faktor * 10) / 10
  const makro = [
    ['Protein', c.protein],
    ['Carbs', c.carb],
    ['Fat', c.fat],
  ].filter(([, v]) => v !== undefined)

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <div style={{
          fontSize: 28, fontWeight: 600, letterSpacing: '-.026em',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {fmtNum(Math.round(c.kcal * faktor))}
        </div>
        <div className="dim small">{t('kcal')}</div>
      </div>

      {!!makro.length && (
        <div className="row" style={{ gap: 22, marginTop: 13 }}>
          {makro.map(([label, v]) => (
            <div key={label}>
              <div className="small dim">{t(label)}</div>
              <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmtNum(g1(v))} <span className="dim" style={{ fontWeight: 400 }}>g</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
