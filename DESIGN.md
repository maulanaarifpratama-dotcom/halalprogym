# DESIGN.md — Halal Pro Gym

**Mode: Operate.** Pengguna menyelesaikan tugas (mencatat set, menjalankan sesi). Keterbacaan,
konsistensi, dan scene pemakaian nyata mengalahkan ekspresi. **Brand hidup di detail presisi,
bukan di dekorasi.**

## Dari mana dunia visualnya

Palet diambil dari **halalpro.id** — situs suplemen Halal Pro yang sudah jalan — atas permintaan
eksplisit user. Kebetulan yang menguntungkan: situs itu **sudah dark-first dengan aksen lime**,
jadi tidak ada pertarungan identitas dengan app yang juga dark-first.

Dan satu kebetulan yang lebih dalam: `--ease` openGym (`cubic-bezier(.32,.72,0,1)`) **identik**
dengan `--e-drawer` halalpro.id. Kurva sheet yang sama. Bahasa geraknya sudah satu keluarga
sebelum satu baris pun diubah.

## Palet

Sumber brand (halalpro.id) → token app:

| Brand | Nilai | Jadi |
| --- | --- | --- |
| `--lime` | `#94e900` | `--acc` — aksen utama |
| `--green` | `#0db800` | `--acc-2` — tekan/lebih dalam, dan warna status "berhasil" |
| `--deep` | `#008140` | cadangan, gradien |
| `--ink` | `#050806` | `--bg` — hitam brand, bernada hijau |
| `--fg` | `#eaf3e6` | `--label` — putih pecah bernada hijau |
| `--hairline` | `rgba(148,233,0,.14)` | `--sep`, dilembutkan (lihat di bawah) |
| `--paper` | `#f3f7ef` | `--bg` tema terang |

### Tangga permukaan — diperpanjang, tidak disalin

Tangga ink halalpro.id cuma 4 langkah dan sangat rapat (`#050806` → `#111a12`). Itu benar untuk
situs marketing: dua-tiga bidang besar. **Salah untuk app**, yang butuh permukaan bisa dibedakan
untuk kartu, keadaan tertekan, dan kontrol — kalau disalin apa adanya, kartu jadi tak terlihat
di atas latarnya.

Jadi tangganya **diperpanjang ke atas dengan hue yang dipertahankan**, bukan diganti:

```
--bg        #050806   ← --ink brand, apa adanya
--bg-el     #0a120c      sheet, bar
--surface   #101c13      isi kartu / grouped list
--surface-2 #182a1c      tertekan, bersarang
--surface-3 #213826      kontrol (track segmented, switch mati)
```

Kanal G: 8 → 18 → 28 → 42 → 56. Rasio R/G ≈ .60 dan B/G ≈ .68 di setiap langkah — pola yang
sama dengan ink brand (`5/8`, `17/26`), jadi nada hijaunya konsisten sepanjang tangga.
Warisan openGym punya 0 → 14 → 28 → 44 → 58, jadi separasinya setara: kepadatan app terjaga,
identitas brand didapat.

### Hairline bernada lime — dilembutkan, bukan dibuang

`rgba(148,233,0,.14)` itu detail paling khas dari brand-nya: garis pemisah yang **sedikit** lime,
bukan abu netral. Tapi situs punya belasan garis, app punya ratusan — pada kepadatan itu .14
mulai menghijaukan seluruh UI.

Dipakai **.12** untuk pemisah dan **.08** untuk tepi di atas blur. Pada nilai itu, satu garis
terbaca sebagai netral yang nyaris hangat; yang terasa cuma kumpulannya. Itu ide brand-nya
sendiri, dijalankan pada kepadatan app.

### Status tetap netral

`--red` `--orange` `--yellow` `--blue` **tidak** di-brand. Itu warna semantik: PR, peringatan,
error. Menghijaukannya berarti mengurangi kejelasan demi konsistensi — pertukaran yang salah
di mode Operate. Yang diganti hanya `--green` → `#0db800`, karena "berhasil" dan brand memang
kebetulan warna yang sama.

## Tipografi — font sistem, sengaja

**UI pakai font sistem** (`-apple-system` / `SF Pro` / `Roboto` / `Segoe UI`). Alegreya Sans
dari halalpro.id **tidak** dibawa ke UI kerja. Tiga alasan, urut dari yang paling keras:

1. **Angka tabular.** Warisan sudah memakai `font-variant-numeric: tabular-nums` di lima tempat —
   input, timer, kolom volume. Font sistem dijamin punya angka tabular. Alegreya Sans **belum
   diverifikasi punya**, dan kalau tidak, lebar digit rest timer goyang tiap detik. Itu elemen
   paling ditatap di seluruh app.
2. **Jalur latihan tidak boleh menunggu font.** Delapan berkas font memblokir render, di app
   yang dibuka di basement gym bersinyal jelek.
3. Alegreya Sans itu sans humanis untuk teks panjang, bukan untuk UI padat 11–13px berkolom angka.

Alegreya Sans dipakai **hanya untuk momen brand** — wordmark, hero onboarding, judul empty state.
Sedikit, tidak di jalur kritis, `font-display: swap` aman di sana.

Bobot membawa makna, ukuran mengerjakan sisanya: 600 untuk judul, 400 untuk isinya. Aturan ini
diwarisi dari warisan dan dipertahankan — bukan karena malas, karena benar.

## Geometri

```
--r-sm 10px   ← angka brand
--r    14px
--r-lg 18px   ← angka brand
--r-xl 28px   ← angka brand
--r-card 16px
```

Tiga dari lima langkah adalah angka radius halalpro.id apa adanya (10/18/28); dua sisanya
mengisi celah yang khas app. Radius brand (10/18/28/40) terlalu besar dipakai penuh pada
kepadatan app — 40px pada kartu daftar akan terlihat seperti mainan.

## Gerak

`--ease: cubic-bezier(.32,.72,0,1)` sudah identik dengan brand — tidak diubah.

Aturan warisan dipertahankan: **gerak mengakui, tidak menganimasikan.** Tekan menskala ~2%,
transisi 140–220ms. Tidak ada yang memantul atau meluncur sebagai dekorasi.

Satu aturan diambil dari brand: **keluar selalu lebih cepat dari masuk** (halalpro.id
`--d-exit: 200ms` < `--d-base: 220ms`). Alasannya benar — menutup sesuatu harus terasa
langsung, membuka boleh punya berat.

`prefers-reduced-motion` dihormati: semua durasi ke ~0, tidak ada transform.

## Yang tidak boleh masuk

- Figur manusia berpakaian minim sebagai demo gerakan — soal aurat **dan** lisensi
- Gamifikasi: badge, streak yang menghukum, konfeti
- Motivasi berlebihan. Orang sedang bekerja.
- Gradien lime tebal di bidang besar. Lime itu aksen, bukan latar.
- Sorakan waktu puasa. Ramadan itu konteks, bukan tantangan.
