# Deploy — Vercel

## Kenapa `vercel.json` ada DI DUA TEMPAT

Kalimat yang dulu ada di sini salah, dan kesalahannya memakan waktu berjam-jam: dokumen ini
menulis "Vercel membaca `vercel.json` dari root repository". **Vercel membacanya dari Root
Directory**, dan Root Directory itu setelan dasbor yang tidak terlihat sama sekali dari dalam
repo. Untuk project ini nilainya `frontend` — jadi berkas yang dibaca justru
`frontend/vercel.json`, bukan yang di akar.

| Berkas | Isinya | Dipakai kalau Root Directory… |
| --- | --- | --- |
| `vercel.json` (akar) | build + headers | akar repo |
| `frontend/vercel.json` | **hanya** headers | `frontend` ← **yang berlaku sekarang** |

Keduanya sengaja ada supaya konfigurasi mana pun menghasilkan deploy yang benar. Headers-nya
wajib identik, dipaku `src/lib/vercel-headers.test.ts`; build sengaja tidak diduplikasi.

Di berkas akar, `installCommand: "echo skip"` karena `npm ci` sudah dijalankan di dalam
`buildCommand` — tanpa itu Vercel menjalankan install di akar, tempat tidak ada dependensi untuk
dipasang.

Cara memastikan mana yang sedang dipakai ada di bagian **Root Directory** di bawah — satu perintah
`curl`, tanpa membuka dasbor.

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

## Kalau Vercel masih gagal — cari dulu tanda tangannya, baru lognya

**Ada DUA bentuk kegagalan yang sama sekali berbeda, dan membedakannya lebih dulu menghemat
berjam-jam.** Keduanya tampil sebagai satu titik merah yang sama di GitHub, tapi yang satu
berarti build-mu gagal dan yang satu lagi berarti build-mu **tidak pernah dijalankan**.

Status commit Vercel bisa dibaca tanpa token untuk repo publik:

```bash
curl -s https://api.github.com/repos/maulanaarifpratama-dotcom/halalprogym/commits/main/status
```

| `description` | `target_url` menunjuk | Artinya |
| --- | --- | --- |
| "Deployment has failed — run..." | halaman deployment | Build dijalankan dan **gagal**. Lognya ada isinya. |
| "Deployment failed." | docs *project-configuration* | Konfigurasi **DITOLAK sebelum build jalan**. Lognya kosong, dan memperbaiki build tidak akan mengubah apa pun. |

Yang kedua sudah pernah terjadi di sini, dan menghabiskan tiga percobaan perbaikan build yang
semuanya sia-sia: `frontend/vercel.json` dikirim dengan kunci `"//"` sebagai komentar. JSON tidak
punya komentar, dan skema Vercel `additionalProperties: false`. Sekarang dipaku
`src/lib/vercel-headers.test.ts`. Untuk memeriksa berkas konfigurasi apa pun ke skema resminya:

```bash
node -e "fetch('https://openapi.vercel.sh/vercel.json').then(r=>r.json()).then(s=>console.log(Object.keys(JSON.parse(require('fs').readFileSync('vercel.json','utf8'))).filter(k=>!(k in s.properties))))"
```

Kalau tanda tangannya bentuk PERTAMA, lanjut ke tabel di bawah.

**Catatan yang menghemat waktu: Deployment Protection.** Kalau menyala, URL deployment
mengarahkan ke `vercel.com/sso-api` dan lognya tidak bisa dibaca dari luar dasbor sama sekali —
termasuk oleh sesi agent. Bukan berarti deploy-nya gagal; berarti kamu yang harus membaca
lognya, lewat dasbor → deployment → **Building**, atau `npx vercel inspect <deployment> --logs`.

Tiga hal sudah ditutup dari repo, dan ketiganya diverifikasi dengan menjalankan perintahnya di
clone git yang segar. Kalau masih merah, sebabnya ada di **setelan project**, dan lognya yang
menjawab.

