import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ } from '../lib/format.js'
import { CITIES, DEFAULT_CITY_ID, cityById, fmtPrayer } from '../lib/prayer.js'
import { fastingWindow, isFastingDay } from '../lib/ramadan.js'
import { clampOffset, fmtHijri } from '../lib/hijri.js'
import { getLang } from '../lib/i18n-core.js'
import { effortOf } from '../lib/history.js'
import { IS_ANDROID } from '../lib/platform.js'
import { authAvailable, looksLikeEmail, signInWithEmail, signInWithGoogle } from '../lib/auth.js'
import {
  clearAiConfig, DEFAULT_MODEL, FREE_KEY_URL, loadAiConfig, maskKey, PROVIDER_LABEL, saveAiConfig,
} from '../lib/ai-key.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { MOBILE, shareExport, syncReminder } from '../lib/mobile.js'
import { loadStarterPlan, confirmSheet, importFromApp, equipmentProfileSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, TextField } from '../components/ui.jsx'

export default function Settings() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const { update, replaceState, pullState, pushState, signOut, signOutAll, resetDemo, wipeEverything } = useStore()
  const toast = useUI(s => s.toast)
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'halalprogym-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch (e) { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }
  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result)
        if (!data.workouts || !data.routines) throw new Error('not a Halal Pro Gym backup')
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true); toast(t('Backup imported')) } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  // Masuk dari Pengaturan memakai jalur yang sama dengan layar masuk. Tidak ada "daftar"
  // terpisah: Google dan magic link keduanya membuat akun pada percobaan pertama, jadi dua
  // tombol yang berbeda untuk hal yang sama cuma bikin orang memilih tanpa alasan.
  const googleHere = async () => {
    try { await signInWithGoogle() } catch (e) { toast(e?.message || t('Sign-in failed')) }
  }
  const emailHere = () => useUI.getState().openSheet(close => <EmailInline close={close} toast={toast} />)
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: t('Signs this profile out on every device, including this one. You can sign in again anytime.'),
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { await signOutAll(); nav('/home'); toast(t('Signed out on all devices')) }
      catch (e) { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* ---------- akun ----------
        Tiga baris yang dulu ada di sini DICABUT, bukan dinonaktifkan:

          "Pasang di server sendiri"   produk ini bukan self-host. Vercel + Supabase, satu
                                       pengguna per akun. Menawarkannya menjanjikan bentuk
                                       produk yang tidak kita bangun.
          "Sambungkan ke server saya"  menunjuk server upstream yang sudah kita hapus.
          "Sambungkan app HP"          minting kode pairing dari endpoint yang tidak ada.

        Ketiganya bukan cuma mati — mereka MENAWARKAN JALAN YANG MUSTAHIL, dan orang
        mengetuknya. Dasbor admin ikut pergi bersama Admin.jsx: tidak ada pengguna lain untuk
        dikelola.

        Build MOBILE sekarang memakai jalur yang sama dengan web: satu akun Supabase, atau tamu
        lokal. Tidak ada lagi mode ketiga. */}
    <Section title={DEMO ? t('Demo') : t('Account')}>
      {DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
        <Row icon="link" iconTint="var(--indigo)" title={t('Source code')} subtitle={t('free & open source (AGPL v3)')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : user ? <>
        <Row icon="personCircle" iconTint="var(--grey)" title={user.name}
          subtitle={user.email || t('Your data syncs with your profile — sign in anywhere to see it.')} />
        <Row icon="signOut" iconTint="var(--red)" title={t('Sign out')} danger onClick={() => confirmSheet({ title: t('Sign out?'), message: t('Your data is synced to your profile first, then cleared from this device.'), confirmText: t('Sign out'), danger: true, onConfirm: () => { signOut(); nav('/home') } })} />
        <Row icon="shield" iconTint="var(--red)" title={t('Sign out everywhere')} subtitle={t('Ends this profile’s sessions on all your devices.')} danger onClick={signOutEverywhere} />
      </> : authAvailable() ? <>
        <Row icon="person" iconTint="var(--blue)" title={t('Continue with Google')} subtitle={t('Syncs your plan and history across your devices.')} accessory="chevron" onClick={googleHere} />
        <Row icon="mail" iconTint="var(--acc)" title={t('Sign in with email')} subtitle={t('No password. We send a link — opening it signs you in.')} accessory="chevron" onClick={emailHere} />
      </> : (
        // Tanpa kredensial Supabase, sinkronisasi memang tidak ada di build ini. Dikatakan apa
        // adanya, bukan disembunyikan dan bukan ditawarkan lalu gagal.
        <Row icon="lock" iconTint="var(--acc)" title={t('All data stays on this device')} subtitle={t('No account sync is set up in this build — everything stays on this device.')} />
      )}
    </Section>
    {!user && !DEMO && <p className="sect-f" style={{ marginTop: -18, marginBottom: 22 }}>{t('Guest mode — data lives only in this browser.')}</p>}

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang || 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[{ value: 0, label: t('Off') }, ...[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + 's' }))]} />
      {/* Default for a rest-pause burst added live on a plain set — a planned exercise's own
          "Rest (s)" (in its Intensifier config) overrides this, same as the main rest timer
          is the fallback whenever an exercise has no progression rule of its own. */}
      <SelectRow icon="bolt" iconTint="var(--acc)" title={t('Rest-pause rest')}
        value={S.restPauseSec} onChange={v => update(s => { s.restPauseSec = v })}
        options={[10, 15, 20, 30].map(v => ({ value: v, label: v + 's' }))} />
      {(wakeOK || !MOBILE) && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      {/* Jeda salat. Ditaruh di sini, bukan di dekat "Kota untuk waktu salat" di Tampilan:
          yang ini mengubah apa yang terjadi DI TENGAH SESI, dan itu tempat orang mencarinya. */}
      <Row icon="moon" iconTint="var(--acc)" title={t('Pause for prayer')}
        subtitle={t('When a prayer time arrives mid-session, the rest timer stops and the app says so.')}>
        <Switch checked={S.prayerPause !== false} onChange={v => update(s => { s.prayerPause = v })} />
      </Row>
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
        <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
      </Row>
      {/* Two names for the same judgement, so the column asks in the scale you already think in.
          The (i) sits before the control — you read it on the way to the choice, not after it. */}
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    <NotificationsCard S={S} update={update} toast={toast} />

    {/* ---------- equipment ---------- */}
    <EquipmentCard S={S} update={update} />

    {/* ---------- puasa ---------- */}
    <RamadanCard S={S} update={update} />

    {/* ---------- perkiraan gizi AI, kunci milik pengguna sendiri ---------- */}
    <AiCard toast={toast} />

    {/* ---------- appearance ---------- */}
    {/* Catatan kaki "tersinkron dengan profilmu" dulu digerbangi `DEMO || MOBILE`, dan itu
        salah sejak awal untuk pengguna tamu di web: dia menjanjikan profil yang tidak ada.
        Sekarang digerbangi `user` — satu-satunya kondisi yang membuat kalimatnya benar. */}
    <Section title={t('Appearance')} footer={user ? t('synced with your profile') : undefined}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')}>
        <Segmented
          className="seg-inline"
          options={[
            { value: 'dark', icon: 'moon', label: t('Dark') },
            { value: 'light', icon: 'sun', label: t('Light') },
            { value: 'system', icon: 'gear', label: t('System') },
          ]}
          value={S.theme || 'dark'}
          onChange={v => update(s => { s.theme = v })}
        />
      </Row>
      {/* Kota untuk waktu salat. Daftar, bukan geolocation — tanpa izin browser dan jalan
          offline. Waktu salat tidak butuh presisi GPS: satu kota sudah cukup. */}
      <SelectRow
        icon="globe" iconTint="var(--acc)" title={t('Prayer city')}
        value={S.city || DEFAULT_CITY_ID}
        options={CITIES.map(c => ({ value: c.id, label: c.name }))}
        onChange={v => update(s => { s.city = v })}
        sheetTitle={t('Prayer city')}
      />

      {/* Offset tanggal Hijriah. Ditaruh tepat di bawah kota waktu salat: keduanya soal kalender
          dan waktu Islam, dan orang yang menggeser satu biasanya sedang memeriksa yang lain.

          Kenapa offset-nya ADA sama sekali: konversi di app ini memakai hisab Umm al-Qura,
          satu-satunya yang bisa dihitung offline. Awal bulan di Indonesia ditetapkan sidang
          isbat Kemenag, yang mempertimbangkan rukyat, dan keduanya bisa berbeda sehari. Satu
          hari itu menentukan hari pertama Ramadan dan Idulfitri, jadi app ini menampilkan hasil
          hisab dan membiarkan pemiliknya menyesuaikan. */}
      <Row icon="calendar" iconTint="var(--purple)" title={t('Hijri date offset')}
        subtitle={t('Today: {0}', fmtHijri(new Date(), getLang(), S.hijriOffset, t('H')) || '—')}>
        <Segmented
          className="seg-inline"
          options={[-2, -1, 0, 1, 2].map(v => ({ value: v, label: (v > 0 ? '+' : '') + v }))}
          value={clampOffset(S.hijriOffset)}
          onChange={v => update(s => { s.hijriOffset = clampOffset(v) })}
        />
      </Row>

      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'lime') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Data')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan (PPL)')} accessory="chevron" onClick={loadStarterPlan} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('FitNotes, Strong, Hevy — or body weight from Apple Health')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
      {MOBILE && <Row icon="history" iconTint="var(--blue)" title={t('Auto-backup on changes')}
        subtitle={t('Saves a dated copy to the Documents folder after finishing a workout or editing a routine — point a sync app at it, or copy it out by hand.')}>
        <Switch checked={!!S.autoBackup} onChange={v => update(s => { s.autoBackup = v })} />
      </Row>}
      {/* Untuk pengguna yang masuk, penghapusan harus ikut menghapus barisnya di server —
          kalau tidak, boot berikutnya melihat lokal kosong dan MENARIKNYA KEMBALI, jadi
          penghapusannya terasa tidak berlaku. wipeEverything mengurus keduanya. */}
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({
        title: t('Reset everything?'),
        message: user
          ? t('Deletes your plan, workouts and body weight — on this device and in your account. This cannot be undone.')
          : t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'),
        confirmText: t('Delete everything'), danger: true,
        onConfirm: async () => { await wipeEverything(); nav('/home'); toast(t('All data reset')) },
      })} />
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install Halal Pro Gym as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    {/* The version, at the bottom of Settings — which is where the support template has been
        telling people to look for it, and where it was not. On the phone build there is no
        address bar and no about box, so without this there is no way to tell which build you
        are running, or whether an update actually installed. */}
    <div className="dim small" style={{ textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
      Halal Pro Gym v{__APP_VERSION__} · {t('free & open source (AGPL v3)')}<br />
      {/* AGPL v3 requires that people using this as a network service can get its source.
          This link IS that offer — do not remove it. See CLAUDE.md. */}
      <a href="https://github.com/maulanaarifpratama-dotcom/halalprogym" target="_blank" rel="noopener">kode sumber</a> ·
      fork dari <a href="https://gitlab.com/DuarteSantos8/opengym" target="_blank" rel="noopener">openGym</a><br />
      data latihan: ExerciseDB (MIT) · diagram otot: MuscleMap (MIT)<br />
      {/* ATRIBUSI RepDB: ini term 2 lisensinya — "tautan terlihat", bukan sopan santun. Ilustrasi
          gerakan dipakai untuk latihan yang tercakup, dan dia menang atas foto karena aturan
          aurat di DESIGN.md. Jangan hapus; dijaga exercise-illustrations.test.ts. */}
      ilustrasi gerakan: <a href="https://repdb.co" target="_blank" rel="noopener">RepDB</a><br />
      {/* ATRIBUSI ODbL: ini SYARAT lisensi Open Food Facts, bukan sopan santun. Databasenya
          ODbL 1.0, isinya DbCL 1.0, dan turunan kami (`lib/food-retail.js`) ikut ODbL. Gambar
          produknya CC BY-SA 3.0 dan karena itu TIDAK PERNAH diambil. USDA FoodData Central
          domain publik (CC0) — atribusinya diminta, bukan diwajibkan, dan diberikan. Jangan
          hapus baris ini; dia dijaga tes. */}
      data makanan: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (ODbL 1.0) ·{' '}
      <a href="https://fdc.nal.usda.gov" target="_blank" rel="noopener">USDA FoodData Central</a> (domain publik)
    </div>
  </div>
}

// The whole point is that the two scales are one judgement counted from opposite ends, and a
// paragraph is a bad way to say that — the conversion table shows it in one look. Reading down
// a column is the answer to "what do I put here", so the numbers get their own aligned columns.
const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
// RIR 2 / RPE 8: the row a working set usually lands on — the anchor the others are read
// against. Not where the stepper starts; + walks up from the bottom of the scale.
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(close => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

function NotificationsCard({ S, update, toast }) {
  // Dua kartu yang benar-benar berbeda, bukan satu kartu dengan cabang: di build mobile
  // pengingatnya notifikasi lokal OS yang dijadwalkan per hari, di web yang ada cuma izin
  // notifikasi untuk alarm rest timer. Menyatukannya berarti satu komponen yang separuh
  // isinya selalu mati.
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <WebNotifCard />
}

// Mobile build: the reminder is a native local notification scheduled on planned weekdays —
// no push server involved. The schedule itself is (re)synced by the store on every persist;
// this card only owns the OS permission prompt when the switch turns on.
function MobileReminderCard({ S, update, toast }) {
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })
  const toggle = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
    }
    setReminder({ on })
  }
  return (
    <Section title={t('Notifications')}
      footer={S.reminder?.on ? t('Reminds you at this time on days that have a routine planned.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={!!S.reminder?.on} onChange={toggle} />
      </Row>
      {S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => setReminder({ time: e.target.value })} />
        </Row>
      )}
    </Section>
  )
}

