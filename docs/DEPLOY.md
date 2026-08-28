# Deploy — Vercel

## Kenapa `vercel.json` ada di root, bukan di `frontend/`

Repo ini punya `frontend/` sebagai subfolder, dan Vercel membaca `vercel.json` dari root
repository. `buildCommand` yang masuk ke `frontend/` lebih eksplisit daripada menyetel Root
Directory di dashboard: yang di berkas ikut ter-review dan ikut ter-versi, yang di dashboard
tidak.

`installCommand: "echo skip"` karena `npm ci` sudah dijalankan di dalam `buildCommand` — Vercel
akan menjalankan install di root, tempat tidak ada `package.json`.

## Header, dan kenapa masing-masing ada

| Path | Cache-Control | Alasan |
| --- | --- | --- |
| `/sw.js` | `max-age=0, must-revalidate` | **Ini yang paling penting.** Service worker yang ter-cache berarti pengguna terkunci di versi lama SELAMANYA — dia tidak akan pernah menerima service worker baru yang bisa membersihkan cache lama. |
| `/index.html` | `max-age=0, must-revalidate` | Dia yang menunjuk aset ber-hash. Kalau dia basi, semua yang lain ikut basi. |
| `/manifest.json` | `max-age=0, must-revalidate` | Nama, ikon, dan warna tema app terpasang. |
| `/assets/*` | `max-age=31536000, immutable` | Nama berkasnya memuat hash isinya, jadi isi yang sama tidak pernah berubah nama. Setahun itu bukan tebakan optimis — dia benar secara logis. |