| Yang tertulis di log | Artinya | Perbaikannya |
| --- | --- | --- |
| `EBADENGINE ... Required: {"node":">=22.12.0"}` | Node Vercel terlalu tua | Project Settings → **Node.js Version** → 22.x |
| `cd: frontend: No such file or directory` | **Root Directory** disetel ke `frontend`, tapi `vercel.json` di akar tetap dibaca | Setel Root Directory ke **akar repo** (kosongkan field-nya) |
| `No Output Directory named "frontend/dist"` | Sama seperti di atas | Sama |
| `sharp` / `node-gyp` / `libvips` | Install script native gagal | Seharusnya mustahil sekarang — `frontend/.npmrc` mematikannya. Pastikan berkas itu ikut ter-commit. |
| Tidak sampai ke tahap build sama sekali | Bukan soal kode | Cek repo yang ter-link, Deployment Protection, dan kuota build |

**Root Directory project ini `frontend`, dan itu TERBUKTI — bukan diduga.** Dokumen ini sempat
menulis "harus akar repo"; itu salah, dan diperbaiki setelah deploy pertama yang berhasil.

Cara membuktikannya tanpa membuka dasbor: **periksa header `sw.js` di produksi.** Kalau
`Cache-Control: max-age=0, must-revalidate` dan `Service-Worker-Allowed` muncul, berkas yang
dibaca adalah yang berada di Root Directory.

```bash
curl -sI https://halalprogym.vercel.app/sw.js | grep -i "cache-control\|service-worker-allowed"
```

Keduanya sah dan keduanya menghasilkan deploy yang benar, tapi **berkas yang dibaca berbeda**:

| Root Directory | Berkas yang dibaca | Yang mengurus build |
| --- | --- | --- |
| akar repo | `vercel.json` | `buildCommand` (`cd frontend && …`) |
| `frontend` ← **yang dipakai sekarang** | `frontend/vercel.json` | deteksi Vite bawaan Vercel |

Itu sebabnya `frontend/vercel.json` ada dan membawa **hanya headers**. Dia ditambahkan sebagai
jaga-jaga terhadap kemungkinan yang tidak bisa dilihat dari dalam repo — dan ternyata dia yang
benar-benar dipakai. Tanpa dia, seluruh `headers` hilang **tanpa satu pun pesan**, dan yang paling
mahal di antaranya `sw.js`: tanpa `Cache-Control: max-age=0`, service worker-nya di-cache CDN dan
orang terjebak di versi lama app selamanya, karena SW lama yang menyajikan shell lama.

Headers-nya wajib identik dengan yang di akar, dan itu dipaku `src/lib/vercel-headers.test.ts`.
Perintah build sengaja TIDAK diduplikasi di sana: di konfigurasi ini Vercel sudah mendeteksi Vite
dengan benar, dan menuliskan perintah build kedua kalinya berarti dua tempat yang bisa menyimpang.

Kedua skenario dibangun di CI (`deploy-build`), jadi yang mana pun Root Directory-nya, jalurnya
sudah terbukti.

## Versi Node dan `sharp` — dua hal yang membuat Vercel gagal sementara CI hijau

Ada dua perbedaan antara GitHub Actions dan build Vercel, dan keduanya bisa menjatuhkan Vercel
tanpa menyentuh CI sama sekali.

**1. Versi Node.** Vite 8 menuntut `^20.19.0 || >=22.12.0`. CI memakai Node 22 secara eksplisit
(`node-version: 22`), tapi Vercel memilih versi default-nya sendiri — dan di Node 18 build gagal.
Repo ini tidak punya `engines` sama sekali sampai 2026-08-28.

Sekarang dipin di **dua tempat**, dan keduanya perlu:
- `frontend/package.json` — dokumentasi niat, dan yang dibaca kalau Root Directory Vercel disetel
  ke `frontend`.
- `package.json` di **akar repo** — Vercel membaca `engines.node` dari package.json di Root
  Directory, dan `vercel.json` memakai `cd frontend`, jadi Root Directory-nya akar. Berkas itu
  tidak punya dependensi dan tidak membangun apa pun; dia ada hanya untuk baris `engines`.