// Build web: alarm rest timer adalah notifikasi LOKAL (lihat maybeRestNotification di
// store/useUI.js) — dia jalan tanpa server, dan yang dibutuhkan cuma izin browser. Jadi kartu
// ini cuma mengurus izin itu.
//
// Web Push DICABUT bersama lib/push.js. Dia butuh server yang menyimpan kunci VAPID dan
// mengirim pushnya, dan kita tidak punya. Lebih penting: satu-satunya hal yang dia tambahkan
// di atas notifikasi lokal adalah "walau app tertutup" untuk rest timer — dan itu persis yang
// dilarang aturan #2 CLAUDE.md, karena menambah titik gagal jaringan tepat di detik timer
// habis. Jadi mencabutnya bukan kemunduran; dia memang tidak boleh ada.
//
// Pengingat hari latihan di WEB memang belum ada: dia butuh penjadwal (Vercel Cron / pg_cron),
// dan itu pekerjaan tersendiri. Yang tidak dilakukan di sini adalah menampilkan sakelar yang
// tidak melakukan apa pun.
function WebNotifCard() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [perm, setPerm] = useState(() => (supported ? Notification.permission : 'unsupported'))

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  const ask = async () => {
    try { setPerm(await Notification.requestPermission()) } catch { /* ditolak browser */ }
  }

  return (
    <Section title={t('Notifications')}
      footer={t('Workout-day reminders come from the Android app for now.')}>
      <Row icon="bell" iconTint="var(--red)" title={t('Rest timer alert')}
        subtitle={perm === 'granted' ? t('On — shown when a rest finishes.')
          : perm === 'denied' ? t('Blocked in your browser settings.')
            : t('Off — a beep still plays while the app is open.')}
        accessory={perm === 'default' ? 'chevron' : undefined}
        onClick={perm === 'default' ? ask : undefined} />
    </Section>
  )
}

