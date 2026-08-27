# Glosarium Bahasa Indonesia — Halal Pro Gym

Keputusan istilah, diambil **sebelum** terjemahan massal. Mengubahnya belakangan berarti
menyentuh ~10.360 baris instruksi latihan, jadi ini dikunci lebih dulu dengan sengaja.

Dipakai oleh `frontend/src/locales/id.js` dan oleh pipeline `scripts/translate-*.mjs` di Fase 4.

## Tiga aturan induk

**1. Istilah gym tetap Inggris.** Deadlift, bench press, squat, reps, set, superset, warm-up,
drop-set, rest-pause — itu yang benar-benar dipakai orang di gym Indonesia. Kalau istilah
Inggrisnya yang natural, **kuncinya tidak diisi sama sekali**; `t()` melakukan `dict[s] || s`
jadi fallback yang mengerjakannya. Menerjemahkan "reps" jadi "repetisi" bikin app terasa seperti
buku pelajaran, bukan seperti gym.

**2. Istilah keislaman ditulis benar, mengikuti KBBI.** "Salat", bukan "sholat" atau "shalat" —
diputuskan 2026-08-27; KBBI ada, jadi dipakai.

**3. Sapaan santai, bukan formal.** "kamu", bukan "Anda". Orang di gym sedang bekerja, bukan
sedang dilayani teller bank. Tidak ada tanda seru motivasional.

## Hari

| Inggris | Indonesia | Catatan |
| --- | --- | --- |
| Sunday | **Ahad** | Bukan "Minggu" — lihat di bawah |
| Monday | Senin | dari *Itsnain* (dua) |
| Tuesday | Selasa | dari *Tsalatsa* (tiga) |
| Wednesday | Rabu | dari *Arbi'a* (empat) |
| Thursday | Kamis | dari *Khamis* (lima) |
| Friday | Jumat | dari *Jumu'ah* |
| Saturday | Sabtu | dari *Sabt* |

Pendek: `Ahd · Sen · Sel · Rab · Kam · Jum · Sab`

**Kenapa Ahad.** Enam dari tujuh nama hari Indonesia sudah dari bahasa Arab. Satu-satunya yang
bukan adalah "Minggu", dari Portugis *domingo* (*dies Dominica*, "Hari Tuhan"). Ganti kata itu
ke **Ahad** (*al-ahad*, "yang pertama") dan minggunya konsisten penuh. Jadi ini bukan preferensi
yang ditempelkan — ini memperbaiki satu-satunya kata yang keluar dari pola.

**Jebakan teknis yang sudah ditangani.** `Intl` dengan `id-ID` **mengembalikan "Minggu"**.
Tempat yang lewat `t(DAYN[..])` aman karena pack yang menentukan, tapi pemanggil
`toLocaleDateString` langsung tidak melihat pack. Ditangani `localeDateString()` di
`lib/format.ts` lewat `formatToParts` — bukan regex atas string hasil, supaya kata "Minggu"
yang muncul sebagai bagian teks lain tidak ikut terganti. Ada tesnya di `format.test.ts`.

## Gender

| Inggris | Indonesia |
| --- | --- |
| Male | **Ikhwan** |
| Female | **Akhwat** |

Ini melabeli **diagram tubuh** (`BodyMap`, dari MuscleMap) — bukan demo gerakan.

**Demo gerakan tetap satu set netral untuk semua**, diputuskan 2026-08-27. Tidak ada aset
bergender. Itu menghapus penggandaan aset dari jalur kritis, dan aurat tetap terjaga lewat
gaya visualnya (line-art / diagram otot), bukan lewat dua set terpisah.

Nilai tersimpannya tetap `'male'` / `'female'` — nol migrasi data.

## Istilah keislaman

| Istilah | Ejaan yang dipakai | Jangan |
| --- | --- | --- |
| salat | **salat** | sholat, shalat, solat |
| Subuh · Zuhur · Asar · Magrib · Isya | seperti tertulis | Maghrib, Ashar, Isha |
| Jumu'ah | **Jumu'ah** (salatnya) / Jumat (harinya) | Jumatan di teks UI |
| Ramadan | **Ramadan** | Ramadhan, Romadhon |
| Tarawih | **Tarawih** | Taraweh |
| sahur · imsak · berbuka | huruf kecil, kata biasa | — |
| Ayyamul Bidh | **Ayyamul Bidh** | Ayyamul Bidh (13–15 Hijriah) |
| Hijriah | **Hijriah** | Hijriyah |
| puasa sunnah | huruf kecil | — |

> **Perlu dikonfirmasi:** ejaan nama waktu salat mengikuti KBBI (**Magrib** tanpa h, **Asar**
> tanpa h, **Zuhur**). Itu benar menurut KBBI tapi terasa asing bagi banyak orang, yang biasa
> menulis "Maghrib" dan "Ashar". Aturan induk 2 bilang ikut KBBI; kalau kamu mau yang lebih
> lazim dipakai, ini titik yang wajar untuk mengecualikan — dan lebih murah diputuskan sekarang.

## Latihan

| Inggris | Indonesia | Catatan |
| --- | --- | --- |
| Rest | Istirahat | |
| Rest day | Hari istirahat | |
| Body weight | Berat badan | |
| Sets | Set | |
| Reps | *(tidak diisi)* | natural apa adanya |
| Superset, warm-up, drop-set, rest-pause | *(tidak diisi)* | istilah gym |
| Start workout | Mulai latihan | |
| Note | Catatan | |

## Navigasi

Home → **Beranda** · Plan → **Rencana** · Stats → **Statistik** ·
History → **Riwayat** · Settings → **Pengaturan**

## Aksi

Confirm → Konfirmasi · Cancel → Batal · Delete/Remove → Hapus · Save → Simpan ·
Import → Impor · Done → Selesai · Skip → Lewati · Edit → Ubah · On → Nyala · Off → Mati ·
All → Semua

## Status pack

`locales/id.js` **sengaja belum lengkap** — 740 kunci total, yang diisi baru yang membawa
keputusan brand. `t()` jatuh ke Inggris per-kunci, jadi pack parsial bukan kegagalan.

`INSTR_LANGS` dan `EXERCISE_NAME_LANGS` **belum** memuat `id`: keduanya butuh run terjemahan
besar (instruksi ~10.360 baris, nama latihan 1.324 entri) lewat `scripts/translate-*.mjs`.
Itu pekerjaan Fase 4.
