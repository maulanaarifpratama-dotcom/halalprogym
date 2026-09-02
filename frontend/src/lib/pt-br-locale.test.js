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
    // 268 -> 289: catatan makan. 21 kunci berbeda regional, sebagian besar karena Portugal
    // menulis "hidratos"/"registar"/"porção ... parou" di mana Brasil menulis
    // "carboidratos"/"registrar"/"digite".
    // 289 -> 324: perkiraan gizi AI. 36 dari 45 kunci baru berbeda regional, dan
    // proporsi itu masuk akal: teksnya panjang dan penuh kata yang justru paling berbeda
    // antara kedua varian — Portugal "registar/ligação/predefinicao/dispositivo", Brasil
    // "registrar/conexao/padrao/aparelho", ditambah bentuk sapaan "tu" lawan "voce" yang
    // muncul di hampir setiap kalimat perintah di lembar ini.
    // 324 -> 325: 'Ramadan'. Portugal menulis "Ramadao", Brasil "Ramada" — pembeda yang
    // sudah tercatat di pack ini sejak kunci waktu salat masuk. Dia sempat masuk ke blok
    // ekor default export, dan tes ini yang menangkapnya: kunci yang TAMPAK diwarisi tapi
    // sebenarnya di-override adalah tepat drift yang mekanisme ini ada untuk menemukan.
    // 325 -> 335: sebelas kunci katalog makanan bawaan MASUK, satu kunci lama KELUAR.
    //
    // Yang keluar: "No built-in food database ...". Teks sumbernya dihapus karena klaimnya jadi
    // salah begitu database bawaannya benar-benar ada, dan kunci yang menunjuk teks yang tidak
    // ada lagi ditolak `locale-orphans`.
    //
    // Delapan dari yang masuk berbeda regional dan bukan selera: "banco de dados" (BR) vs
    // "base de dados" (PT), "buscar" vs "procurar", "carregando" vs "a carregar", "digite" vs
    // "escreve" — dan sapaan orang kedua, karena pack PT memakai bentuk *tu* ("teus alimentos")
    // sementara BR memakai *você* ("seus alimentos").
    //
    // Tiga sisanya nilainya IDENTIK dengan pt-PT: 'Ingrediente', 'Produto', dan baris atribusi
    // yang isinya nama lembaga dan nama lisensi. Ketiganya tetap ditulis sebagai override, dan
    // itu bukan kelalaian — ada 16 override lain yang juga identik sebelum katalog makanan ada.
    // Fungsinya MEMAKU nilainya: kalau kata pt-PT diperbaiki nanti, pt-BR tidak ikut berubah
    // tanpa ada yang meninjaunya. Untuk baris atribusi lisensi itu justru yang diinginkan.
    // 335 -> 338: tiga kunci satuan porsi ('per 100 {0}', 'How many ml?', 'Pack'). Semuanya
    // jadi override karena kata Brasilnya berbeda dari Portugal: 'Embalagem' dipakai keduanya
    // tapi 'Quantos ml?' vs bentuk *tu* di pack PT, dan 'por 100 {0}' ditulis eksplisit supaya
    // satuan porsi tidak ikut berubah kalau pt-PT diubah tanpa peninjauan.
    //
    // Kunci ini ada karena satu pertanyaan di layar: "29 kkal itu dari berapa ml?" Katalog dulu
    // menulis "per 100 g" untuk teh dalam botol, dan itu satuan yang tidak bisa dibayangkan
    // orang — lalu sebotol 350 ml dicatat sebagai 29 kkal padahal 102.
    // 338 -> 336: keadaan kosong lembar katalog dirancang ulang, dan tiga kunci ikut berubah.
    //
    // KELUAR: 'Loading the database…' dan 'Type at least two letters'. Yang pertama diganti ruang
    // tenang — chunk katalognya turun dalam puluhan milidetik, dan satu baris teks yang berkedip
    // lalu hilang lebih mengganggu daripada tidak ada apa-apa. Yang kedua adalah jalan buntu: dia
    // memberi perintah tanpa memberi tahu apa yang bisa dicari.
    //
    // KELUAR juga: 'Product'. Sekarang cuma bahan pokok yang ditandai, karena dia minoritas (59
    // dari 817) dan penandanya membawa informasi — label di SETIAP baris berhenti jadi label.
    //
    // MASUK: 'Search {0} packaged products and {1} Indonesian staples.', yang menjawab pertanyaan
    // yang orang benar-benar punya di layar kosong: apa isinya.
    // 336 -> 337: '{0} equipment type', pasangan tunggal dari kunci yang SUDAH jadi override
    // byte-identik di sini. Kata Brasilnya sama dengan Portugal, jadi warisan akan cukup —
    // yang tidak cukup adalah membiarkan separuh pasangan dipaku dan separuhnya diwarisi.
    // Kalau pt-PT nanti mengubah 'tipos de equipamento', tunggalnya ikut bergerak sementara
    // pluralnya tidak, dan pt-BR menampilkan dua kata berbeda untuk satu hal.
    // 337 -> 339: 'Next week' dan 'Next month'. Sembilan nama kontrol ikon (aria-label) masuk
    // sekaligus — dulu semuanya ditulis langsung dalam bahasa Inggris di JSX, jadi pembaca
    // layar menyebut "Increase" tiap kali beban ditambah, di ke-13 bahasa. Tujuh di antaranya
    // kata yang sama di kedua varian Portugis dan diwarisi; dua ini tidak, karena Portugal
    // memakai 'seguinte' sementara Brasil mengatakan 'proxima/proximo'.
    expect(Object.keys(PT_BR_OVERRIDES)).toHaveLength(339)
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
    // 456 -> 480: 24 kunci catatan makan yang kata Brasilnya sama dengan Portugal.
    // 480 -> 489: sembilan kunci perkiraan gizi AI yang kata Brasilnya sama dengan
    // Portugal — istilah teknis dan frasa pendek tanpa sapaan ('IA', 'Chave de API',
    // 'Gramas por porção', 'Não configurado'). 36 sisanya jadi override, lihat di atas.
    // 489 -> 492: tiga kunci jendela latihan hari puasa ('Good time to train', 'before
    // iftar', 'after Tarawih'). Kata Brasilnya sama dengan Portugal — 'iftar' dan
    // 'Tarawih' istilah pinjaman yang tidak berbeda regional, dan 'Boa hora para treinar'
    // dipakai di kedua varian. Jadi warisan, bukan override.
    // 492 -> 494: dua kunci satuan hitungan mundur ('{0} hr {1} min', '{0} min'). Portugal
    // dan Brasil sama-sama memakai 'h' dan 'min', jadi warisan.
    // Katalog makanan bawaan TIDAK mengubah angka ini: sebelas kuncinya semua jadi override
    // eksplisit, dan kunci lama yang dihapus juga override. Jadi warisannya tetap 494.
    // 494 -> 498: EMPAT dari lima kunci bentuk tunggal yang baru. Bentuk tunggal ada karena
    // hitungan 1 membaca "1 sets", "1 workouts", "1 equipment types" di layar — plural
    // Inggris tidak otomatis kalau string Inggrisnya adalah kuncinya sendiri. Keempat yang
    // diwarisi ('{0} set', 'Set {0}', 'Warm-up set {0}', '{0} set · {1} work') memakai kata
    // yang sama di Portugal dan Brasil: 'série', 'Série de aquecimento', 'de trabalho'.
    // Yang KELIMA, '{0} equipment type', justru jadi override — bukan karena katanya beda,
    // tapi karena bentuk PLURAL-nya sudah lebih dulu dipaku sebagai override byte-identik
    // di sini. Pasangan tunggal/plural yang separuhnya diwarisi bisa terpisah kalau pt-PT
    // mengubah salah satunya, dan pasangan yang terpisah adalah tepat jenis kebocoran yang
    // berkas ini dibuat untuk mencegah.
    // 498 -> 499: satu kunci kardio, '{0} min @ {1} km/h'. Ringkasan kardio dulu menulis
    // "20 min @ 8 km/h" langsung di template, jadi tidak diterjemahkan sama sekali; Portugal
    // dan Brasil sama-sama memakai 'min' dan 'km/h', jadi warisan.
    // 499 -> 506: tujuh dari sembilan nama kontrol ikon. 'Limpar', 'Diminuir', 'Aumentar',
    // 'Mover para cima', 'Mover para baixo', 'Semana anterior', 'Mes anterior' — kata yang
    // sama di Portugal dan Brasil. Dua sisanya jadi override, lihat di atas.
    expect(inherited).toHaveLength(506)
    // If this fails, review the changed keys and wording before accepting a new hash. From
    // frontend/: node scripts/pt-br-inheritance-fingerprint.mjs --list
    //
    // Hash ini berubah lebih sering daripada jumlahnya, dan itu memang gunanya. Kali ini dua
    // kunci warisan DIGANTI NAMA sekaligus diubah kata-katanya — 'no animation' jadi 'no demo
    // photo', dan '{0} exercises with animations' jadi '{0} exercises · {1} with demo photos' —
    // karena app ini tidak punya animasi sama sekali. Jumlahnya tidak bergerak untuk itu; cuma
    // hash-nya. Tanpa hash, perubahan kata pada terjemahan warisan lolos tanpa direview.
    //
    // Kali ini hash bergerak karena dua hal sekaligus: sembilan kunci warisan baru di atas,
    // DAN satu kunci warisan lama yang dihapus. Catatan kaki "tidak ada database makanan
    // bawaan" sekarang menyebut jalan keluarnya — perkiraan AI dengan kunci sendiri — jadi
    // string sumbernya berubah dan kunci lamanya tidak menunjuk apa pun lagi. Itu ditangkap
    // oleh locale-orphans.test.ts, bukan oleh tes ini, dan itu memang pembagian kerjanya.
    //
    // Bergerak lagi 2026-09-02, dan JUMLAHNYA TIDAK — persis kasus yang membuat hash ini ada.
    // Satu kunci warisan diganti nama sekaligus diubah kata-katanya: '{0} exercises · {1} with
    // demo photos' jadi '{0} exercises · {1} with demos'. Sebabnya klaimnya jadi salah — 86 dari
    // 401 demo sekarang ILUSTRASI RepDB, bukan foto, karena ilustrasi menang atas foto untuk
    // latihan yang tercakup keduanya (aturan aurat di DESIGN.md).
    //
    // Tanpa hash, perubahan kata pada terjemahan warisan seperti ini lolos tanpa direview.
    expect(fingerprint, 'pt-PT inheritance changed; review the inherited pt-BR wording').toBe('b780c55cc49a7faae0a6ed8015ca6b3a1e431335164d6170e272d9cf9b4444e3')
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