/**
 * Mode Ramadan dan mode puasa sunah.
 *
 * Bukan sakelar kosmetik: dia menyetel mesin progresi ke HOLD dan memangkas volume kerja. Yang
 * penting di UI ini adalah AKIBATNYA harus terbaca sebelum orang menyalakannya — sakelar yang
 * mengubah beban latihan tanpa mengatakan apa yang berubah adalah sakelar yang bikin orang
 * curiga pada app-nya.
 *
 * Deteksi tanggal Hijriah otomatis SENGAJA tidak ada. Awal Ramadan di Indonesia ditetapkan
 * sidang isbat Kemenag dan hisab bisa berbeda sehari; menyala sehari lebih awal berarti menahan
 * progresi di hari orang belum berpuasa, sehari lebih lambat berarti satu hari puasa dibaca
 * mesin sebagai kegagalan. Pemiliknya yang tahu, dan sakelarnya selalu benar.
 */
function RamadanCard({ S, update }) {
  const r = S.ramadan || DEF.ramadan
  const city = cityById(S.city || DEFAULT_CITY_ID)
  const now = new Date()
  const puasaHariIni = isFastingDay(r, now)
  const win = puasaHariIni ? fastingWindow(city, now) : null
  const set = patch => update(s => { s.ramadan = { ...(s.ramadan || DEF.ramadan), ...patch } })

  return (
    <Section title={t('Fasting')}
      footer={r.on || r.sunnah
        ? t('On a fasting day the weight holds — no increase, no deload — and work sets are trimmed. Warm-ups are left alone.')
        : t('Fasting lowers performance, and the progression engine reads that as failure. These switches stop it from deloading you for a month.')}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Ramadan mode')}
        subtitle={t('Every day: hold the weight, trim the volume.')}>
        <Switch checked={!!r.on} onChange={v => set({ on: v })} />
      </Row>
      {/* Mode sunah disembunyikan saat Ramadan menyala: di bulan itu SETIAP hari puasa, jadi
          sakelar "hanya Senin & Kamis" tidak mengubah apa pun dan cuma bikin bingung. */}
      {!r.on && (
        <Row icon="calendar" iconTint="var(--teal)" title={t('Sunnah fasting (Mon & Thu)')}
          subtitle={t('Same treatment, only on those two days — and a way to test all this before Ramadan.')}>
          <Switch checked={!!r.sunnah} onChange={v => set({ sunnah: v })} />
        </Row>
      )}
      {(r.on || r.sunnah) && (
        <Row icon="chartLine" iconTint="var(--orange)" title={t('Work sets kept')}>
          <Segmented
            className="seg-inline"
            options={[60, 65, 70, 80].map(v => ({ value: v, label: v + '%' }))}
            value={typeof r.volumeKeepPct === 'number' ? r.volumeKeepPct : 65}
            onChange={v => set({ volumeKeepPct: Number(v) })}
          />
        </Row>
      )}
      {win && (
        <Row icon="clock" iconTint="var(--acc)" title={t('Fasting today')}
          subtitle={t('{0} to {1} in {2}', fmtPrayer(win.from, city), fmtPrayer(win.to, city), city.name)} />
      )}
    </Section>
  )
}

