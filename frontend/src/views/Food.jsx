// Catatan makan: kalori dan makro hari ini.
//
// TIGA JALUR MENCATAT, dan urutan tombolnya mengikuti biayanya:
//
//   1. "Log food" — makanan yang SUDAH tersimpan. Nol jaringan, nol kuota, paling cepat untuk
//      yang dimakan tiap hari. Ini yang jadi tombol utama.
//   2. "Database" — katalog bawaan: 59 bahan pokok (USDA, CC0) + produk ritel Indonesia
//      (Open Food Facts, ODbL). Offline setelah chunk-nya turun sekali.
//   3. "AI"       — masakan matang yang tidak ada di katalog mana pun, karena dia bukan produk
//      ritel dan bukan bahan mentah. Butuh kunci milik pengguna sendiri.
//
// Kepala berkas ini dulu berbunyi "TIDAK ADA DATABASE MAKANAN BAWAAN". Itu sudah tidak benar
// sejak katalognya masuk — dan komentar yang mengklaim ketiadaan fitur yang ADA lebih buruk
// daripada tidak ada komentar: dia mengajari orang bahwa fiturnya tidak ada. Alasan lisensinya
// yang lengkap ada di kepala `lib/nutrition.ts` dan di `lib/food-db.ts`.
//
// SATUAN DITAMPILKAN LEWAT `unitOf`, JANGAN DITULIS APA ADANYA. Tiga tempat di berkas ini pernah
// menulis 'g' begitu saja, dan akibatnya minuman yang dicatat 350 ml tampil "350 g" — kalorinya
// benar, satuannya bohong. Lihat catatan `Food.unit` di nutrition.ts.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { fmtNum, todayISO, uid } from '../lib/format.js'
import { cityById, DEFAULT_CITY_ID } from '../lib/prayer.js'
import { fastingWindow, isFastingDay } from '../lib/ramadan.js'
import {
  entriesOn, macrosOf, progressTo, totalsByWindow, totalsOn, unitOf, validateFood,
} from '../lib/nutrition.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, Row, Section, TextField } from '../components/ui.jsx'
import AiFoodSheet from '../components/AiFoodSheet.jsx'
import FoodDbSheet from '../components/FoodDbSheet.jsx'
import { confirmSheet } from '../sheets.jsx'

