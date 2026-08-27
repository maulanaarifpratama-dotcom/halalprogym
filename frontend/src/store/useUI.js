import { create } from 'zustand'
import { uid } from '../lib/format.js'
import { beep, vibrate } from '../lib/sound.js'
import { t } from '../lib/i18n.js'
import { useStore } from './useStore.js'

// REST TIMER TIDAK PAKAI SERVER PUSH — aturan #2 CLAUDE.md, dan dulu di sini memang ada
// pelanggarannya: dua panggilan ke /api/push/rest-timer yang meminta server mengirim alarm
// "istirahat habis" kalau tab-nya ke-suspend. Itu mustahil di Vercel serverless (tidak ada
// state antar-request untuk setTimeout upstream) DAN menambah titik gagal jaringan tepat di
// detik timer habis — saat orang sedang menunggunya.
//
// Penggantinya: timer lokal (di berkas ini) + Capacitor local notification untuk build APK.
// Keduanya jalan tanpa jaringan sama sekali. Jangan hidupkan ulang panggilan server dalam
// bentuk apa pun.

const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
let requestRestNotificationPermissionP = null

const requestRestNotificationPermission = async () => {
  if (!notificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  if (!requestRestNotificationPermissionP) {
    requestRestNotificationPermissionP = Notification.requestPermission()
      .then(perm => perm === 'granted')
      .catch(() => false)
      .finally(() => {
        requestRestNotificationPermissionP = null
      })
  }
  return requestRestNotificationPermissionP
}

const maybeRestNotification = async () => {
  if (!notificationsSupported()) return
  if (!document.hidden && document.visibilityState !== 'hidden') return
  if (Notification.permission !== 'granted' && !(await requestRestNotificationPermission())) return
  try {
    // Android Chrome forbids the Notification constructor (Illegal constructor) - the
    // service-worker registration path is the one that actually pops there.
    const reg = await navigator.serviceWorker?.getRegistration?.()
    if (reg?.showNotification) {
      reg.showNotification(t('Rest over — next set!'), { body: t('Rest over — next set!') })
      return
    }
    new Notification(t('Rest over — next set!'), { body: t('Rest over — next set!') })
  } catch {
    // Intentionally ignore: notification APIs vary by browser and policy in edge cases.
  }
}

let toastTm = null
let timerInt = null
let timerTick = null
let workInt = null
let workTick = null
let workDone = null

export const useUI = create((set, get) => ({
  sheets: [],          // { id, render:(close)=>JSX, kind:'sheet'|'center', locked }
  toastMsg: '',
  timer: null,         // rest countdown between sets — { left, total, endsAt }
  work: null,          // work countdown DURING a timed set (issue #16) — { left, total, endsAt, label }

  openSheet(render, { kind = 'sheet', locked = false } = {}) {
    const id = uid()
    set(s => ({ sheets: [...s.sheets, { id, render, kind, locked }] }))
    const close = () => get().closeSheet(id)
    return { id, close, lock: v => set(s => ({ sheets: s.sheets.map(x => x.id === id ? { ...x, locked: v } : x) })) }
  },
  closeSheet(id) { set(s => ({ sheets: s.sheets.filter(x => x.id !== id) })) },
  closeAll() { set({ sheets: [] }) },

  toast(msg) {
    set({ toastMsg: msg })
    clearTimeout(toastTm)
    toastTm = setTimeout(() => set({ toastMsg: '' }), 2200)
  },

  startRest(sec) {
    get().stopRest()
    // Rest timer set to Off. Stopping and returning rather than starting a zero-length timer
    // keeps every caller honest: the four places that start a rest do not each need to know.
    if (!(sec > 0)) return
    const endsAt = Date.now() + sec * 1000
    set({ timer: { left: sec, total: sec, endsAt } })
    requestRestNotificationPermission()
    timerTick = () => {
      const tm = get().timer
      if (!tm) return
      const left = Math.max(0, Math.round((tm.endsAt - Date.now()) / 1000))
      if (left === tm.left) return
      const snd = useStore.getState().S.sound
      if (left <= 0) {
        beep(snd, 880, 0.15); beep(snd, 880, 0.15, 0.25); beep(snd, 1320, 0.4, 0.5)
        vibrate([200, 100, 200]); maybeRestNotification(); get().toast(t('Rest over — next set!')); get().stopRest(); return
      }
      if (left <= 3) beep(snd, 660, 0.1)
      set({ timer: { ...tm, left } })
    }
    timerInt = setInterval(timerTick, 1000)
    document.addEventListener('visibilitychange', timerTick)
  },
  addRest(sec) {
    const tm = get().timer
    if (!tm) return
    const left = tm.left + sec
    // taking off more than is left means "I'm ready now" — same as skipping, and it keeps a
    // negative duration out of the progress bar
    if (left <= 0) { get().stopRest(); return }
    set({ timer: { ...tm, left, total: tm.total + sec, endsAt: tm.endsAt + sec * 1000 } })
  },
  stopRest() {
    if (timerInt) clearInterval(timerInt); timerInt = null
    if (timerTick) document.removeEventListener('visibilitychange', timerTick); timerTick = null
    set({ timer: null })
  },

  /* ---- work timer (issue #16) ----
     Times the set itself, not the recovery after it. Kept separate from the rest timer on
     purpose: the two mean opposite things, they must never run together, and a work set is
     something you are watching — so it gets no server push (that endpoint says "rest over",
     and a plank does not need a notification you are staring at anyway).
     `onDone(elapsedSec)` is called both when the countdown reaches zero and on an early
     finish; the elapsed time is what actually gets logged, so stopping at 0:38 of a 0:45
     hold records 0:38 rather than crediting the full target. */
  startWork(sec, label, onDone) {
    get().stopWork()
    get().stopRest()
    const total = Math.max(1, Math.round(sec) || 1)
    const endsAt = Date.now() + total * 1000
    workDone = onDone
    set({ work: { left: total, total, endsAt, label } })
    workTick = () => {
      const wk = get().work
      if (!wk) return
      const left = Math.max(0, Math.round((wk.endsAt - Date.now()) / 1000))
      if (left === wk.left) return
      const snd = useStore.getState().S.sound
      if (left <= 0) {
        beep(snd, 880, 0.15); beep(snd, 880, 0.15, 0.25); beep(snd, 1320, 0.4, 0.5)
        vibrate([200, 100, 200])
        const done = workDone
        get().stopWork()
        if (done) done(wk.total)
        return
      }
      if (left <= 3) beep(snd, 660, 0.1)
      set({ work: { ...wk, left } })
    }
    workInt = setInterval(workTick, 1000)
    document.addEventListener('visibilitychange', workTick)
  },
  // Ended the hold early — log what was actually held.
  finishWorkEarly() {
    const wk = get().work
    if (!wk) return
    const elapsed = Math.max(1, wk.total - wk.left)
    const done = workDone
    vibrate(30)
    get().stopWork()
    if (done) done(elapsed)
  },
  // Abandon without logging anything.
  stopWork() {
    if (workInt) clearInterval(workInt); workInt = null
    if (workTick) document.removeEventListener('visibilitychange', workTick); workTick = null
    workDone = null
    set({ work: null })
  }
}))
