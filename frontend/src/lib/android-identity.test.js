import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import capacitor from '../../capacitor.config.json'

/**
 * Identitas paket Android harus cocok dengan `capacitor.config.json`.
 *
 * KENAPA INI PUNYA TES SENDIRI. Rebrand ke `id.halalpro.gym` dicatat sebagai selesai, tapi yang
 * benar-benar berubah cuma `capacitor.config.json`. Seluruh folder `android/` masih memakai
 * `ch.duartesantos.opengym` — namespace, applicationId, nama paket Java, dan nama app yang
 * tampil di laci aplikasi.
 *
 * Itu tidak terlihat dari mana pun. Tidak ada tes yang menyentuhnya, `npm run build` tidak
 * membacanya, dan `cap sync` tidak mengeluh — dia memang tidak menulis ulang identitas paket
 * yang sudah ada.
 *
 * DAN INI SALAH SATU DARI SEDIKIT KESALAHAN YANG TIDAK BISA DIPERBAIKI BELAKANGAN. Begitu satu
 * APK dipasang orang, applicationId-nya menjadi identitas app itu di perangkatnya. Menggantinya
 * kemudian berarti Android melihatnya sebagai app yang berbeda: pengguna harus meng-uninstall
 * yang lama, dan seluruh datanya ikut terhapus.
 *
 * Jadi biayanya nol hari ini dan sangat mahal setelah rilis pertama.
 */
const ANDROID = new URL('../../android/', import.meta.url)
const read = rel => readFileSync(new URL(rel, ANDROID), 'utf8')

const APP_ID = capacitor.appId
const APP_NAME = capacitor.appName

describe('identitas paket Android', () => {
  it('capacitor.config.json memakai identitas kita, bukan upstream', () => {
    expect(APP_ID).toBe('id.halalpro.gym')
    expect(APP_NAME).toBe('Halal Pro Gym')
  })

  it('build.gradle memakai applicationId dan namespace yang sama', () => {
    const gradle = read('app/build.gradle')
    expect(gradle).toContain('applicationId "' + APP_ID + '"')
    expect(gradle).toContain('namespace "' + APP_ID + '"')
  })

  it('strings.xml memakai nama dan paket yang sama', () => {
    // `app_name` yang tampil di laci aplikasi, dan `custom_url_scheme` yang dipakai deep link
    // saat kembali dari Google OAuth di browser sistem.
    const xml = read('app/src/main/res/values/strings.xml')
    expect(xml).toContain('<string name="app_name">' + APP_NAME + '</string>')
    expect(xml).toContain('<string name="package_name">' + APP_ID + '</string>')
    expect(xml).toContain('<string name="custom_url_scheme">' + APP_ID + '</string>')
  })

  it('MainActivity ada di direktori yang cocok dengan paketnya', () => {
    // Java mewajibkan direktori mengikuti nama paket. Salah satu saja tidak akan terkompilasi,
    // dan itu baru ketahuan saat seseorang menjalankan gradle.
    const dir = APP_ID.split('.').join('/')
    const file = 'app/src/main/java/' + dir + '/MainActivity.java'
    expect(existsSync(new URL(file, ANDROID)), file).toBe(true)
    expect(read(file)).toContain('package ' + APP_ID + ';')
  })

  it('TIDAK ADA sisa identitas upstream di mana pun', () => {
    const files = [
      'app/build.gradle',
      'app/src/main/res/values/strings.xml',
      'app/src/main/java/' + APP_ID.split('.').join('/') + '/MainActivity.java',
    ]
    for (const f of files) {
      expect(read(f), f).not.toContain('duartesantos')
      expect(read(f).toLowerCase(), f).not.toContain('opengym')
    }
  })

  it('versinya dimulai dari awal, bukan melanjutkan penomoran upstream', () => {
    // applicationId-nya berbeda, jadi ini app yang berbeda di mata Android — tidak ada pengguna
    // yang bisa meng-upgrade dari 1.2.11 upstream ke sini. Melanjutkan nomornya cuma membuat
    // riwayat versinya berbohong.
    const gradle = read('app/build.gradle')
    const code = Number(/versionCode\s+(\d+)/.exec(gradle)?.[1])
    const name = /versionName\s+"([^"]+)"/.exec(gradle)?.[1]
    expect(code).toBeGreaterThan(0)
    expect(code).toBeLessThan(12)
    expect(name).not.toMatch(/^1\.2\./)
  })
})