export default function Food() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const iso = todayISO()
  const now = new Date()

  const foods = S.foods || []
  const entries = useMemo(() => entriesOn(S.meals, iso), [S.meals, iso])
  const totals = useMemo(() => totalsOn(S.meals, foods, iso), [S.meals, foods, iso])
  const target = S.nutritionTarget || DEF.nutritionTarget

  const kcalP = progressTo(totals.kcal, target?.kcal)
  const protP = progressTo(totals.protein, target?.protein)

  // Pengelompokan sahur/berbuka hanya muncul di hari puasa. Di hari biasa dia cuma kotak kosong
  // yang menjelaskan sesuatu yang tidak sedang terjadi.
  const city = cityById(S.city || DEFAULT_CITY_ID)
  const puasa = isFastingDay(S.ramadan, now)
  const byWindow = useMemo(
    () => (puasa ? totalsByWindow(entries, foods, fastingWindow(city, now)) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, foods, puasa, city, iso]
  )

  const addEntry = (foodId, qty) => update(s => {
    s.meals = [...(s.meals || []), { id: uid(), d: iso, foodId, qty: Number(qty), at: Date.now() }]
  })
  const removeEntry = id => update(s => { s.meals = (s.meals || []).filter(m => m.id !== id) })

  const nameOf = id => foods.find(f => f.id === id)?.name || t('Unknown food')

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Food')}</h1></div>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>{t("Today's intake")}</h2>
        <Button size="sm" icon="target" onClick={() => useUI.getState().openSheet(close => <TargetSheet close={close} />)}>
          {target?.kcal ? fmtNum(target.kcal) : t('Goal')}
        </Button>
      </div>

      <div className="big" style={{ color: kcalP?.over ? 'var(--orange)' : 'var(--acc-ink)' }}>
        {fmtNum(totals.kcal)} <span className="muted" style={{ fontSize: 15 }}>{t('kcal')}</span>
      </div>
      {kcalP && <>
        <div className="wprog" style={{ margin: '8px 0 6px' }}>
          <i style={{ width: kcalP.ratio * 100 + '%', background: kcalP.over ? 'var(--orange)' : undefined }} />
        </div>
        <div className="small dim">
          {kcalP.over ? t('{0} over your target', fmtNum(-kcalP.left)) : t('{0} left today', fmtNum(kcalP.left))}
        </div>
      </>}

      <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <Macro label={t('Protein')} value={totals.protein} progress={protP} />
        <Macro label={t('Carbs')} value={totals.carb} />
        <Macro label={t('Fat')} value={totals.fat} />
      </div>
    </div>

    {/* Di hari puasa, total harian saja menyembunyikan pertanyaan yang sebenarnya: cukup atau
        tidak sahurnya. Jadi dipecah — dan cuma di hari puasa. */}
    {byWindow && (
      <Section title={t('Fasting day')}>
        {['sahur', 'iftar', 'other'].map(w => (
          <Row key={w} icon={w === 'sahur' ? 'moon' : w === 'iftar' ? 'sun' : 'dot'}
            iconTint={w === 'sahur' ? 'var(--indigo)' : w === 'iftar' ? 'var(--orange)' : 'var(--grey)'}
            title={w === 'sahur' ? t('Suhoor') : w === 'iftar' ? t('After iftar') : t('Other meals')}
            subtitle={fmtNum(byWindow[w].kcal) + ' ' + t('kcal') + ' · ' + fmtNum(byWindow[w].protein) + ' g'} />
        ))}
      </Section>
    )}

    {/* TIGA JALUR, dan urutannya sengaja.
        · "Log food"  — makanan yang SUDAH tersimpan. Paling cepat untuk yang dimakan tiap hari.
        · "Database"  — katalog bawaan: bahan pokok + produk ritel. Offline, nol kuota.
        · "AI"        — masakan matang yang tidak ada di katalog mana pun. Butuh kunci sendiri.
        Yang paling murah berdiri paling depan: jalur pertama dan kedua jalan tanpa jaringan,
        tanpa kunci, dan tanpa kuota siapa pun. */}
    <div className="actrow" style={{ margin: '16px 0 10px' }}>
      <Button variant="primary" icon="plus" className="grow"
        onClick={() => useUI.getState().openSheet(close => <PickSheet close={close} onPick={addEntry} />)}>
        {t('Log food')}
      </Button>
      <Button icon="magnifier"
        onClick={() => useUI.getState().openSheet(close => <FoodDbSheet close={close} />)}>
        {t('Database')}
      </Button>
      <Button icon="sparkles"
        onClick={() => useUI.getState().openSheet(close => <AiFoodSheet close={close} />)}>
        {t('AI')}
      </Button>
    </div>

    <h4 className="sec">{t('Logged today')}</h4>
    {entries.length ? (
      <div className="list">
        {entries.map(e => {
          const m = macrosOf(e, foods)
          const food = foods.find(f => f.id === e.foodId)
          return (
            <div key={e.id} className="item">
              <div className="grow">
                <div className="tt">{nameOf(e.foodId)}</div>
                <div className="ss">
                  {food?.basis === 'per100g' ? fmtNum(e.qty) + ' ' + unitOf(food) : fmtNum(e.qty) + ' × ' + (food?.serving || t('serving'))}
                  {' · '}{fmtNum(m.kcal)} {t('kcal')}
                </div>
              </div>
              <button className="iconbtn" aria-label={t('Delete')} onClick={() => removeEntry(e.id)}>
                <Icon name="trash" />
              </button>
            </div>
          )
        })}
      </div>
    ) : (
      <p className="muted small">{t('Nothing logged today.')}</p>
    )}

    <h4 className="sec" style={{ marginTop: 20 }}>{t('Your foods')}</h4>
    {foods.length ? (
      <div className="list">
        {foods.map(f => (
          <button type="button" key={f.id} className="item" onClick={() => useUI.getState().openSheet(close => <FoodSheet close={close} food={f} />)}>
            <div className="grow">
              <div className="tt">{f.name}</div>
              <div className="ss">
                {fmtNum(f.kcal)} {t('kcal')}{' '}
                {f.basis === 'per100g' ? t('per 100 {0}', unitOf(f)) : t('per {0}', f.serving || t('serving'))}
              </div>
            </div>
            <Icon name="chevronRight" className="chev" />
          </button>
        ))}
      </div>
    ) : (
      <p className="muted small">
        {t('No foods yet. Add the things you eat often — you only enter them once.')}
      </p>
    )}
    <div style={{ height: 10 }} />
    <Button icon="plus" onClick={() => useUI.getState().openSheet(close => <FoodSheet close={close} />)}>
      {t('Add a food')}
    </Button>
    <p className="sect-f" style={{ marginTop: 14 }}>
      {/* Teks lamanya berbunyi "No built-in food database", dan itu jadi SALAH begitu katalog
          masuk. Klaim di UI yang basi lebih buruk daripada tidak ada teks sama sekali: dia
          mengajari orang bahwa fitur yang ada itu tidak ada. */}
      {t('Search the built-in database for packaged products and staples, let AI estimate a cooked dish, or enter the numbers yourself from the label.')}
    </p>
  </div>
}

