import { useEffect, useRef, useState } from 'react'
import { fmtVol, fmtDate, isoOf, todayISO, MONTHS } from '../lib/format.js'
import { t } from '../lib/i18n.js'

/**
 * Heatmap aktivitas 12 bulan, digelapkan menurut lama dilatih per hari.
 *
 * KEYBOARD: SATU tab stop, panah bergerak antar hari yang DILATIH.
 *
 * Sebelum 2026-09-02 setiap sel berisi adalah `<div onClick>`, jadi grafik ini tidak bisa
 * dijangkau keyboard sama sekali. Itu tercatat sebagai pengecualian jujur di
 * `list-rows.test.ts` dengan alasan yang masih berlaku: menjadikan 371 sel jadi tab stop akan
 * MEMPERBURUK keyboard, bukan memperbaikinya — pemakainya harus menekan Tab ratusan kali untuk
 * melewati satu grafik.
 *
 * Yang menutupnya roving tabindex, dan modelnya sengaja **KRONOLOGIS, bukan spasial**:
 *
 *   · cuma hari yang punya sesi yang bisa difokus, jadi setiap yang bisa difokus BISA DITEKAN.
 *     Sel kosong tetap `<div>` tanpa handler — tombol yang tidak melakukan apa-apa lebih buruk
 *     daripada bukan tombol.
 *   · panah maju/mundur di antara hari-hari itu dalam urutan waktu. Home/End ke sesi pertama
 *     dan terakhir.
 *   · `role="grid"` SENGAJA TIDAK dipakai. Pola grid ARIA menuntut Kiri/Kanan bergerak di dalam
 *     satu baris dan Atas/Bawah antar baris — dan di sini DOM-nya kolom-mayor (satu `.hm-col`
 *     adalah satu PEKAN, dirender vertikal). Jadi mengaku grid berarti salah satu dari dua hal:
 *     tombol panah yang terasa terbalik dari yang dilihat mata, atau kontrak ARIA yang
 *     dilanggar. Nama per-sel ("Rab, 2 Sep 2026 · 1 sesi · 45 mnt · 7.350 kg") membawa lebih
 *     banyak informasi daripada "baris 3 kolom 12", jadi tidak ada yang hilang.
 *
 * Datanya juga TIDAK terkunci di sini: layar Riwayat memuat setiap sesi sebagai baris tombol.
 * Grafik ini jalan pintas, dan sekarang jalan pintasnya punya padanan keyboard.
 */