Header keamanannya seadanya dan sengaja begitu: app ini tidak punya iframe, tidak punya kamera,
tidak punya mikrofon, dan **tidak punya geolocation** (waktu salat memakai pilihan kota, bukan
GPS — lihat aturan #4 di `CLAUDE.md`). `Permissions-Policy` menuliskan itu, jadi kalau suatu
saat ada kode yang mencoba memakainya, dia gagal keras dan bukan diam-diam meminta izin.

## Yang HARUS disetel di dashboard, bukan di berkas ini

Environment variables. Di **Settings → Environment Variables**:

```
VITE_SUPABASE_URL=https://ljhawtubkynxwcaaqcpo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Keduanya memang terkirim ke browser, jadi bukan rahasia. Yang rahasia (`service_role`,
`sb_secret_*`, password DB) **tidak boleh ada di Vercel maupun di repo ini.**

**JANGAN setel `VITE_DEMO`.** Dia memaksa build ke mode demo dengan data contoh.

App tetap ter-build dan jalan penuh tanpa kedua variabel itu — dalam mode tamu, semuanya di
localStorage. Itu jalur yang didukung, bukan mode darurat.

## Setelah deploy pertama

1. **Supabase → Authentication → URL Configuration**: tambahkan domain Vercel ke Redirect URLs.
   Tanpa itu, masuk dengan Google akan mengembalikan orang ke tempat yang salah.
2. **Di daftar Redirect URLs yang sama, tambahkan juga `id.halalpro.gym://auth-callback`.**
   Ini alamat kembali untuk APK, dan dia dipakai OLEH KEDUA jalur masuk — Google maupun magic
   link. Kalau tidak didaftarkan, Supabase menolak redirect-nya dan mengembalikan orang ke Site
   URL: mereka berakhir masuk di versi WEB, sementara app-nya tetap tamu. Tidak ada pesan error
   di mana pun, dan itu yang membuatnya mahal untuk didiagnosis nanti.
3. Buka app-nya, matikan jaringan di devtools, muat ulang. Harus tetap terbuka — kalau tidak,
   service worker-nya tidak terdaftar (dia butuh HTTPS, dan Vercel sudah HTTPS).

## Preview deployment

Setiap PR mendapat domain sendiri. Itu tidak masalah untuk auth kita — Google OAuth dan magic
link berbasis redirect, dan URL redirect-nya bisa didaftarkan per lingkungan.

Ini juga **alasan passkey dicabut**: passkey terikat RP_ID, yaitu domainnya, jadi passkey yang
dibuat di produksi tidak berlaku di preview — artinya alur masuk tidak bisa diuji di tempat yang
justru dipakai untuk mengujinya.

## Masuk dari APK — kenapa dia butuh jalurnya sendiri

Dua jalur masuk di APK **sama-sama tidak berfungsi** sampai 2026-08-28, dan sebabnya berbeda:

| Jalur | Kenapa buntu |
| --- | --- |
| Google | Google MEMBLOKIR OAuth di WebView tersemat (`disallowed_useragent`). Tombolnya mengantar orang ke halaman penolakan Google. |
| Magic link | Alamat kembalinya `window.location.origin`, dan di WebView Capacitor itu `https://localhost`. Tautan dari email dibuka di Chrome, Chrome tidak menemukan apa pun. |

Perbaikannya satu: **alamat kembali di build native adalah deep link `id.halalpro.gym://auth-callback`.**
Persetujuan Google dibuka di browser SISTEM (`@capacitor/browser`) supaya user agent-nya asli,
dan keduanya kembali lewat deep link yang sama. Logikanya di `frontend/src/lib/oauth.ts` (murni,
bertes) dan `lib/auth.ts`; intent-filter-nya di `AndroidManifest.xml`, dan dia **tidak ada** di
manifest sebelumnya — `custom_url_scheme` ada di `strings.xml`, tapi tidak ada yang membacanya.

Yang harus benar di tiga tempat sekaligus, dan dijaga `oauth.test.ts`: `appId` di
`capacitor.config.json`, `custom_url_scheme` di `strings.xml`, dan `DEEP_LINK_SCHEME` di
`lib/oauth.ts`. Kalau satu menyimpang, Android mengantar deep link ke skema yang tidak ada
penerimanya dan alur masuk berhenti tanpa pesan apa pun.

**Belum diuji di perangkat.** Seluruh keputusan dan pembacaan URL-nya bertes, tapi
browser-sistem-lalu-deep-link hanya bisa dibuktikan dengan APK di HP sungguhan. Yang harus
dicoba: ketuk Google → Chrome terbuka → setujui → kembali ke app sudah masuk; lalu ulangi untuk
magic link.

# APK Android

`.github/workflows/android.yml`, dijalankan MANUAL (`workflow_dispatch`). Bukan otomatis di
setiap push: build Android butuh ~5 menit dan SDK yang besar, dan APK itu **rilis** — rilis
adalah keputusan, bukan efek samping `git push`.

## Tanpa keystore, workflow-nya tetap hijau

Dia menghasilkan APK **debug** yang bisa dipasang. Itu disengaja: mewajibkan secret berarti
workflow yang merah sampai seseorang menyiapkan keystore, dan workflow yang selalu merah adalah
workflow yang diabaikan orang.

## Menyiapkan penandatanganan (sekali saja)

```bash
keytool -genkey -v -keystore halalprogym.jks -keyalg RSA -keysize 2048 -validity 10000 -alias halalprogym
base64 -w0 halalprogym.jks
```

Lalu **Settings → Secrets and variables → Actions**:

| Secret | Isi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | keluaran `base64` di atas |
| `ANDROID_KEYSTORE_PASSWORD` | password store |
| `ANDROID_KEY_ALIAS` | `halalprogym` |
| `ANDROID_KEY_PASSWORD` | password key |
| `VITE_SUPABASE_URL` | sama dengan yang di Vercel |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sama dengan yang di Vercel |

## SIMPAN `.jks` ASLINYA, DAN JANGAN SAMPAI HILANG

Android mengikat identitas app ke tanda tangannya. Keystore yang hilang berarti **tidak ada
lagi pembaruan yang bisa dipasang di atas versi yang sudah terpasang** — pengguna harus
uninstall, dan datanya ikut hilang.

Dan berbeda dari kredensial lain, dia tidak bisa dirotasi. Kunci yang bocor pun tidak bisa
diganti tanpa memaksa setiap pengguna uninstall. `.gitignore` sudah menutup `*.jks`,
`*.keystore`, dan `key.properties` — diverifikasi lewat `git check-ignore`, bukan diasumsikan.

## applicationId `id.halalpro.gym` — jangan pernah diubah setelah rilis pertama

Folder `android/` sempat masih memakai `ch.duartesantos.opengym` milik upstream, padahal
`capacitor.config.json` sudah di-rebrand. Tidak ada yang menangkapnya: `cap sync` tidak menulis
ulang identitas paket yang sudah ada, dan tidak ada tes yang menyentuh folder itu.

Sekarang ada: `src/lib/android-identity.test.js` memaku namespace, applicationId, nama paket
Java, nama app, dan `custom_url_scheme` ke `capacitor.config.json`.

Kenapa ini termasuk yang tidak bisa diperbaiki belakangan: begitu satu APK terpasang,
applicationId-nya **adalah** identitas app itu di perangkat. Menggantinya kemudian berarti
Android melihatnya sebagai app berbeda — uninstall, dan data pengguna hilang.

Versinya juga dimulai dari `versionCode 1` / `0.1.0`, tidak melanjutkan 1.2.11 upstream. App-nya
berbeda; melanjutkan nomornya cuma membuat riwayat versinya berbohong.
