import { useEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'

/** Yang dihitung sebagai perhentian tab di dalam lembar. */
const FOKUSABEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),'
  + 'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// One bottom sheet (or centered dialog) with swipe-to-dismiss.
function Sheet({ sheet, isTop }) {
  const { closeSheet } = useUI()
  const ref = useRef(null)
  const panelRef = useRef(null)
  const pemicu = useRef(null)
  const drag = useRef({ startY: null, delta: 0 })

  /**
   * TIGA HAL YANG HILANG DARI LEMBAR INI, dan semuanya standar untuk dialog modal.
   *
   * Diukur di app hidup sebelum diperbaiki: membuka lembar meninggalkan fokus pada PEMICUNYA di
   * belakang overlay, dan **51 elemen di belakang overlay masih bisa di-Tab** — jadi pemakai
   * keyboard berjalan ke kontrol yang tertutup dan tidak bisa dilihatnya. Escape sudah bekerja
   * sejak awal; yang tidak ada adalah masuknya, terperangkapnya, dan kembalinya.
   *
   *   1. Fokus MASUK ke panelnya, bukan ke kontrol pertamanya: panel yang difokus membuat
   *      pembaca layar menyebut "dialog" lalu membaca dari judulnya, sementara melompat ke
   *      kontrol pertama melewati judul itu.
   *   2. Fokus tidak boleh keluar lewat Tab — lihat `onKeyDown`.
   *   3. Fokus KEMBALI ke pemicunya saat lembar ditutup. Tanpa itu orang kehilangan tempatnya:
   *      Tab berikutnya mulai dari awal halaman.
   *
   * `panel.contains(document.activeElement)` itu penjaga yang wajib: dua lembar
   * (`AiFoodSheet`, `FoodDbSheet`) meng-`autoFocus` kolomnya sendiri, dan memindahkan fokus ke
   * panel akan merampasnya — orang mengetuk "Database" lalu mengetik ke tempat yang salah.
   */
  useEffect(() => {
    pemicu.current = document.activeElement
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      const t = pemicu.current
      if (t && document.contains(t) && typeof t.focus === 'function') t.focus()
    }
  }, [])

  /**
   * Perangkap Tab. Tidak butuh `isTop`: peristiwanya berasal dari dalam panel teratas, dan
   * panel di bawahnya bukan leluhurnya — jadi handler lembar bawah tidak pernah ikut jalan.
   */
  const onKeyDown = e => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const f = [...panel.querySelectorAll(FOKUSABEL)].filter(el => el.offsetParent !== null)
    if (!f.length) { e.preventDefault(); panel.focus(); return }
    const pertama = f[0], terakhir = f[f.length - 1]
    const aktif = document.activeElement
    if (e.shiftKey && (aktif === pertama || aktif === panel)) { e.preventDefault(); terakhir.focus() }
    else if (!e.shiftKey && aktif === terakhir) { e.preventDefault(); pertama.focus() }
  }

  const onTouchStart = e => {
    const el = ref.current
    // a gesture that begins on a slider (or opted-out control) belongs to that control,
    // not to the sheet's swipe-to-dismiss — so it keeps working while you drag
    if (e.target.closest && e.target.closest('input[type=range], [data-nodrag]')) {
      drag.current = { startY: null, delta: 0 }
      return
    }
    drag.current = { startY: el.scrollTop <= 0 ? e.touches[0].clientY : null, delta: 0 }
  }
  const onTouchMove = e => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    d.delta = e.touches[0].clientY - d.startY
    if (d.delta > 0 && el.scrollTop <= 0) {
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.delta}px)`
    } else d.delta = 0
  }
  const onTouchEnd = () => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    el.style.transition = 'transform .2s'
    if (d.delta > 90 && !sheet.locked) { el.style.transform = 'translateY(110%)'; setTimeout(() => closeSheet(sheet.id), 180) }
    else el.style.transform = ''
    d.startY = null
  }
  // Mouse drag (desktop testing / trackpads): same swipe-to-dismiss behaviour.
  const onMouseDown = e => {
    if (e.button !== 0) return
    if (e.target.closest && e.target.closest('input[type=range], [data-nodrag]')) {
      drag.current = { startY: null, delta: 0 }
      return
    }
    const el = ref.current
    drag.current = { startY: el.scrollTop <= 0 ? e.clientY : null, delta: 0 }
  }
  const onMouseMove = e => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    d.delta = e.clientY - d.startY
    if (d.delta > 0 && el.scrollTop <= 0) {
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.delta}px)`
    } else d.delta = 0
  }
  const onMouseUp = () => onTouchEnd()

  // non-passive touchmove so preventDefault works (bottom sheets only; centered dialogs have no ref)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const close = () => closeSheet(sheet.id)
  if (sheet.kind === 'center') {
    return (
      <div>
        <div className="mback" onClick={() => { if (!sheet.locked) close() }} />
        {/* `aria-modal` cuma di lembar TERATAS: dua dialog yang sama-sama mengaku modal adalah
            pernyataan yang saling bertentangan, dan yang di bawah memang tidak modal lagi. */}
        <div className="center" ref={panelRef} tabIndex={-1} role="dialog"
          aria-modal={isTop ? 'true' : undefined} onKeyDown={onKeyDown}>{sheet.render(close)}</div>
      </div>
    )
  }
  return (
    <div>
      <div className="mback" onClick={() => { if (!sheet.locked) close() }} />
      <div className="sheet" ref={el => { ref.current = el; panelRef.current = el }}
        tabIndex={-1} role="dialog" aria-modal={isTop ? 'true' : undefined} onKeyDown={onKeyDown}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <div className="grab" />
        {sheet.render(close)}
      </div>
    </div>
  )
}

