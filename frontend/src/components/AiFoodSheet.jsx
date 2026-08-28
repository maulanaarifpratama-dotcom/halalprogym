// Perkiraan gizi dengan bantuan AI, memakai API key milik pengguna sendiri.
//
// ALUR LIMA LANGKAH, dan langkah ketiga yang menentukan seluruh rancangannya:
//
//   1. Tulis      — deskripsi makanan, bahasa sendiri.
//   2. Perkirakan — request pergi LANGSUNG dari perangkat ke provider pilihan pengguna.
//   3. TINJAU     — angkanya TERKUNCI, dan harus dibuka sengaja untuk diubah.
//   4. Catat      — simpan makanannya, dan langsung catat porsinya kalau mau.
//   5. Pantau     — total harian yang sudah ada, tanpa satu baris pun berubah.
//
// KENAPA TERKUNCI, BUKAN LANGSUNG BISA DIEDIT. Angka dari model adalah ESTIMASI, dan kunci itu
// yang mengatakannya tanpa satu paragraf peringatan. Kolom yang langsung bisa diedit berkata
// sebaliknya — dia terasa seperti formulir yang sudah benar dan cuma perlu dikonfirmasi. Sekali
// angka itu masuk ke state, dia jadi fakta di grafik orang selamanya.
//
// KENAPA TEKS, BUKAN FOTO. fud-ai memulai dari kamera. Kami tidak, dan itu sengaja: model
// penglihatan jauh lebih mahal per request — dan ini kuota milik pengguna, bukan kami —
// sementara mengetik "nasi uduk satu porsi" lebih cepat daripada memfoto lalu menunggu. Foto
// label kemasan memang kasus yang sah, dan itu bisa ditambahkan nanti tanpa mengubah satu pun
// berkas di lib/.
import { useMemo, useState } from 'react'
import { useStore, DEF } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { fmtNum, todayISO, uid } from '../lib/format.js'
import { loadAiConfig, FREE_KEY_URL } from '../lib/ai-key.js'
import { estimateNutrition } from '../lib/ai-client.js'
import { draftToFood, macrosDisagree } from '../lib/ai-nutrition.js'
import { progressTo, totalsOn } from '../lib/nutrition.js'
import { nav } from '../lib/nav.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import { Button, Switch, TextField } from './ui.jsx'

/**
 * Sebab kegagalan dipetakan ke teks DI SINI, sebagai literal.
 *
 * Dua alasan, keduanya sudah pernah jadi bug di repo ini: kuncinya jadi terlihat oleh
 * scripts/audit-locale-keys.mjs, dan lib/ tetap bebas dari teks UI. Dan sebab yang spesifik itu
 * yang penting — "gagal" tanpa sebab membuat orang mencoba ulang sepuluh kali padahal yang salah
 * kuncinya.
 */
function errorText(err) {
  if (err === 'no-config') return t('Add your own API key in Settings first.')
  if (err === 'auth') return t('The provider rejected that API key. Check it in Settings.')
  if (err === 'quota') return t('Your provider says you are out of quota for now.')
  if (err === 'timeout') return t('The provider took too long. Try again, or enter the numbers by hand.')
  if (err === 'offline') return t('No connection. You can still add the food by hand.')
  if (err === 'unreadable') return t('The answer could not be read. Try describing the food differently.')
  return t('That did not work. You can still add the food by hand.')
}

/** Peringatan atas jawaban model. Ditampilkan, tidak disembunyikan. */
function warningText(w) {
  if (w === 'macros-mismatch') return t('The calories and the macros disagree — check them before saving.')
  if (w === 'clamped') return t('Some numbers were out of physical range and were capped.')
  if (w === 'no-grams') return t('No serving weight was given, so 100 g is assumed.')
  return ''
}

