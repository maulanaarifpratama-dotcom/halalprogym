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
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { fmtNum, todayISO, uid } from '../lib/format.js'
import { loadCatalogue, searchCatalogue, adopt, servingChoices } from '../lib/food-db.js'
import { t } from '../lib/i18n.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import { Button, SearchField, TextField } from './ui.jsx'

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
    () => (katalog ? searchCatalogue(katalog, q, { limit: 40 }) : []),
    [katalog, q]
  )

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
      <div className="muted small" style={{ padding: '18px 0' }}>{t('Loading the database…')}</div>
    ) : q.trim().length < 2 ? (
      <div className="muted small" style={{ padding: '18px 0' }}>{t('Type at least two letters')}</div>
    ) : !hasil.length ? (
      <div className="muted small" style={{ padding: '18px 0' }}>{t('Nothing matches that')}</div>
    ) : (
      <div className="list" style={{ marginTop: 10 }}>
        {hasil.map(c => {
          const sudah = foods.some(f => f && f.id === c.id)
          return (
            <div key={c.id} className="item" onClick={() => {
              setPicked(c)
              setGram(String(servingChoices(c)[0].g))
            }}>
              <div className="grow">
                <div className="tt">{c.name}</div>
                <div className="ss">
                  {fmtNum(c.kcal)} {t('kcal')} {t('per 100 g')}
                  {c.brand ? ' · ' + c.brand : ''}
                  {' · '}{c.src === 'usda' ? t('Ingredient') : t('Product')}
                  {sudah ? ' · ' + t('Already in your foods') : ''}
                </div>
              </div>
              <Icon name="chevronRight" className="chev" />
            </div>
          )
        })}
      </div>
    )}

    {/* Atribusi ODbL bukan hiasan: dia SYARAT lisensi Open Food Facts, dan dia harus ada di
        tempat datanya dipakai — bukan cuma terkubur di layar Tentang. Dijaga tes. */}
    <p className="muted small" style={{ marginTop: 16 }}>
      {t('Data: Open Food Facts (ODbL 1.0) and USDA FoodData Central (public domain).')}
    </p>
  </>

  const pilihan = servingChoices(picked)
  const n = Number(gram)
  const sah = Number.isFinite(n) && n > 0
  const faktor = sah ? n / 100 : 0

  const simpan = (jugaCatat) => {
    if (jugaCatat && !sah) { toast(t('Enter a valid amount')); return }
    const hasilAdopsi = adopt(foods, picked)
    if (!hasilAdopsi.sudahAda) update(s => { s.foods = hasilAdopsi.foods })
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
    <h3>{picked.name}</h3>

    {/* Deskripsi USDA aslinya ditampilkan apa adanya. Padanan "Ikan kembung" -> king mackerel
        tidak sempurna, dan menyembunyikannya berarti orang tidak punya cara tahu. */}
    {picked.note && <div className="muted small" style={{ marginBottom: 10 }}>{picked.note}</div>}

    <div className="row" style={{ gap: 8, marginBottom: 10 }}>
      {pilihan.map(p => (
        <Button key={p.g} size="sm"
          variant={String(p.g) === gram ? 'primary' : undefined}
          onClick={() => setGram(String(p.g))}>
          {p.label ? p.label + ' · ' + p.g + ' g' : p.g + ' g'}
        </Button>
      ))}
    </div>

    <div className="small dim" style={{ marginBottom: 4 }}>{t('How many grams?')}</div>
    <TextField type="number" inputMode="decimal"
      value={gram} onChange={e => setGram(e.target.value)} aria-label={t('How many grams?')} />

    <div className="row" style={{ gap: 14, margin: '14px 0 4px' }}>
      <div>
        <div className="small dim">{t('kcal')}</div>
        <div style={{ fontWeight: 650 }}>{fmtNum(Math.round(picked.kcal * faktor))}</div>
      </div>
      {picked.protein !== undefined && (
        <div>
          <div className="small dim">{t('Protein')}</div>
          <div style={{ fontWeight: 650 }}>{fmtNum(Math.round(picked.protein * faktor * 10) / 10)} g</div>
        </div>
      )}
      {picked.carb !== undefined && (
        <div>
          <div className="small dim">{t('Carbs')}</div>
          <div style={{ fontWeight: 650 }}>{fmtNum(Math.round(picked.carb * faktor * 10) / 10)} g</div>
        </div>
      )}
      {picked.fat !== undefined && (
        <div>
          <div className="small dim">{t('Fat')}</div>
          <div style={{ fontWeight: 650 }}>{fmtNum(Math.round(picked.fat * faktor * 10) / 10)} g</div>
        </div>
      )}
    </div>

    <div className="row" style={{ gap: 8, marginTop: 14 }}>
      <Button variant="primary" className="grow" onClick={() => simpan(true)}>{t('Log it')}</Button>
      <Button onClick={() => simpan(false)}>{t('Save to my foods only')}</Button>
    </div>

    <Button variant="ghost" className="dim" onClick={() => setPicked(null)}>{t('Cancel')}</Button>
  </>
}