function Macro({ label, value, progress }) {
  return (
    <div>
      <div className="small dim">{label}</div>
      <div style={{ fontWeight: 650 }}>
        {fmtNum(value)} <span className="dim" style={{ fontWeight: 400 }}>g</span>
        {progress?.over && <span className="dim small"> · {t('over')}</span>}
      </div>
    </div>
  )
}

/** Memilih makanan yang sudah tersimpan, lalu jumlahnya. */
function PickSheet({ close, onPick }) {
  const foods = useStore(s => s.S.foods) || []
  const [picked, setPicked] = useState(null)
  const [qty, setQty] = useState('')

  if (!foods.length) return <>
    <h3>{t('Log food')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('No foods yet. Add the things you eat often — you only enter them once.')}
    </div>
    <Button variant="primary" onClick={() => { close(); useUI.getState().openSheet(c => <FoodSheet close={c} />) }}>
      {t('Add a food')}
    </Button>
  </>

  if (!picked) return <>
    <h3>{t('Log food')}</h3>
    <div className="list">
      {foods.map(f => (
        <button type="button" key={f.id} className="item" onClick={() => { setPicked(f); setQty(f.basis === 'per100g' ? '100' : '1') }}>
          <div className="grow">
            <div className="tt">{f.name}</div>
            <div className="ss">{fmtNum(f.kcal)} {t('kcal')} {f.basis === 'per100g' ? t('per 100 {0}', unitOf(f)) : t('per {0}', f.serving || t('serving'))}</div>
          </div>
          <Icon name="chevronRight" className="chev" />
        </button>
      ))}
    </div>
  </>

  const go = () => {
    const n = Number(String(qty).replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) { useUI.getState().toast(t('Enter a valid amount')); return }
    onPick(picked.id, n)
    close()
  }
  return <>
    <h3>{picked.name}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {picked.basis === 'per100g'
        ? (unitOf(picked) === 'ml' ? t('How many ml?') : t('How many grams?'))
        : t('How many {0}?', picked.serving || t('servings'))}
    </div>
    <TextField type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go}>{t('Log it')}</Button>
  </>
}

