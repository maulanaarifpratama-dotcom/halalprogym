import { describe, expect, test } from 'vitest'
import { createHash } from 'node:crypto'
import pt from '../locales/pt.js'
import ptBR, { PT_BR_OVERRIDES } from '../locales/pt-BR.js'
import { DATE_LOCALES, LANGS } from './i18n-core.js'

const placeholders = value => [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort()
const byCodeUnit = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)

describe('Brazilian Portuguese locale', () => {
  test('is a separately selectable locale with Brazilian date formatting', () => {
    expect(LANGS.pt).toBe('Português (Portugal)')
    expect(LANGS['pt-BR']).toBe('Português (Brasil)')
    expect(DATE_LOCALES['pt-BR']).toBe('pt-BR')
  })

  test('matches the source key set and preserves interpolation placeholders', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(pt).sort())
    for (const [source, translated] of Object.entries(ptBR)) {
      expect(placeholders(translated), source).toEqual(placeholders(source))
    }
  })

  test('makes every inherited pt-PT value an explicit reviewed snapshot', () => {
    const inherited = Object.entries(pt)
      .filter(([key]) => !(key in PT_BR_OVERRIDES))
      .sort(byCodeUnit)
    const fingerprint = createHash('sha256').update(JSON.stringify(inherited)).digest('hex')

    // 291 -> 292: kunci catatan waktu salat masuk PT_BR_OVERRIDES, karena dia memang
    // berbeda regional — Portugal menulis "Ramadão", Brasil "Ramadã". Ditaruh di overrides
    // dan bukan ditempel di ekor default export, supaya dia tidak TERLIHAT diwarisi padahal
    // sebenarnya di-override; itu justru drift yang tes ini ada untuk menangkapnya.
    // 292 -> 293: kunci tingkat-4 slot demo juga berbeda regional (Portugal "define uma
    // zona", Brasil "defina uma regiao"). Perhatikan bahwa `inherited` dan hash-nya TIDAK
    // berubah karenanya — kunci yang masuk overrides keluar dari himpunan warisan, dan itu
    // justru bukti mekanismenya bekerja seperti yang dirancang.
    // 293 -> 294: 'No exercises yet.' juga berbeda regional. Portugal menulis "Ainda sem
    // exercícios."; Brasil memakai bentuk "Ainda não há", persis seperti kunci sebelahnya yang
    // sudah lama di-override. Jadi dia override, bukan warisan.
    //
    // 294 -> 260: turun 34, dan itu PEMBERSIHAN bukan kehilangan. Lapis auth upstream dicabut
    // (passkey, self-host, pairing app HP, dasbor admin, web push), jadi override untuk
    // string-string itu tidak menunjuk apa pun lagi. Plus 12 override baru untuk auth Supabase.
    // Selisihnya: 294 - 46 dihapus + 12 baru = 260.
    //
    // 260 -> 266: mode Ramadan. Enam kunci berbeda regional, dan lima di antaranya karena satu
    // kata: Portugal menulis "Ramadão", Brasil "Ramadã" — pembeda yang sudah tercatat di pack
    // ini sejak kunci waktu salat masuk.
    // 266 -> 268: jeda salat. Dua kunci berbeda regional ("guardadas/parastes" vs
    // "salvas/parou", dan "temporizador" vs "cronometro").
    expect(Object.keys(PT_BR_OVERRIDES)).toHaveLength(268)
    // 449 -> 452 -> 457 -> 459. Tiga gelombang:
    //   +3  demo gerakan ('also', 'start position', 'end position')
    //   +5  waktu salat ('Prayer times', 'Prayer city', 'Imsak', 'tomorrow', '{0} now')
    //   +2  dua celah lama yang tidak pernah ada di pack mana pun: 'Exercise' (tunggal) dan
    //       'full body'. Yang kedua itu label chip filter di tiga layar dan tampil Inggris di
    //       ke-13 bahasa; lihat scripts/audit-locale-keys.mjs untuk kenapa checker lain tidak
    //       bisa melihatnya. Kata Brasilnya sama dengan Portugal, jadi keduanya diwarisi.
    // Semuanya ditambahkan ke pt DAN pt-BR dengan nilai identik, jadi masuk sebagai warisan.
    // Kunci catatan waktu salat TIDAK ada di sini — dia jadi override, lihat di atas.
    // Selisihnya cocok tanpa sisa: itu reviewnya. Hash diambil dari
    // scripts/pt-br-inheritance-fingerprint.mjs, bukan ditempel dari pesan kegagalan.
    //
    // 459 -> 445: sama, pencabutan lapis auth. Kunci warisan untuk passkey/self-host/push ikut
    // pergi, dan 11 kunci auth Supabase yang kata Brasilnya sama dengan Portugal masuk sebagai
    // warisan baru.
    //
    // 445 -> 450: lima kunci mode Ramadan yang kata Brasilnya sama dengan Portugal.
    // 450 -> 453: tiga kunci jeda salat yang kata Brasilnya sama dengan Portugal.
    // 453 -> 456: tiga kunci tanggal Hijriah, kata Brasilnya sama dengan Portugal.
    expect(inherited).toHaveLength(456)
    // If this fails, review the changed keys and wording before accepting a new hash. From
    // frontend/: node scripts/pt-br-inheritance-fingerprint.mjs --list
    //
    // Hash ini berubah lebih sering daripada jumlahnya, dan itu memang gunanya. Kali ini dua
    // kunci warisan DIGANTI NAMA sekaligus diubah kata-katanya — 'no animation' jadi 'no demo
    // photo', dan '{0} exercises with animations' jadi '{0} exercises · {1} with demo photos' —
    // karena app ini tidak punya animasi sama sekali. Jumlahnya tidak bergerak untuk itu; cuma
    // hash-nya. Tanpa hash, perubahan kata pada terjemahan warisan lolos tanpa direview.
    expect(fingerprint, 'pt-PT inheritance changed; review the inherited pt-BR wording').toBe('ec27556ba374e329f7b34ebce7113756095a28c37ca61edcdd7cbc9bfbdd716e')
  })

  test('does not leak European Portuguese UI terms', () => {
    const text = Object.values(ptBR).join('\n')
    const europeanPortuguese = /(?:^|[^\p{L}])(?:ficheiro\p{L}*|telemóvel\p{L}*|ecrã\p{L}*|regist(?:o|am|ado|ada|ados|adas)|eliminad\p{L}*|definições|cronómetro|detetad\p{L}*|gémeos|abdómen|anca|coifa dos rotadores|escadora|completaste|acabaste|aguentas|definires|completares|aguenta|aguentaste|ficaste|viajares)(?=$|[^\p{L}])/iu
    expect(text).not.toMatch(europeanPortuguese)
    expect(text).not.toMatch(/[«»]/u)
    expect(ptBR.Save).toBe('Salvar')
    expect(ptBR.Settings).toBe('Configurações')
    expect(ptBR['Delete workout']).toBe('Excluir treino')
    expect(ptBR.Superset).toBe('Superset')
    expect(ptBR['Guest mode — data lives only in this browser.']).toContain('visitante')
    // Dulu di sini dipaku 'Sign in with passkey' -> 'chave de acesso'. Kunci itu pergi bersama
    // pencabutan lapis auth passkey. Penggantinya memaku kelas kebocoran yang SAMA dan lebih
    // penting: Portugal menulis "iniciar sessão", Brasil "entrar". Kalau pt-BR mulai berbunyi
    // "iniciar sessão", itu persis pt-PT yang bocor.
    expect(ptBR['Sign in with email']).toBe('Entrar com e-mail')
    expect(ptBR['Sign in with email']).not.toContain('sessão')
    expect(ptBR['Continue with Google']).toContain('Continuar')
    expect(ptBR.band).toBe('elástico')
    expect(ptBR['resistance band']).toBe('faixa elástica')
    expect(ptBR.soleus).toBe('sóleo')
    expect(ptBR.Unpair).toBe('Desvincular')
    expect(ptBR['Starter plan loaded — Mon Push · Wed Pull · Fri Legs']).toContain('Seg Push · Qua Pull')
  })
})