/**
 * Kunci API pengguna untuk perkiraan gizi.
 *
 * KENAPA PENGGUNA MEMBAWA KUNCINYA SENDIRI, dan kenapa itu bukan cara mudah keluar dari
 * pekerjaan: repo ini TIDAK MENDISTRIBUSIKAN DATA MAKANAN SAMA SEKALI, dan itu satu-satunya
 * jawaban yang bersih atas jalan buntu lisensi yang tercatat di kepala lib/nutrition.ts. Nol
 * data yang dikirim berarti nol paparan lisensi.
 *
 * Konsekuensinya jujur dan harus dikatakan di layar ini, bukan disembunyikan di dokumentasi:
 * kuotanya milik pengguna, dan localStorage tidak terenkripsi.
 */
function AiCard({ toast }) {
  // Kunci hidup di luar `S` — dia TIDAK PERNAH masuk state yang disinkronkan, jadi dia tidak
  // bisa ikut terkirim ke Supabase. Karena itu dia juga butuh state React sendiri di sini:
  // useStore tidak akan pernah memberitahu kalau dia berubah.
  const [cfg, setCfg] = useState(() => loadAiConfig())

  const open = () => useUI.getState().openSheet(close => (
    <AiKeySheet close={close} toast={toast} onSaved={setCfg} />
  ))

  return (
    <Section title={t('AI estimates')}
      footer={cfg
        ? t('Requests go straight from this device to {0} with your key. Your quota, your bill — and we never see either.', PROVIDER_LABEL[cfg.provider])
        : t('Optional. With your own API key, the app can estimate calories and macros from a description like "nasi uduk satu porsi" — which is exactly what no free, commercially usable Indonesian food database gives us.')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Nutrition estimates')}
        subtitle={cfg ? PROVIDER_LABEL[cfg.provider] + ' · ' + maskKey(cfg.apiKey) : t('Not set up')}
        accessory="chevron" onClick={open} />
    </Section>
  )
}

function AiKeySheet({ close, toast, onSaved }) {
  const cur = loadAiConfig()
  const [provider, setProvider] = useState(cur?.provider || 'gemini')
  const [apiKey, setApiKey] = useState(cur?.apiKey || '')
  const [model, setModel] = useState(cur?.model || '')
  const [baseUrl, setBaseUrl] = useState(cur?.baseUrl || '')

  const save = () => {
    if (!apiKey.trim()) { toast(t('Paste your API key first.')); return }
    const ok = saveAiConfig({ provider, apiKey, model, baseUrl: provider === 'openai' ? baseUrl : '' })
    if (!ok) { toast(t('This browser will not let the app store anything.')); return }
    onSaved(loadAiConfig())
    toast(t('Saved'))
    close()
  }

  // Tanpa toast: barisnya langsung berubah jadi "Belum disiapkan", dan itu umpan balik yang
  // lebih jelas daripada pesan yang muncul lalu hilang.
  const remove = () => { clearAiConfig(); onSaved(null); close() }

  return <>
    <h3>{t('AI estimates')}</h3>
    <p className="muted small" style={{ marginBottom: 12 }}>
      {t('A free key from Google AI Studio is enough for everyday use.')}{' '}
      <a href={FREE_KEY_URL} target="_blank" rel="noopener">{t('Get a free key')}</a>
    </p>

    {/* Dua BENTUK API, bukan daftar merek — "OpenAI-compatible" menutup OpenRouter, Groq,
        Together, Mistral, dan Ollama lokal tanpa satu baris kode tambahan. */}
    <Segmented
      options={[
        { value: 'gemini', label: PROVIDER_LABEL.gemini },
        { value: 'openai', label: PROVIDER_LABEL.openai },
      ]}
      value={provider} onChange={setProvider} />

    <div style={{ height: 10 }} />
    {/* type="password" supaya kunci tidak terbaca dari balik punggung atau di screen sharing.
        autoComplete off: pengelola sandi tidak punya urusan di sini, dan tawaran "simpan
        sandi" atas kunci API cuma membingungkan. */}
    <TextField type="password" autoComplete="off" spellCheck={false}
      placeholder={t('API key')} value={apiKey} onChange={e => setApiKey(e.target.value)} />

    <div style={{ height: 10 }} />
    <TextField placeholder={t('Model (optional) — default {0}', DEFAULT_MODEL[provider])}
      autoComplete="off" spellCheck={false}
      value={model} onChange={e => setModel(e.target.value)} />

    {provider === 'openai' && <>
      <div style={{ height: 10 }} />
      <TextField placeholder={t('Endpoint (optional) — default api.openai.com')}
        autoComplete="off" spellCheck={false} inputMode="url"
        value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
    </>}

    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
    {cur && <>
      <div style={{ height: 8 }} />
      <Button variant="ghost" className="dim" onClick={remove}>{t('Remove')}</Button>
    </>}

    {/* Dikatakan, bukan didiamkan. Di web tidak ada padanan Keychain — tidak ada penyimpanan
        yang bisa dibaca halaman tapi tidak bisa dibaca skrip yang jalan di halaman itu. */}
    <p className="sect-f" style={{ marginTop: 14 }}>
      {t('The key is stored on this device only, unencrypted, and is never synced or sent to us. Anyone with access to this browser profile can read it.')}
    </p>
  </>
}

// Equipment profiles ("Home", "Gym", ...) — each an id/name/eq-list; the active one filters
// the Library, exercise picker, and flags routine entries that need something outside it
// (see lib/equipment.js). Purely local/synced state — no server changes needed.
function EquipmentCard({ S, update }) {
  const profiles = S.equipProfiles || []
  const remove = p => confirmSheet({
    title: t('Delete profile?'), message: t('"{0}" and its equipment list will be removed.', p.name),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => update(s => {
      s.equipProfiles = (s.equipProfiles || []).filter(x => x.id !== p.id)
      if (s.activeEquipId === p.id) s.activeEquipId = (s.equipProfiles[0] && s.equipProfiles[0].id) || null
    }),
  })
  return <Section title={t('Equipment')} footer={t('Filters the exercise library and picker, and flags routine exercises that need something you don’t have in the active profile.')}>
    {profiles.length > 0 && <Row icon="dumbbell" iconTint="var(--acc)" title={t('Filter by equipment')}>
      <Switch checked={!!S.equipFilterOn} onChange={v => update(s => { s.equipFilterOn = v })} />
    </Row>}
    {profiles.length > 0 && <SelectRow icon="list" iconTint="var(--blue)" title={t('Active profile')}
      value={S.activeEquipId || ''} onChange={v => update(s => { s.activeEquipId = v })}
      options={profiles.map(p => ({ value: p.id, label: p.name }))} />}
    {profiles.map(p => (
      <Row key={p.id} icon="dumbbell" iconTint="var(--teal)" title={p.name}
        subtitle={t(p.equipment.length === 1 ? '{0} equipment type' : '{0} equipment types', p.equipment.length)} accessory="chevron"
        onClick={() => equipmentProfileSheet(p)}>
        <button className="iconbtn" aria-label={t('Delete')} onClick={ev => { ev.stopPropagation(); remove(p) }}><Icon name="trash" /></button>
      </Row>
    ))}
    <Row icon="plus" iconTint="var(--acc)" title={t('Add equipment profile')} accessory="chevron" onClick={() => equipmentProfileSheet(null)} />
  </Section>
}

// Magic link, dari Pengaturan. Sheet-nya TIDAK ditutup sendiri setelah terkirim: langkah
// berikutnya ada di aplikasi email, dan sheet yang menutup diri membuat orang bertanya-tanya
// apakah tadi berhasil.
function EmailInline({ close, toast }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    if (!looksLikeEmail(email)) { toast(t('Enter a valid email address')); return }
    setBusy(true)
    try { await signInWithEmail(email); setSent(true) }
    catch (e) { toast(e?.message || t('Could not send the link')) }
    finally { setBusy(false) }
  }

  if (sent) return <>
    <h3>{t('Check your email')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('A sign-in link is on its way to {0}. Open it on this device — the link signs you in here.', email.trim())}
    </div>
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
  </>

  return <>
    <h3>{t('Sign in with email')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('No password. We send a link — opening it signs you in.')}</div>
    <TextField type="email" placeholder="you@example.com" maxLength={120}
      value={email} onChange={e => setEmail(e.target.value)} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go} disabled={busy}>{busy ? t('Sending…') : t('Send the link')}</Button>
  </>
}