export default function Modals() {
  const sheets = useUI(s => s.sheets)
  const closeSheet = useUI(s => s.closeSheet)
  const prevLen = useRef(0)
  const suppressPop = useRef(false)
  const pushedEntries = useRef(0)
  const sheetEntries = useRef([])

  // Every opened sheet gets a history entry so Android back dismisses it instead of
  // leaving the page (issue #63). Keep the pushed-entry count and each active sheet's
  // live-entry status explicit: sheet count cannot tell whether popstate already spent
  // an entry (especially for a locked sheet) or whether several sheets opened at once.
  useEffect(() => {
    const prev = prevLen.current
    prevLen.current = sheets.length
    if (sheets.length > prev) {
      for (let i = prev; i < sheets.length; i++) {
        sheetEntries.current.push({ openedAt: location.href, live: true })
        history.pushState({ openGymSheet: true }, '')
        pushedEntries.current++
      }
    } else if (sheets.length < prev) {
      const closedEntries = sheetEntries.current.splice(sheets.length, prev - sheets.length)
      const rewind = closedEntries.filter(entry =>
        entry.live && !(typeof entry.openedAt === 'string' && location.href !== entry.openedAt)).length
      if (rewind > 0) {
        pushedEntries.current = Math.max(0, pushedEntries.current - rewind)
        suppressPop.current = true
        history.go(-rewind)
      }
      // Entries skipped because the app moved on remain in pushedEntries as deliberate
      // leaks until a later popstate consumes them with no corresponding active sheet.
    }
  }, [sheets.length])

  useEffect(() => {
    const onPop = () => {
      if (suppressPop.current) { suppressPop.current = false; return }
      if (pushedEntries.current <= 0) return
      pushedEntries.current--
      // The browser has already spent one pushed entry. Mark the latest live active
      // sheet entry spent even when the sheet is locked; with no active entry this is a
      // moved-on leak, which is still accounted for by the counter decrement above.
      for (let i = sheetEntries.current.length - 1; i >= 0; i--) {
        if (sheetEntries.current[i].live) {
          sheetEntries.current[i].live = false
          break
        }
      }
      const top = sheets[sheets.length - 1]
      if (top && !top.locked) closeSheet(top.id)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [sheets, closeSheet])

  // lock the page behind any open sheet (iOS-safe)
  useEffect(() => {
    if (!sheets.length) return
    const onKey = e => { if (e.key === 'Escape') { const top = useUI.getState().sheets[useUI.getState().sheets.length - 1]; if (top && !top.locked) useUI.getState().closeSheet(top.id) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheets.length])
  useEffect(() => {
    if (!sheets.length) return
    const y = window.scrollY || 0
    const b = document.body.style
    b.position = 'fixed'; b.top = -y + 'px'; b.left = '0'; b.right = '0'; b.width = '100%'
    return () => {
      b.position = b.top = b.left = b.right = b.width = ''
      window.scrollTo(0, y)
    }
  }, [sheets.length > 0])

  if (!sheets.length) return null
  return (
    <div id="modal-root" className="open">
      {sheets.map((s, i) => <Sheet key={s.id} sheet={s} isTop={i === sheets.length - 1} />)}
    </div>
  )
}