export default function AiFoodSheet({ close, onLogged }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)

  const [desc, setDesc] = useState('')
  const [stage, setStage] = useState('ask')
  const [error, setError] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [draft, setDraft] = useState(null)
  // Terkunci sampai dibuka sengaja. Lihat catatan di kepala berkas.
  const [unlocked, setUnlocked] = useState(false)
  const [qty, setQty] = useState('1')

  const cfg = loadAiConfig()

  const ask = async () => {
    if (!desc.trim()) { toast(t('Describe what you ate first.')); return }
    setStage('busy'); setError(null)
    const out = await estimateNutrition(desc, cfg)
    if (!out.ok) { setError(out.error); setStage('ask'); return }
    setDraft(out.result.draft)
    setWarnings(out.result.warnings)
    setUnlocked(false)
    setQty('1')
    setStage('review')
  }

  // "Bagaimana kalau?" — dampaknya ke total HARI INI, dihitung sebelum apa pun disimpan. Angka
  // gizi satu makanan tidak menjawab pertanyaan yang orang benar-benar punya, yaitu apakah dia
  // masih di dalam targetnya hari ini.
  const preview = useMemo(() => {
    if (!draft) return null
    const now = totalsOn(S.meals, S.foods || [], todayISO())
    const n = Number(qty) || 0
    const after = {
      kcal: now.kcal + (Number(draft.kcal) || 0) * n,
      protein: now.protein + (Number(draft.protein) || 0) * n,
    }
    const target = S.nutritionTarget || DEF.nutritionTarget
    return { now, after, kcal: progressTo(after.kcal, target?.kcal) }
  }, [draft, qty, S.meals, S.foods, S.nutritionTarget])

  const setField = patch => setDraft(prev => ({ ...prev, ...patch }))

  // Peringatan yang ditampilkan, dihitung dari draf SAAT INI — bukan dibekukan dari jawaban
  // pertama model. 'clamped' dan 'no-grams' memang pernyataan tentang jawaban itu dan tetap
  // benar apa pun yang diedit; 'macros-mismatch' tidak — begitu pengguna membetulkan angkanya,
  // dia harus hilang. Peringatan yang tidak hilang setelah dibetulkan mengajari orang
  // mengabaikan peringatan.
  const shownWarnings = draft
    ? [
      ...warnings.filter(w => w !== 'macros-mismatch'),
      ...(macrosDisagree(draft.kcal, draft.protein, draft.carb, draft.fat) ? ['macros-mismatch'] : []),
    ]
    : []

  const commit = alsoLog => {
    const food = draftToFood({
      ...draft,
      name: String(draft.name || '').trim().slice(0, 60),
      kcal: Math.max(0, Number(draft.kcal) || 0),
      protein: Math.max(0, Number(draft.protein) || 0),
      carb: Math.max(0, Number(draft.carb) || 0),
      fat: Math.max(0, Number(draft.fat) || 0),
      gramsPerServing: Math.max(1, Math.round(Number(draft.gramsPerServing) || 100)),
    }, uid())
    if (!food.name) { toast(t('Give it a name')); return }

    update(s => { s.foods = [...(s.foods || []), food] })
    if (alsoLog) {
      const n = Number(qty) > 0 ? Number(qty) : 1
      update(s => {
        s.meals = [...(s.meals || []), { id: uid(), d: todayISO(), foodId: food.id, qty: n, at: Date.now() }]
      })
      if (onLogged) onLogged(food, n)
    }
    toast(alsoLog ? t('Logged') : t('Saved to your foods'))
    close()
  }

  // ---------- tanpa kunci: satu jalan keluar yang jelas, bukan tombol yang gagal ----------
  if (!cfg) return <>
    <h3>{t('Estimate with AI')}</h3>
    <p className="muted small" style={{ marginBottom: 12 }}>
      {t('This uses your own API key, so the request goes straight from this device to the provider — never through us. A free key from Google AI Studio is enough.')}
    </p>
    <a className="small" href={FREE_KEY_URL} target="_blank" rel="noopener">{t('Get a free key')}</a>
    <div style={{ height: 14 }} />
    {/* Benar-benar PERGI ke Pengaturan. Versi pertama tombol ini cuma menutup lembarnya,
        dan labelnya menjanjikan navigasi yang tidak terjadi — orang mengetuknya lalu
        kembali ke layar makan tanpa apa pun berubah. Itu kelas kesalahan yang sama dengan
        UI yang menawarkan jalan mustahil, cuma bentuknya lebih halus. */}
    <Button variant="primary" onClick={() => { close(); nav('/settings') }}>
      {t('Set it up in Settings')}
    </Button>
  </>

  // ---------- langkah 2: menunggu, dan itu boleh dibatalkan ----------
  if (stage === 'busy') return <>
    <h3>{t('Estimating…')}</h3>
    <p className="muted small">{desc}</p>
    <div style={{ height: 14 }} />
    {/* Menutup lembarnya, bukan membiarkan orang terjebak menatap pemutar. Request-nya sendiri
        punya batas waktu di lib/ai-client.ts, jadi dia tidak akan menggantung selamanya. */}
    <Button variant="ghost" onClick={close}>{t('Cancel')}</Button>
  </>

  // ---------- langkah 3: TINJAU ----------
  if (stage === 'review' && draft) return <>
    <h3>{t('Check before saving')}</h3>
    <p className="muted small" style={{ marginBottom: 12 }}>
      {t('These numbers are an estimate, not a measurement.')}
    </p>

    <TextField placeholder={t('Name')} maxLength={60}
      value={draft.name} onChange={e => setField({ name: e.target.value })} />

    <div style={{ height: 12 }} />
    <div className="row between">
      <div className="small dim">{t('Nutrition per serving')}</div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <Icon name="lock" className="dim" />
        <Switch checked={unlocked} onChange={setUnlocked} />
      </div>
    </div>
    <div className="small dim" style={{ marginTop: 4, marginBottom: 8 }}>
      {unlocked ? t('Editing on — your numbers win.') : t('Locked. Turn the switch on to correct anything.')}
    </div>

    <div className="row" style={{ gap: 8 }}>
      <TextField className="grow" type="number" inputMode="numeric" disabled={!unlocked}
        value={draft.kcal} onChange={e => setField({ kcal: e.target.value })}
        aria-label={t('Calories (kcal)')} />
      <TextField className="grow" type="number" inputMode="numeric" disabled={!unlocked}
        value={draft.gramsPerServing} onChange={e => setField({ gramsPerServing: e.target.value })}
        aria-label={t('Grams per serving')} />
    </div>
    <div className="small dim" style={{ marginTop: 4 }}>
      {t('Calories (kcal)')} · {t('Grams per serving')}
    </div>

    <div style={{ height: 10 }} />
    <div className="row" style={{ gap: 8 }}>
      <TextField className="grow" type="number" inputMode="decimal" disabled={!unlocked}
        value={draft.protein} onChange={e => setField({ protein: e.target.value })}
        aria-label={t('Protein (g)')} />
      <TextField className="grow" type="number" inputMode="decimal" disabled={!unlocked}
        value={draft.carb} onChange={e => setField({ carb: e.target.value })}
        aria-label={t('Carbs (g)')} />
      <TextField className="grow" type="number" inputMode="decimal" disabled={!unlocked}
        value={draft.fat} onChange={e => setField({ fat: e.target.value })}
        aria-label={t('Fat (g)')} />
    </div>
    <div className="small dim" style={{ marginTop: 4 }}>
      {t('Protein')} · {t('Carbs')} · {t('Fat')}
    </div>

    {shownWarnings.length > 0 && <div className="card" style={{ marginTop: 12, borderColor: 'var(--orange)' }}>
      {shownWarnings.map(w => (
        <div key={w} className="small" style={{ color: 'var(--orange)' }}>{warningText(w)}</div>
      ))}
    </div>}

    <div style={{ height: 14 }} />
    <div className="small dim">{t('How many {0}?', draft.servingUnit || t('servings'))}</div>
    <div style={{ height: 6 }} />
    <TextField type="number" inputMode="decimal" value={qty}
      onChange={e => setQty(e.target.value)} />

    {/* "Bagaimana kalau?" — dampak ke total hari ini, sebelum apa pun disimpan. */}
    {preview && <div className="card" style={{ marginTop: 12 }}>
      <div className="small dim">{t('If you log this')}</div>
      <div style={{ fontWeight: 650, marginTop: 2 }}>
        {fmtNum(preview.now.kcal)} → {fmtNum(preview.after.kcal)} {t('kcal')}
      </div>
      {preview.kcal && <div className="small" style={{ color: preview.kcal.over ? 'var(--orange)' : undefined }}>
        {preview.kcal.over
          ? t('{0} over your target', fmtNum(-preview.kcal.left))
          : t('{0} left today', fmtNum(preview.kcal.left))}
      </div>}
      <div className="small dim" style={{ marginTop: 2 }}>
        {t('Protein')} {fmtNum(preview.now.protein)} → {fmtNum(preview.after.protein)} g
      </div>
    </div>}

    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={() => commit(true)}>{t('Save and log it')}</Button>
    <div style={{ height: 8 }} />
    <Button onClick={() => commit(false)}>{t('Save to my foods only')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={() => { setStage('ask'); setDraft(null) }}>
      {t('Describe it again')}
    </Button>
  </>

  // ---------- langkah 1: tulis ----------
  return <>
    <h3>{t('Estimate with AI')}</h3>
    <p className="muted small" style={{ marginBottom: 12 }}>
      {t('Describe it the way you would say it out loud, including how much.')}
    </p>
    <TextField placeholder={t('What did you eat?')} maxLength={200} autoFocus
      value={desc} onChange={e => setDesc(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') ask() }} />

    {error && <div className="card" style={{ marginTop: 12, borderColor: 'var(--red)' }}>
      <div className="small" style={{ color: 'var(--red)' }}>{errorText(error)}</div>
    </div>}

    <div style={{ height: 14 }} />
    <Button variant="primary" icon="sparkles" onClick={ask}>{t('Estimate')}</Button>
    <p className="sect-f" style={{ marginTop: 12 }}>
      {t('Sent to your own provider with your own key. We never see it.')}
    </p>
  </>
}