export default function Heatmap({ S, onDay }) {
  const wrapRef = useRef(null)
  const cellRefs = useRef({})
  // Kursor menyusul perubahan data: kalau sesi terakhir berubah, `null` membuat kursor jatuh
  // ke hari terakhir yang dilatih tanpa perlu efek penyelaras.
  const [cursor, setCursor] = useState(null)
  const pindah = useRef(false)

  useEffect(() => { if (wrapRef.current) wrapRef.current.scrollLeft = wrapRef.current.scrollWidth }, [])

  const agg = {}
  S.workouts.forEach(w => {
    const a = agg[w.d] = agg[w.d] || { n: 0, vol: 0, min: 0 }
    a.n++; a.vol += w.vol || 0
    a.min += Math.max(0, Math.round(((w.end || w.start) - w.start) / 60000))
  })
  const mins = Object.values(agg).map(a => a.min).filter(v => v > 0).sort((a, b) => a - b)
  const q = p => (mins.length ? mins[Math.min(mins.length - 1, Math.floor(p * mins.length))] : 0)
  const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75)
  const level = a => !a ? 0 : !a.min ? 1 : a.min >= t3 ? 4 : a.min >= t2 ? 3 : a.min >= t1 ? 2 : 1

  const today = new Date(); today.setHours(12, 0, 0, 0)
  // Ahad-nya minggu ini, sejalan dengan startOfWeek di format.ts. Kalau heatmap berbasis
  // Senin sementara sisa app berbasis Ahad, kolomnya bergeser satu hari dari strip Home.
  const end = new Date(today); end.setDate(today.getDate() - today.getDay())
  const start = new Date(end); start.setDate(end.getDate() - 52 * 7)

  // Hari yang dilatih DAN masuk rentang yang digambar, urut waktu. Ini urutan navigasinya.
  const aktif = Object.keys(agg).filter(k => k >= isoOf(start) && k <= isoOf(today)).sort()
  const kursor = cursor && aktif.includes(cursor) ? cursor : (aktif[aktif.length - 1] || null)

  // Fokus dipindah SETELAH render, dan cuma kalau perpindahannya dari keyboard: memanggil
  // focus() pada mount akan merampas fokus dari mana pun pengguna berada.
  useEffect(() => {
    if (!pindah.current) return
    pindah.current = false
    const el = cellRefs.current[kursor]
    if (el) { el.focus(); el.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
  }, [kursor])

  const geser = (dari, delta) => {
    const i = aktif.indexOf(dari)
    if (i < 0) return
    const j = Math.max(0, Math.min(aktif.length - 1, i + delta))
    if (j === i) return
    pindah.current = true
    setCursor(aktif[j])
  }

  const onKey = (e, key) => {
    // Atas/Bawah dipetakan ke langkah yang sama dengan Kiri/Kanan, bukan ke lompatan pekan:
    // urutannya kronologis, dan "hari berikutnya yang dilatih" adalah satu-satunya langkah yang
    // punya arti di sini.
    const langkah = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (langkah) { e.preventDefault(); geser(key, langkah); return }
    if (e.key === 'Home') { e.preventDefault(); pindah.current = true; setCursor(aktif[0]); return }
    if (e.key === 'End') { e.preventDefault(); pindah.current = true; setCursor(aktif[aktif.length - 1]) }
  }

  const months = [], cols = []
  let lastMonth = -1
  for (let wk = 0; wk <= 52; wk++) {
    const colStart = new Date(start); colStart.setDate(start.getDate() + wk * 7)
    const mo = colStart.getMonth()
    const showM = mo !== lastMonth && colStart.getDate() <= 7 && wk < 51
    months.push(<span key={wk}>{showM ? t(MONTHS[mo]) : ''}</span>)
    if (colStart.getDate() <= 7) lastMonth = mo
    const cells = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(colStart); day.setDate(colStart.getDate() + d)
      const key = isoOf(day)
      const a = agg[key]
      const cls = 'hm-c l' + level(a) + (key === todayISO() ? ' today' : '') + (day > today ? ' future' : '')
      // Tanggalnya diformat, bukan ISO mentah: judul ini yang dibaca orang, dan
      // "Rab, 2 Sep 2026" terbaca sementara "2026-09-02" harus diterjemahkan sendiri.
      const ringkas = a
        ? fmtDate(key, true, true) + ' · ' + t(a.n === 1 ? '{0} workout' : '{0} workouts', a.n)
          + ' · ' + t('{0} min', a.min) + ' · ' + fmtVol(a.vol, S.unit)
        : fmtDate(key, true, true)
      cells.push(a
        // Cuma hari BERISI yang jadi tombol — lihat catatan roving tabindex di kepala berkas.
        ? <button key={d} type="button" className={cls} ref={el => { cellRefs.current[key] = el }}
          title={ringkas} aria-label={ringkas}
          tabIndex={key === kursor ? 0 : -1}
          onKeyDown={e => onKey(e, key)}
          onClick={() => { setCursor(key); onDay(key) }} />
        : <div key={d} className={cls} title={ringkas} />)
    }
    cols.push(<div key={wk} className="hm-col">{cells}</div>)
  }

  return <>
    <div className="hm-wrap" ref={wrapRef}>
      <div className="hm-months" style={{ marginLeft: 30 }}>{months}</div>
      <div className="hm-body">
        <div className="hm-days"><span>{t('Mon')}</span><span /><span>{t('Wed')}</span><span /><span>{t('Fri')}</span><span /><span /></div>
        <div className="hm-grid" role="group" aria-label={t('Activity — last 12 months')}>{cols}</div>
      </div>
    </div>
    <div className="hm-legend">{t('Less time')} <div className="hm-c l0" /><div className="hm-c l1" /><div className="hm-c l2" /><div className="hm-c l3" /><div className="hm-c l4" /> {t('More time')}</div>
  </>
}
