import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  CALLBACK_HOST, DEEP_LINK_SCHEME, NATIVE_REDIRECT, oauthRoute, parseCallback,
} from './oauth.js'
import capacitor from '../../capacitor.config.json'

/**
 * Deep link datang dari LUAR app — dari Android, atas nama browser — jadi isinya data yang tidak
 * dipercaya. Berkas ini menguji dua hal yang benar-benar bisa salah tanpa perangkat: keputusan
 * jalur, dan pembacaan URL yang kembali.
 */
describe('oauthRoute', () => {
  it('native memakai browser sistem, web memakai redirect biasa', () => {
    // Google MEMBLOKIR OAuth di WebView tersemat. Di native, redirect biasa berarti WebView-nya
    // yang jalan, dan orang berakhir di halaman penolakan Google.
    expect(oauthRoute(true)).toBe('system-browser')
    expect(oauthRoute(false)).toBe('redirect')
  })
})

describe('parseCallback — menerima callback kita', () => {
  it('membaca kode PKCE dari query', () => {
    expect(parseCallback('id.halalpro.gym://auth-callback?code=abc123'))
      .toEqual({ code: 'abc123' })
  })

  it('mengabaikan parameter lain yang menempel', () => {
    expect(parseCallback('id.halalpro.gym://auth-callback?code=abc123&state=xyz'))
      .toEqual({ code: 'abc123' })
  })

  it('membaca error dan penjelasannya apa adanya', () => {
    // Penjelasan dari provider ditampilkan, bukan ditebak: "gagal" tanpa sebab membuat orang
    // mencoba ulang hal yang sama.
    expect(parseCallback(
      'id.halalpro.gym://auth-callback?error=access_denied&error_description=User+declined'
    )).toEqual({ error: 'access_denied', errorDescription: 'User declined' })
  })

  it('membaca error dari FRAGMEN juga', () => {
    // Alur implicit menaruhnya di sana, dan error yang hilang berarti orang menatap layar yang
    // tidak berubah sama sekali.
    expect(parseCallback('id.halalpro.gym://auth-callback#error=server_error'))
      .toEqual({ error: 'server_error', errorDescription: undefined })
  })

  it('error MENGALAHKAN kode kalau keduanya ada', () => {
    // Kalau provider mengirim keduanya, yang benar adalah menampilkan penolakannya — menukar
    // kode yang datang bersama error menghasilkan kegagalan dengan pesan yang menyesatkan.
    expect(parseCallback('id.halalpro.gym://auth-callback?code=x&error=access_denied'))
      .toMatchObject({ error: 'access_denied' })
  })
})

describe('parseCallback — MENOLAK yang bukan callback kita', () => {
  it('skema lain ditolak, walau host-nya sama', () => {
    // Ini yang penting: https://auth-callback punya host yang sama, dan dia bisa datang dari
    // tautan web mana pun. Menukar "kode" dari URL sembarang berarti menyerahkan alur masuk ke
    // siapa pun yang bisa membuat tautan.
    expect(parseCallback('https://auth-callback/?code=jahat')).toBe(null)
    expect(parseCallback('http://auth-callback?code=jahat')).toBe(null)
    expect(parseCallback('id.halalpro.gym.evil://auth-callback?code=jahat')).toBe(null)
  })

  it('host lain di skema kita ditolak', () => {
    expect(parseCallback('id.halalpro.gym://apa-saja?code=jahat')).toBe(null)
    expect(parseCallback('id.halalpro.gym://?code=jahat')).toBe(null)
  })

  it('deep link app yang sah tapi bukan masuk dilewatkan begitu saja', () => {
    // Pendengar appUrlOpen menerima SETIAP deep link. Yang bukan urusan kita harus jatuh ke
    // null, bukan jadi percobaan tukar token.
    expect(parseCallback('id.halalpro.gym://workout/123')).toBe(null)
  })

  it('callback kita tanpa kode dan tanpa error jatuh ke null', () => {
    expect(parseCallback('id.halalpro.gym://auth-callback')).toBe(null)
    expect(parseCallback('id.halalpro.gym://auth-callback?code=')).toBe(null)
  })

  it('TIDAK PERNAH melempar, apa pun yang masuk', () => {
    for (const bad of ['', 'bukan url', '://', 'id.halalpro.gym:', null, undefined, 42, {}, []]) {
      expect(() => parseCallback(bad), JSON.stringify(bad)).not.toThrow()
      expect(parseCallback(bad), JSON.stringify(bad)).toBe(null)
    }
  })
})

describe('skema deep link dipaku ke identitas paket', () => {
  // Tiga tempat harus membawa nilai yang sama, dan kalau salah satunya menyimpang alur masuk
  // berhenti TANPA PESAN: Android mengantar deep link ke skema yang tidak ada penerimanya,
  // browser menampilkan halaman kosong, dan app tidak pernah tahu ada yang terjadi.
  const strings = readFileSync(
    new URL('../../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8'
  )
  const manifest = readFileSync(
    new URL('../../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8'
  )

  it('sama dengan appId Capacitor', () => {
    expect(DEEP_LINK_SCHEME).toBe(capacitor.appId)
  })

  it('sama dengan custom_url_scheme di strings.xml', () => {
    expect(strings).toContain(
      '<string name="custom_url_scheme">' + DEEP_LINK_SCHEME + '</string>'
    )
  })

  it('AndroidManifest punya intent-filter yang benar-benar menerimanya', () => {
    // Ini yang HILANG sampai 2026-08-28. custom_url_scheme ada di strings.xml, tapi tidak ada
    // yang membacanya — jadi deep link-nya bukan "belum dipakai", dia memang tidak berfungsi.
    expect(manifest).toContain('android.intent.action.VIEW')
    expect(manifest).toContain('android.intent.category.BROWSABLE')
    expect(manifest).toContain('android:scheme="@string/custom_url_scheme"')
  })

  it('URL redirect native tersusun dari keduanya, bukan ditulis ulang', () => {
    expect(NATIVE_REDIRECT).toBe(DEEP_LINK_SCHEME + '://' + CALLBACK_HOST)
    expect(parseCallback(NATIVE_REDIRECT + '?code=k')).toEqual({ code: 'k' })
  })
})
