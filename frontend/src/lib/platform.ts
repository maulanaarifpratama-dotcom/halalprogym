/**
 * Deteksi platform — dipakai HANYA untuk memilih kata-kata instruksi, bukan untuk memutuskan
 * kemampuan.
 *
 * Sebelumnya konstanta ini tinggal di lib/api.js bersama helper WebAuthn. Berkas itu dicabut
 * bersama lapis auth upstream, dan yang tersisa cuma ini — jadi dia dapat rumah sendiri
 * daripada menumpang berkas yang isinya sudah tidak nyambung.
 *
 * ATURANNYA: sniffing user agent boleh untuk kalimat ("Di Chrome: menu ⋮ → Tambahkan ke layar
 * utama"), TIDAK boleh untuk gerbang fitur. Untuk kemampuan, tanya API-nya langsung — itu yang
 * dilakukan wakelock.ts, push.ts, dan mobile.js, dan itu yang benar: user agent bisa dipalsukan,
 * berubah, dan tidak pernah bercerita apakah sebuah API benar-benar ada.
 */
const ua = (): string => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '')

export const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(ua())
export const IS_ANDROID = /Android/.test(ua())
