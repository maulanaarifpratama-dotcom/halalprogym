// Layar masuk — Google OAuth + magic link email, di atas Supabase Auth.
//
// Alur passkey upstream dicabut: passkey terikat ke domain (RP_ID), jadi dia tidak berlaku di
// preview deployment Vercel dan mustahil dari dalam WebView APK. Alasan lengkapnya di kepala
// lib/auth.ts.
//
// SATU ATURAN YANG MENGATUR SELURUH BERKAS INI: jangan menawarkan jalan yang mustahil.
//
// App ini pernah melakukannya — layar masuk menawarkan "Masuk dengan passkey" ke server yang
// sudah dihapus, dan Pengaturan menawarkan "Sambungkan ke server saya" ke produk yang bukan
// self-host. Orang mengetuknya.
//
// Cara aturan itu diterapkan di sini: build tanpa kredensial Supabase TIDAK PERNAH sampai ke
// layar ini sama sekali — boot() masuk sebagai tamu. Jadi tombol-tombol di bawah selalu bisa
// dipakai, dan tidak ada cabang "seandainya tidak bisa" yang perlu ditulis. Lihat catatan di
// atas komponen Login untuk sisi sebaliknya: UI yang tak terjangkau juga masalah.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { looksLikeEmail, signInWithEmail, signInWithGoogle } from '../lib/auth.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function EmailSheet({ close }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const go = async () => {
    if (!looksLikeEmail(email)) { useUI.getState().toast(t('Enter a valid email address')); return }
    setBusy(true)
    try {
      await signInWithEmail(email)
      setSent(true)
    } catch (e) {
      useUI.getState().toast(e?.message || t('Could not send the link'))
    } finally { setBusy(false) }
  }

  // Setelah terkirim, sheet-nya TIDAK ditutup: satu-satunya langkah berikutnya ada di aplikasi
  // email, dan menutup sheet membuat orang bertanya-tanya apakah tadi berhasil.
  if (sent) return <>
    <h3>{t('Check your email')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('A sign-in link is on its way to {0}. Open it on this device — the link signs you in here.', email.trim())}
    </div>
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
  </>

  return <>
    <h3>{t('Sign in with email')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>
      {t('No password. We send a link — opening it signs you in.')}
    </div>
    <input className="input" type="email" inputMode="email" autoComplete="email"
      placeholder="you@example.com" maxLength={120} value={email}
      onChange={e => setEmail(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') go() }} />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go} disabled={busy}>
      {busy ? t('Sending…') : t('Send the link')}
    </Button>
  </>
}

// Layar ini cuma tampil kalau masuk-dengan-akun MUNGKIN.
//
// Tanpa kredensial Supabase, boot() langsung masuk sebagai tamu (lihat useStore.boot) — dan itu
// keputusan sadar: layar masuk yang satu-satunya tombolnya "Lanjut tanpa akun" bukan pilihan,
// cuma pengganjal. Konsekuensinya cabang "tanpa sinkronisasi" di sini TIDAK ADA, karena dia
// tidak akan pernah terjangkau; kalimat jujurnya hidup di baris Pengaturan, tempat orang
// benar-benar mencarinya.
//
// Ini sisi lain dari aturan yang sama: jangan menawarkan jalan yang mustahil, DAN jangan
// menulis UI yang tidak bisa dijangkau.
export default function Login() {
  const setGuest = useStore(s => s.setGuest)

  const google = async () => {
    try { await signInWithGoogle() }
    catch (e) { useUI.getState().toast(e?.message || t('Sign-in failed')) }
  }

  const head = <>
    <div style={{ fontSize: 54, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="dumbbell" /></div>
    <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.028em', margin: '10px 0 4px' }}>Halal Pro Gym</h1>
  </>
  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '78vh', textAlign: 'center' }

  // Build demo: tidak ada yang bisa dimasuki — jalan satu-satunya profil tamu lokal.
  if (DEMO) return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
      <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
        {t('This demo runs entirely in your browser on example data — nothing is sent anywhere.')}
      </div>
      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <a href={REPO} target="_blank" rel="noopener">{t('free & open source (AGPL v3)')}</a>
      </div>
    </div>
  )

  return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 34 }}>{t('Your workouts. Your weights. Your profile.')}</div>

      <Button variant="primary" icon="person" onClick={google}>{t('Continue with Google')}</Button>
      <div style={{ height: 10 }} />
      <Button icon="mail" onClick={() => useUI.getState().openSheet(close => <EmailSheet close={close} />)}>
        {t('Sign in with email')}
      </Button>
      <div style={{ height: 10 }} />

      <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>

      <div className="dim small" style={{ marginTop: 26, lineHeight: 1.5 }}>
        {t('Signing in only syncs your data — your workouts stay yours.')}<br />
        {t('Guest data stays on this device — export a backup now and then!')}
      </div>
    </div>
  )
}
