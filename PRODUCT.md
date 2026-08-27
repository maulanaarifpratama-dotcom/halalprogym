# PRODUCT.md — Halal Pro Gym

> Disusun 2026-08-27 dari brief percakapan, **bukan dari wawancara terstruktur** — user
> menginstruksikan jalan terus tanpa berhenti. Asumsi ditandai `[ASUMSI]` dan layak dikoreksi.

## Apa ini

App latihan pribadi untuk brand **Halal Pro** ("Stay Fit Stay Halal"). Fork openGym, di-rework
supaya tahu dua hal yang tidak diketahui app latihan lain: **kapan penggunanya salat, dan kapan
penggunanya puasa.**

## Siapa penggunanya

Muslim Indonesia yang latihan beban, punya HP Android, dan mencatat latihannya sendiri.
Individu — **bukan** pemilik gym, bukan pelatih dengan daftar klien. Satu akun satu orang.

Yang membedakan mereka dari pengguna app latihan pada umumnya:
- Latihannya dipotong lima waktu salat, tiap hari, dan jadwalnya bergeser sepanjang tahun
- Sebulan penuh setahun sekali mereka puasa, dan performanya turun — itu normal, bukan gagal
- Sebagian puasa Senin–Kamis sepanjang tahun
- Jumat siang hilang untuk Jumu'ah
- Sebagian besar tidak nyaman menatap figur berpakaian minim sebagai demo gerakan

## Scene pemakaian sebenarnya — ini yang menyetir desain

**Di gym, satu tangan, layar cerah, sinyal jelek, di antara set, 60–120 detik.**

Konsekuensinya keras:
- Target sentuh harus besar dan di jangkauan jempol — tangan satunya pegang barbel
- Angka harus terbaca sekilas, dari jarak lengan, kadang berkeringat dan silau
- **Nol layar yang menunggu jaringan.** Basement gym tanpa sinyal harus tetap penuh fungsi
- Timer tidak boleh goyang lebarnya tiap detik
- Kalau waktu Maghrib masuk di tengah sesi, app yang benar **menjeda**, bukan diam

## Yang bukan tujuan

Bukan sistem manajemen gym. Tidak ada member, tagihan, absensi, kelas, multi-cabang, multi-tenant.
Tidak ada feed sosial, leaderboard, atau gamifikasi. Bukan app nutrisi.

## Batasan yang mengikat desain

- **AGPL-3.0.** Repo publik, link source wajib ada di dalam app.
- **Gambar asal openGym © Gym visual — tidak boleh dipakai.** Diganti foto
  **free-exercise-db (Unlicense, domain publik)**: 329 latihan dapat foto posisi awal dan akhir.
  Sisanya dapat **diagram otot MuscleMap (MIT)**, yang menjawab pertanyaan berbeda dan bukan
  keadaan error. Nama dan instruksi tetap MIT (ExerciseDB).
- Android + PWA. iOS ditunda (butuh Mac + $99/tahun).
- Offline-first: localStorage source of truth, Supabase target sync.
- Target siap **pertengahan Januari 2027**, tiga minggu sebelum Ramadan 1448 (≈ 8 Feb 2027).

## Nada

Tenang, tidak menghakimi, tidak memotivasi berlebihan. Tidak ada "Kamu luar biasa!!" —
orang di gym sedang bekerja, bukan butuh sorakan. `[ASUMSI]` Bahasa Indonesia sehari-hari,
bukan formal; istilah gerakan tetap Inggris (deadlift, bench press) karena itu yang dipakai
orang di gym.

Istilah keislaman ditulis benar mengikuti KBBI: **Ahad** bukan Minggu, **salat** bukan
sholat/shalat, Jumu'ah, Ramadan, Tarawih, Ayyamul Bidh. Gender disebut **Ikhwan / Akhwat**.
Daftar lengkap dan alasannya: `docs/GLOSARIUM-ID.md`.

## Keputusan yang sudah ditutup

- **Semua istilah mengikuti KBBI** (2026-08-27), tanpa pengecualian — standar nasional.
  Termasuk yang terasa asing: Magrib, Asar, Zuhur, sunah (satu n), salat Jumat.
- **Ikhwan / Akhwat sebagai istilah** (2026-08-27) — melabeli diagram tubuh.
- **Demo gerakan satu set netral untuk semua** (2026-08-27). Tidak ada aset bergender. Aurat
  dijaga lewat gaya visualnya (line-art / diagram otot), bukan lewat dua set terpisah. Ini
  menghapus penggandaan aset dari jalur kritis — dan jalur kritis itu jalur terpanjang.

## Yang perlu dikonfirmasi

Tidak ada. Ejaan waktu salat mengikuti KBBI seperti semua istilah lain (Magrib, Asar, Zuhur),
diputuskan 2026-08-27 bersamaan dengan aturan induknya.
