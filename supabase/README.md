# Supabase — Halal Pro Gym

Project ref: **`ljhawtubkynxwcaaqcpo`**

## Menerapkan migration

Migration hidup sebagai berkas di `migrations/`. Menerapkannya **manual dan eksplisit**:

```bash
supabase link --project-ref ljhawtubkynxwcaaqcpo
supabase db push
```

Ref-nya ditulis eksplisit, bukan diandalkan dari state `supabase link` sebelumnya. Ada lima
salinan repo lain di mesin ini dan satu project Supabase lain yang **dilarang disentuh**
(LittleChamp `hpxjvffwhajumdlxhuet`) — `--project-ref` yang eksplisit adalah pengamannya.

`supabase db push` menanyakan password database. **Password itu tidak ada di repo ini dan tidak
boleh disalin ke mana pun** — masukkan langsung waktu ditanya.

## Jangan bikin workflow yang auto-push

Repo Impactory punya `deploy-supabase-migrations.yml` yang menjalankan `supabase db push` setiap
kali `supabase/migrations/` berubah. Akibatnya di sana **"cuma commit" bisa berarti deploy
produksi**, dan itu jebakan yang mahal. Jangan tanam ulang di sini.

## Jangan pakai Supabase MCP dari repo ini

Konektor MCP di mesin ini ada di akun email yang **berbeda**. Dia tidak bisa melihat
`ljhawtubkynxwcaaqcpo`, tapi dia bisa melihat dua project yang bukan milik repo ini — termasuk
LittleChamp. Jadi kegagalannya sunyi: perintah berhasil, di database yang salah.

## Auth yang harus disetel di dashboard (bukan di migration)

Provider dan URL redirect tidak bisa diatur dari berkas SQL. Di dashboard project:

1. **Authentication → Providers → Google**: aktifkan, isi Client ID + Secret dari Google Cloud
   Console. Authorized redirect URI di sisi Google:
   `https://ljhawtubkynxwcaaqcpo.supabase.co/auth/v1/callback`
2. **Authentication → Providers → Email**: aktifkan, dan biarkan "Confirm email" menyala —
   alurnya magic link, jadi email memang harus diklik.
3. **Authentication → URL Configuration → Redirect URLs**: tambahkan URL produksi Vercel dan
   `http://localhost:5173` untuk dev.

Untuk APK Android nanti, Google OAuth **diblokir di embedded WebView**, jadi sign-in harus lewat
browser sistem + deep link. Belum dikerjakan; sudah dicatat sebagai pekerjaan tersendiri.

## Kredensial

`frontend/.env.local`, diabaikan git:

```
VITE_SUPABASE_URL=https://ljhawtubkynxwcaaqcpo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Keduanya memang terkirim ke browser — bukan rahasia. Yang rahasia (`service_role`,
`sb_secret_*`, password DB) **tidak boleh ada di repo ini sama sekali.**

**App tetap jalan penuh tanpa kedua nilai itu**, dalam mode tamu dengan localStorage. Itu bukan
mode darurat — itu jalur yang didukung, dan `npm run dev` tanpa `.env.local` memang harus bisa.