`frontend/.npmrc` menyalakan `engine-strict=true`. Tanpa itu npm cuma memberi peringatan yang
tenggelam di ratusan baris log, lalu build gagal jauh di dalam Vite dengan sebab yang tidak jelas.
Dengan itu, gagalnya berbunyi `EBADENGINE ... Required: {"node":">=22.12.0"} Actual: v18.x` —
satu baris yang langsung menjawab pertanyaannya.

**2. `sharp` dan install script.** `@capacitor/assets` (devDependency, dipakai hanya untuk
men-generate ikon Android) menarik `sharp@0.32.6`, yang punya install script native. GitHub
Actions punya toolchain untuk itu; image build Vercel belum tentu, dan `npm ci` yang gagal di
install berarti build yang gagal sebelum satu baris kode dibaca.

Perbaikannya ada di **`frontend/.npmrc`** (`ignore-scripts=true`), bukan cuma di `buildCommand`.
Alasannya penting: `npm ci --ignore-scripts` di `vercel.json` hanya berlaku kalau Vercel membaca
`vercel.json` — dan dia tidak membacanya kalau Root Directory disetel ke `frontend`. Berkas
`.npmrc` berlaku di **kedua** konfigurasi, dan juga untuk siapa pun yang menjalankan
`npm install` di mesinnya.

Aman karena tidak ada satu pun skrip atau workflow yang menjalankan `@capacitor/assets` — dia
dipanggil manual, sekali, saat men-generate ikon Android. Kalau butuh:

```sh
npm rebuild sharp --ignore-scripts=false
npx @capacitor/assets generate ...
```

Diverifikasi di clone git yang segar untuk kedua skenario Root Directory: `dist` 11 MB, nol
error, `sw.js` ada di keduanya.

Kalau Vercel masih gagal setelah ini, **cari tanda tangannya lebih dulu** (bagian di atas), baru
baca lognya. `EBADENGINE` berarti Node yang dipilih Vercel lebih tua dari `engines.node`.

Catatan soal versi yang dipilih: Vercel memetakan range terbuka ke versi **tertinggi** yang cocok,
bukan terendah — jadi `>=22.12.0` berarti build berjalan di **Node 24**, bukan 22. Karena itu job
`deploy-build` di CI menjalankan matriks [22, 24]; menguji 22 saja berarti menguji versi yang
bukan versi produksi. Dipaku `src/lib/node-engines.test.ts`.

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

## APK membawa foto gerakannya sendiri

`npm run build:mobile` mengunduh 640 foto demo (**39 MB**) ke `frontend/media-cache/`, lalu
menyalinnya ke `dist/demo/` setelah build. APK jadi sekitar 39 MB lebih besar, dan yang dibeli
adalah demo gerakan yang tetap ada di basement gym tanpa sinyal.

Kenapa APK butuh ini sementara web tidak: build native sengaja tidak mendaftarkan service worker,
jadi tidak ada cache foto yang kita kendalikan dan `prefetchMedia` tidak melakukan apa pun. Tanpa
bundel, setiap foto butuh jaringan setiap kali.

Unduhannya menambah ~3 menit ke workflow dan **gagal keras** kalau ada bingkai yang tidak
terambil. Alasannya bukan yang paling jelas: `Media.jsx` menangkap `onError` dan jatuh ke diagram
otot, jadi bingkai hilang tidak meninggalkan kotak rusak. Yang hilang lebih halus — orang
kehilangan foto demo yang seharusnya dia punya, dan tidak punya cara membedakannya dari latihan
yang memang belum terpetakan. Lubang seperti itu tidak akan pernah dilaporkan siapa pun.

**Kalau APK-nya harus lebih kecil:** bangun tanpa `VITE_DEMO_BASE`. Foto kembali datang dari CDN
jsDelivr, APK-nya ~11 MB, dan offline untuk foto hilang. Itu pertukaran yang sah, tapi harus
disengaja.

Cache-nya **di luar `public/`** dengan sengaja: Vite menyalin `public/` ke `dist/` di setiap
build, jadi di sana build web ikut membawa 39 MB yang tidak dipakai — terukur, `dist` jadi 49 MB
alih-alih 11 MB.

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