/** Membuat atau mengubah satu makanan. */
function FoodSheet({ close, food }) {
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  // `?? ''` di setiap kolom opsional di bawah BUKAN kerapian. `clean()` menyimpan `undefined`
  // untuk field opsional yang kosong — itu keputusan yang benar, supaya makanan cuma membawa apa
  // yang benar-benar diisi. Tapi merendernya apa adanya membuat React melihat `value={undefined}`
  // dan memperlakukan input itu sebagai TAK TERKENDALI, lalu berpindah jadi terkendali begitu
  // orang mengetik. React menulis error ke konsol untuk itu, dan `views/smoke.test.jsx` melarang
  // console.error justru karena error yang dibiarkan menumpuk sampai tidak ada yang membacanya.
  //
  // Terlihat saat MENGEDIT makanan yang sudah tersimpan tanpa protein/karbo/lemak — bukan saat
  // membuatnya, karena makanan baru dimulai dengan string kosong.
  const [f, setF] = useState(() => food || {
    id: uid(), name: '', basis: 'per100g', kcal: '', protein: '', carb: '', fat: '', serving: '',
  })
  const set = patch => setF(prev => ({ ...prev, ...patch }))

  const save = () => {
    const err = validateFood(f)
    // Kode dipetakan ke teks DI SINI, sebagai literal, supaya kuncinya terlihat oleh
    // scripts/audit-locale-keys.mjs — dan supaya lib/ tetap bebas dari teks UI.
    if (err) { toast(err === 'name' ? t('Give it a name') : t('Enter a valid calorie number')); return }
    // Angka disimpan sebagai angka, bukan string dari input. Sekali string masuk ke state, dia
    // ikut ke berkas cadangan dan ke Supabase, dan setiap perhitungan sesudahnya harus
    // membersihkannya lagi.
    const clean = {
      id: f.id, name: String(f.name).trim(), basis: f.basis,
      kcal: Number(f.kcal) || 0,
      protein: f.protein === '' ? undefined : Number(f.protein) || 0,
      carb: f.carb === '' ? undefined : Number(f.carb) || 0,
      fat: f.fat === '' ? undefined : Number(f.fat) || 0,
      serving: f.basis === 'perServing' ? String(f.serving || '').trim() : undefined,
    }
    update(s => {
      const list = s.foods || []
      const i = list.findIndex(x => x.id === clean.id)
      s.foods = i >= 0 ? list.map((x, j) => (j === i ? clean : x)) : [...list, clean]
    })
    close()
  }

  const remove = () => confirmSheet({
    title: t('Delete food?'),
    // Entri yang sudah dicatat TIDAK ikut terhapus — dia bagian dari riwayat, dan riwayat
    // bukan tempat menghapus jejak. macrosOf mengembalikan nol untuk makanan yang hilang.
    message: t('Past entries stay in your log, but they will no longer count toward totals.'),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(s => { s.foods = (s.foods || []).filter(x => x.id !== f.id) }); close() },
  })

  return <>
    <h3>{food ? t('Edit food') : t('Add a food')}</h3>
    <TextField placeholder={t('Name')} maxLength={60} value={f.name} onChange={e => set({ name: e.target.value })} />
    <div style={{ height: 10 }} />
    <div className="row" style={{ gap: 8 }}>
      <Button className="grow" variant={f.basis === 'per100g' ? 'primary' : undefined}
        onClick={() => set({ basis: 'per100g' })}>{t('per 100 g')}</Button>
      <Button className="grow" variant={f.basis === 'perServing' ? 'primary' : undefined}
        onClick={() => set({ basis: 'perServing' })}>{t('per serving')}</Button>
    </div>
    {f.basis === 'perServing' && <>
      <div style={{ height: 10 }} />
      <TextField placeholder={t('Serving, e.g. 1 plate')} maxLength={40}
        value={f.serving ?? ''} onChange={e => set({ serving: e.target.value })} />
    </>}
    <div style={{ height: 10 }} />
    <TextField type="number" inputMode="decimal" placeholder={t('Calories (kcal)')}
      value={f.kcal} onChange={e => set({ kcal: e.target.value })} />
    <div style={{ height: 10 }} />
    <div className="row" style={{ gap: 8 }}>
      <TextField className="grow" type="number" inputMode="decimal" placeholder={t('Protein (g)')}
        value={f.protein ?? ''} onChange={e => set({ protein: e.target.value })} />
      <TextField className="grow" type="number" inputMode="decimal" placeholder={t('Carbs (g)')}
        value={f.carb ?? ''} onChange={e => set({ carb: e.target.value })} />
      <TextField className="grow" type="number" inputMode="decimal" placeholder={t('Fat (g)')}
        value={f.fat ?? ''} onChange={e => set({ fat: e.target.value })} />
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
    {food && <>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={remove}>{t('Delete food')}</Button>
    </>}
  </>
}

/** Target harian. Kalori dan protein saja — dua angka yang benar-benar dipakai orang. */
function TargetSheet({ close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const cur = S.nutritionTarget || DEF.nutritionTarget
  const [kcal, setKcal] = useState(cur?.kcal ? String(cur.kcal) : '')
  const [protein, setProtein] = useState(cur?.protein ? String(cur.protein) : '')

  const save = () => {
    update(s => {
      s.nutritionTarget = {
        kcal: Number(kcal) > 0 ? Math.round(Number(kcal)) : null,
        protein: Number(protein) > 0 ? Math.round(Number(protein)) : null,
      }
    })
    close()
  }
  return <>
    <h3>{t('Daily target')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>
      {t('Leave a field empty to track it without a target.')}
    </div>
    <TextField type="number" inputMode="numeric" placeholder={t('Calories (kcal)')}
      value={kcal} onChange={e => setKcal(e.target.value)} />
    <div style={{ height: 10 }} />
    <TextField type="number" inputMode="numeric" placeholder={t('Protein (g)')}
      value={protein} onChange={e => setProtein(e.target.value)} />
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </>
}
