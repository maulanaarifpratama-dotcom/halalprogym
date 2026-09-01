#!/usr/bin/env node
/**
 * Membangun `src/lib/food-retail.js` — produk ritel Indonesia dari Open Food Facts.
 *
 * KENAPA OPEN FOOD FACTS, DAN APA KEWAJIBANNYA
 *
 * Lisensinya tiga lapis, dan bedanya menentukan apa yang boleh diambil:
 *
 *   · databasenya  -> ODbL 1.0     : turunannya wajib ODbL + atribusi
 *   · isinya       -> DbCL 1.0     : fakta per-produk, bebas
 *   · GAMBARNYA    -> CC BY-SA 3.0 : share-alike menular ke karya turunan
 *
 * Jadi skrip ini mengambil NAMA DAN ANGKA SAJA. Nol gambar, nol URL gambar, nol field foto.
 * Itu bukan penghematan ukuran — itu yang membuat kewajibannya berhenti di ODbL, dan repo ini
 * sudah punya satu jebakan media berlisensi (Gym visual) yang harganya dibayar dengan
 * membangun ulang seluruh demo gerakan.
 *
 * Atribusi ODbL ada di `NOTICE.md` dan di layar Pengaturan -> Tentang, dan berkas hasilnya
 * membawa pemberitahuannya sendiri di kepala. Dijaga tes, bukan ingatan.
 *
 * KENAPA TIDAK TKPI. Tabel Komposisi Pangan Indonesia (Kemenkes) isinya jauh lebih tepat untuk
 * pangan Indonesia, tapi repositori resminya menyatakan "(c) Copyright 2022. All Rights Reserved
 * by Kemenkes" tanpa satu pun pernyataan lisensi terbuka. Tidak boleh didistribusikan.
 *
 * ---------------------------------------------------------------------------------------------
 * SARINGAN HALAL, DAN KENAPA DIA KONSERVATIF
 *
 * OFF memuat produk beralkohol dan berbahan babi — sedikit di subset Indonesia, tapi ADA. Di app
 * bernama "Halal Pro" itu bukan soal hukum, itu soal produk.
 *
 * Yang dipakai untuk MEMBUANG cuma sinyal terstruktur:
 *   · `nutriments.alcohol_100g > 0`  -> angka, bukan tebakan
 *   · `categories_tags` yang menyebut alkohol/babi
 *
 * Kata kunci nama TIDAK dipakai untuk membuang otomatis, dan itu disengaja. Pencocokan kata
 * punya kegagalan yang justru paling berbahaya di bahasa Indonesia: **anggur** itu buah (jus
 * anggur halal), **root beer** dan **bir pletok** tidak beralkohol. Ini kelas kesalahan yang
 * sama dengan skor kemiripan yang DILARANG untuk pencocokan foto gerakan di repo ini —
 * kata yang hilang atau tersisa justru kata yang menentukan artinya.
 *
 * Jadi kata kunci cuma MENANDAI untuk `--report`, dan yang tertandai tetap dibuang secara
 * default karena asimetrinya nyata: kehilangan beberapa produk halal jauh lebih murah daripada
 * mengirim satu produk haram. Yang ingin dipulihkan masuk ke `IZINKAN` di bawah — daftar yang
 * diperiksa manusia, bukan ambang yang disetel.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const REPORT = process.argv.includes('--report')

/**
 * Menulis katalog dari halaman yang SUDAH ada di cache, walau belum semuanya.
 *
 * Tanpa bendera ini skrip menolak menulis apa pun saat terhenti, dan itu default yang benar:
 * katalog separuh yang ditulis diam-diam adalah bug yang tidak akan dilaporkan siapa pun — orang
 * cuma tidak menemukan makanannya dan menyimpulkan app-nya payah.
 *
 * Dengan bendera ini, ketidaklengkapannya DICATAT DI KEPALA BERKAS HASIL, jadi dia tidak bisa
 * sunyi. Itu bedanya "sebagian dan diketahui" dari "sebagian dan disembunyikan".
 */
const PARTIAL = process.argv.includes('--allow-partial')

// Cache di LUAR `public/`. Vite menyalin `public/` ke `dist/` di SETIAP build, dan repo ini sudah
// pernah mengirim 39 MB media yang tidak dipakai ke Vercel karena itu.
const CACHE = fileURLToPath(new URL('../food-cache/', import.meta.url))
const OUT = fileURLToPath(new URL('../src/lib/food-retail.js', import.meta.url))

const UA = 'HalalProGym/0.1 (github.com/maulanaarifpratama-dotcom/halalprogym)'
/**
 * ENDPOINT: `search.openfoodfacts.org`, BUKAN `world.openfoodfacts.org/api/v2/search`.
 *
 * Ini bukan pilihan gaya, dan jalan menuju sini panjang — jadi ditulis supaya tidak diulang:
 *
 *   · `/api/v2/search` dengan `page_size=100` + `fields` yang memuat `nutriments` membalas **503**
 *     berulang kali. Halaman yang sama membalas **200 seketika** dengan `fields=code` saja, jadi
 *     yang menjatuhkannya BIAYA PER-REQUEST, bukan rate limit. Diagnosis pertama saya salah di
 *     sini: saya memperlambat jeda ke 15 detik, dan itu tidak memperbaiki apa pun.
 *   · `page_size` dipagari 100 di server, jadi tidak bisa dikompensasi dengan halaman besar.
 *   · `sort_by=popularity_key` memperburuknya: query itu lebih mahal lagi.
 *   · Menurunkan ke `page_size=25` memang lolos, tapi jadi 349 request yang tetap sering 503.
 *
 * `search.openfoodfacts.org` (search-a-licious) adalah layanan pencarian OFF yang memang dibuat
 * untuk ini: **600 produk dalam 3 detik tanpa jeda sama sekali**, dengan daftar field lengkap.
 * Diukur, bukan diharapkan.
 *
 * Bentuk responsnya BEDA dari v2, dan tiga bedanya menggigit kalau tidak diperhatikan:
 *   · hasilnya di `hits`, bukan `products`
 *   · `brands` ARRAY, bukan string dipisah koma
 *   · sintaks query harus `countries_tags:"en:indonesia"` — `countries:indonesia` dan
 *     `countries_tags:en:indonesia` keduanya mengembalikan NOL tanpa error
 *
 * Yang terakhir itu paling berbahaya: nol hasil tanpa error terbaca seperti "Indonesia memang
 * tidak punya data", dan seluruh fitur akan dibatalkan atas dasar yang salah.
 */
const PAGE_SIZE = 100
// `serving_size` TIDAK ADA di endpoint ini — sudah diperiksa dengan membuang filter field dan
// membaca seluruh kunci yang dikembalikan. Memintanya tetap tidak error, dia cuma tidak datang,
// dan akibatnya porsi kemasan NOL di semua 759 baris tanpa satu pun tanda. Yang dipakai
// sekarang `quantity` ("350 ml"), yang memang ada.
const FIELDS = 'code,product_name,brands,quantity,nutriments,categories_tags,unique_scans_n'

/**
 * SEMUA halaman diambil, lalu popularitasnya diurutkan DI SINI — bukan di server.
 *
 * Percobaan pertama memakai `sort_by=popularity_key`, dan itu keliru dengan cara yang menarik:
 * tanpa sorting, 10 halaman lolos beruntun di jeda 7 detik; DENGAN sorting, halaman ketiga
 * ditolak 503 delapan kali berturut-turut. Jadi yang menjatuhkannya bukan rate limit — itu query
 * mahal yang membuat server menyerah. Diukur, bukan ditebak.
 *
 * `unique_scans_n` sudah ikut diminta di FIELDS, jadi peringkat popularitasnya bisa dihitung
 * lokal atas data lengkap. Hasilnya lebih baik daripada rencana awal: peringkatnya atas SELURUH
 * 8.703 produk, bukan atas urutan yang kebetulan dikembalikan server.
 */
const MAX_HALAMAN = Number(process.env.FOOD_PAGES || 999)

/**
 * Berapa produk yang akhirnya dibundel. Batas ini keputusan produk, bukan teknis.
 *
 * Ekor panjang OFF adalah produk yang nyaris tidak pernah dipindai, datanya paling bolong, dan
 * setiap barisnya menambah unduhan orang di sinyal gym basement — pengguna sasaran app ini.
 *
 * Yang dibuang karena batas ini DILAPORKAN, tidak dipotong diam-diam: potongan yang sunyi
 * terbaca sebagai "sudah lengkap" padahal tidak.
 */
const TOP_N = Number(process.env.FOOD_TOP || 2500)

/** Tag kategori yang berarti langsung dibuang. */
const TAG_HARAM = [
  'alcoholic-beverages', 'beers', 'wines', 'spirits', 'liqueurs', 'ciders',
  'pork', 'pork-meat', 'hams', 'bacons', 'lards', 'pig-meat',
]

/**
 * Kata yang MENANDAI, dicocokkan pada BATAS KATA — bukan substring.
 *
 * Versi pertama memakai `includes()`, dan hasilnya kegagalan yang persis diperingatkan di kepala
 * berkas ini. Dari 25 produk yang ditandai, **24 salah** dan cuma satu benar:
 *
 *   'rum'  cocok dengan "**rum**put laut", "C**rum**py"
 *   'gin'  cocok dengan "ori**gin**al", "an**gin**", "extra vir**gin**"
 *   'ale'  cocok dengan "k**ale**", "D**ale**s", "j**ale**tot"
 *   'arak' cocok dengan "Ac**arak**i" (jamu), "g**arak** udon"
 *
 * Menariknya, batas kata saja juga TIDAK cukup: satu-satunya positif yang benar adalah
 * "San Miguel **Pale** Pilsen", dan 'ale' sebagai kata tidak ada di sana. Jadi perbaikannya dua
 * sisi — batas kata untuk berhenti menandai kata Indonesia biasa, DAN kata yang lebih spesifik
 * ('pilsen', 'pilsner') untuk menangkap yang memang minuman keras.
 *
 * Itu sebabnya `--report` ada, dan sebabnya laporannya harus benar-benar DIBACA: cacat ini tidak
 * terlihat dari kode maupun dari jumlah baris hasil. Dia cuma terlihat dari daftar namanya.
 */
const KATA_TANDAI = [
  // minuman keras — bentuk kata utuh
  'beer', 'beers', 'bier', 'birra', 'lager', 'stout', 'ale', 'ales', 'pilsen', 'pilsner',
  'wine', 'wines', 'vodka', 'whisky', 'whiskey', 'rum', 'brandy', 'cognac', 'gin', 'tequila',
  'sake', 'soju', 'liqueur', 'liquor', 'arak', 'tuak', 'ciu', 'absinthe', 'vermouth', 'champagne',
  // babi
  'pork', 'babi', 'bacon', 'lard', 'ham', 'hams', 'prosciutto', 'chorizo', 'pancetta', 'salami',
]

/**
 * Cocok pada batas kata. Angka dan tanda baca dihitung sebagai pemisah, jadi "Bir500" tetap
 * tertangkap sementara "rumput" tidak.
 */
const RE_TANDAI = new RegExp(
  '(^|[^a-z])(' + KATA_TANDAI.join('|') + ')([^a-z]|$)', 'i'
)

/**
 * Kekecualian yang diperiksa manusia: nama yang MENGANDUNG kata di atas tapi bukan haram.
 * Ditulis sebagai pola, dan setiap barisnya harus punya alasan.
 */
const IZINKAN = [
  /root\s*beer/i,      // minuman ringan, nol alkohol
  /bir\s*pletok/i,     // minuman rempah Betawi, nol alkohol
  /ginger\s*beer/i,    // umumnya nol alkohol
  /non[-\s]?alcohol/i, // dinyatakan sendiri
  // Minuman jeli buah merek Wings; nol alkohol, namanya kebetulan saja. Pengecualian ini
  // sempat MATI selama satu commit: `\b`-nya tertulis sebagai byte backspace literal oleh
  // heredoc, jadi regexnya tidak pernah cocok dan produknya tetap dibuang.
  /\bale[-\s]?ale\b/i,
]

const tidur = ms => new Promise(r => setTimeout(r, ms))

async function ambilHalaman(page) {
  // Nama cache memuat endpoint DAN ukuran halaman: cache dari endpoint atau page_size lain
  // memuat potongan populasi yang berbeda, dan mencampurnya berarti katalog dengan produk ganda
  // dan produk yang hilang sekaligus. Cache dari percobaan v2 sengaja tidak terpakai.
  const berkas = join(CACHE, 'sal-id-' + PAGE_SIZE + '-' + String(page).padStart(4, '0') + '.json')
  if (existsSync(berkas)) return JSON.parse(readFileSync(berkas, 'utf8'))
  const u = 'https://search.openfoodfacts.org/search'
    + '?q=' + encodeURIComponent('countries_tags:"en:indonesia"')
    + '&fields=' + FIELDS
    + '&page_size=' + PAGE_SIZE + '&page=' + page
  // OFF membalas 503 saat sibuk. Diulang dengan jeda menaik; menyerah setelah delapan kali dan
  // BERHENTI, bukan melanjutkan — halaman yang hilang berarti katalog yang bolong tanpa jejak.
  for (let i = 0; i < 8; i++) {
    const r = await fetch(u, { headers: { 'user-agent': UA } })
    if (r.status === 200) {
      const j = await r.json()
      writeFileSync(berkas, JSON.stringify(j), 'utf8')
      return j
    }
    await tidur(2000 * (i + 1))
  }
  throw new Error('halaman ' + page + ' gagal setelah 8 percobaan')
}

/** Angka dari OFF sering presisi absurd (471.014492753623). Dibulatkan sekali di sini. */
const b0 = n => Math.round(n)
const b1 = n => Math.round(n * 10) / 10

/**
 * Membersihkan nama produk. Datanya kontribusi pengguna, dan itu terlihat.
 *
 * Yang diperbaiki, urut dari yang paling merusak keterbacaan daftar:
 *
 *   "17000725 Oreo Original"          -> SKU di depan
 *   "SUSU ULTRA MILK COKLAT 250ML"    -> ALL-CAPS, dan ukuran kemasan diulang
 *   "Indomie Goreng Rendang 5X91G"    -> notasi multipack di ekor
 *   "Ultra milk full cream 250 ml E-1B" -> kode internal distributor
 *   "- Fresco", "Ahh'"                -> tanda baca menggantung
 *
 * UKURAN KEMASAN DIBUANG DARI NAMA, dan itu bukan penghematan karakter: ukurannya sekarang punya
 * tempat sendiri (chip "Kemasan · 350 ml" dan baris subjudul). Membiarkannya di nama berarti
 * informasi yang sama muncul dua kali di satu baris, dan daftar yang harus dipindai mata di gym
 * kehilangan tepat hal yang membuatnya bisa dipindai.
 *
 * Konsekuensinya kunci dedup HARUS memuat ukuran kemasan — kalau tidak, "Pocari Sweat 350ml" dan
 * "Pocari Sweat 500 ml" runtuh jadi satu nama dan salah satunya hilang. Itu produk yang berbeda.
 */

/** Satuan yang boleh muncul sebagai notasi ukuran di ekor nama. */
const RE_UKURAN_EKOR = /[\s(\[-]*\b\d+(?:[.,]\d+)?\s*(?:g|gr|gram|kg|ml|l|liter|lt)\b[\s)\]]*$/i
/** Multipack di ekor: "5X91G", "3 x 200 ml", "isi 10". */
const RE_MULTIPACK_EKOR = /[\s(\[-]*\b(?:isi\s*)?\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:g|gr|gram|kg|ml|l|liter)?\b[\s)\]]*$/i
/** Kode internal distributor di ekor: "E-1B", "PDS", "K-3". Huruf+angka pendek, bukan kata. */
const RE_KODE_EKOR = /\s+[A-Z]{1,3}-?\d{1,2}[A-Z]?$/

/**
 * Title case yang TIDAK merusak akronim dan merek.
 *
 * Dipakai HANYA kalau namanya nyaris seluruhnya kapital — nama yang campur ("Teh Pucuk Melati")
 * dibiarkan apa adanya, karena penulisnya sudah memutuskan. Token pendek (<= 3 huruf) dibiarkan
 * kapital: "ABC", "UHT", "PDS", "SKM" adalah merek dan singkatan, bukan kata yang salah tulis.
 */
function rapikanKapital(n) {
  const huruf = n.replace(/[^a-zA-Z]/g, '')
  if (huruf.length < 4) return n
  const kapital = (n.match(/[A-Z]/g) || []).length / huruf.length
  // Dua ujung yang dirapikan: nyaris seluruhnya KAPITAL, dan sama sekali TANPA kapital
  // ("ultra milk mini strawberry"). Yang di tengah dibiarkan — penulisnya sudah memutuskan.
  if (kapital > 0 && kapital < 0.7) return n
  return n.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return tok
    const h = tok.replace(/[^a-zA-Z]/g, '')
    if (h.length <= 3) return tok
    return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase()
  }).join('')
}

/**
 * Membuang segmen yang terulang di ekor: "Kopiko Cappucino - Kopiko - Kopiko - Kopiko".
 *
 * Polanya khas OFF: nama merek ditempelkan ke nama produk, sekali per kontributor. Lima baris
 * kena, dan lima baris jelek di daftar yang harus dipindai mata cukup untuk memperbaikinya.
 *
 * PEMISAHNYA TANDA HUBUNG BERSPASI, dan itu bukan detail. Memecah di setiap tanda hubung akan
 * merusak "Beng-beng" — merek sungguhan yang justru sangat dikenal. Dan menggabungkan kata kembar
 * berurutan (pendekatan yang sempat terpikir) akan merusak "Beng Beng Nuts", "Gado gado",
 * "Koro Koro", dan "Demi-Sel Sel": ketujuhnya nama yang benar. Kelas kesalahan yang sama dengan
 * substring — yang dibuang justru bagian yang menentukan artinya.
 */
function buangSegmenTerulang(n) {
  const seg = n.split(/\s+-\s+/)
  if (seg.length < 2) return n
  const out = []
  for (const t of seg) {
    const k = t.trim().toLowerCase()
    if (out.length && out[out.length - 1].trim().toLowerCase() === k) continue
    out.push(t)
  }
  // Ekor yang KATANYA sudah muncul lebih awal di nama itu sendiri juga mubazir:
  // "Kopiko Cappucino - Kopiko". Yang belum muncul dibiarkan — "… - Rious" adalah informasi.
  while (out.length > 1) {
    const ekor = out[out.length - 1].trim().toLowerCase()
    const depan = out.slice(0, -1).join(' ').toLowerCase()
    if (ekor && depan.includes(ekor)) out.pop()
    else break
  }
  return out.join(' - ')
}

/**
 * Satuan yang ditulis kontributor di EKOR NAMA — 'ml', 'g', atau null.
 *
 * Ini sinyal terstruktur yang sebelumnya dibuang bersama ukurannya, dan itu kehilangan yang mahal.
 * `quantity` dari OFF ternyata sampah untuk sebagian besar produk ("1", "1000", "RH. 30", "23"),
 * tapi NAMANYA justru membawa satuannya: "Buavita Juice Jambu 245ml", "Frestea madu 500 Ml".
 *
 * Dan dia membedakan yang TIDAK bisa dibedakan kata kunci: "kopi tubruk gadjah 150 gr" dan
 * "ABC Kopi Susu 27g" itu BUBUK, sementara "Frestea Teh Melati 350ml" cair. Menandai cair dari
 * kata "kopi" atau "teh" akan salah pada dua yang pertama — kelas yang sama dengan `rum` yang
 * cocok dengan "rumput laut".
 */
function satuanEkor(s) {
  const m = String(s || '').toLowerCase().match(RE_UKURAN_EKOR)
  if (!m) return null
  return /(ml|liter|mililiter)/.test(m[0]) || /\bl\b/.test(m[0]) ? 'ml' : 'g'
}

function bersihkanNama(s) {
  let n = String(s || '')
    .replace(/^\s*\d{5,}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Ekor dibuang berlapis: satu nama bisa punya multipack DAN ukuran, "5X91G 91g".
  for (let i = 0; i < 3; i++) {
    const sebelum = n
    n = n.replace(RE_KODE_EKOR, '')
      .replace(RE_MULTIPACK_EKOR, '')
      .replace(RE_UKURAN_EKOR, '')
      .trim()
    if (n === sebelum) break
  }

  n = buangSegmenTerulang(n)
  n = rapikanKapital(n)

  return n
    .replace(/^[\s\-–—_.,:;'"`(\[]+/, '')
    .replace(/[\s\-–—_.,:;'"`([]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Apakah hasilnya masih berbentuk nama makanan.
 *
 * Nama satu-dua huruf, atau yang isinya cuma angka dan tanda baca, TIDAK berguna di daftar
 * pencarian: orang tidak bisa mengenalinya dan tidak bisa memverifikasinya ke kemasan. Lebih
 * baik hilang daripada jadi baris yang membingungkan.
 */
function namaWajar(n) {
  if (n.length < 3 || n.length > 80) return false
  // Wajib ada setidaknya tiga huruf berurutan — "ABC" lolos, "3 In" lolos, "A1" tidak.
  return /[a-z]{3}/i.test(n)
}

/**
 * Merek: ambil yang pertama, dan buang kalau sudah termuat di namanya.
 *
 * `brands` dari search-a-licious itu ARRAY (`["Bango"]`), sementara v2 mengembalikan string
 * dipisah koma. Keduanya ditangani, karena `String(["a","b"])` menghasilkan "a,b" dan itu
 * kebetulan benar — tapi mengandalkan kebetulan tanpa menyebutnya adalah cara bug ini kembali.
 */
function bersihkanMerek(brands, nama) {
  const teks = Array.isArray(brands) ? brands.join(',') : String(brands || '')
  let m = teks.split(',')[0].trim().replace(/\s+/g, ' ')
  if (!m) return ''
  if (m.length > 28) return ''
  // Casing merek di OFF acak: "mayora", "Mayora", "MAYORA" untuk perusahaan yang sama. Di daftar
  // yang diurut dan dipindai mata, tiga bentuk satu merek terlihat seperti tiga merek.
  m = rapikanKapital(m)
  if (/^[a-z]/.test(m)) m = m.charAt(0).toUpperCase() + m.slice(1)
  // Dibuang kalau sudah termuat di namanya — perbandingannya setelah dirapikan, supaya
  // "Ultra Milk" vs "ultrajaya" tidak lolos karena bedanya cuma huruf besar.
  if (nama.toLowerCase().includes(m.toLowerCase())) return ''
  return m
}

/**
 * Ukuran KEMASAN dari `quantity` ("350 ml", "85 g", "5 x 91 g").
 *
 * Ini yang menjawab pertanyaan yang paling sering muncul di layar: "29 kkal itu dari berapa ml?"
 * Tanpa ini satu-satunya tombol porsi adalah 100 g, dan Teh Pucuk 350 ml akan dicatat sebagai 29
 * kkal padahal sebotolnya ~102 kkal — salah lebih dari tiga kali lipat, ke arah yang membuat
 * orang mengira dia makan lebih sedikit daripada kenyataannya.
 *
 * MULTIPACK dipecah ke SATU unit: "5 x 91 g" jadi 91, bukan 455. Orang makan satu bungkus, bukan
 * satu dus — dan tombol "455 g" untuk Indomie 5-pak adalah tombol yang tidak pernah benar.
 */
function kemasanGram(quantity) {
  const t = String(quantity || '').toLowerCase().replace(',', '.')
  // Multipack lebih dulu, karena polanya memuat pola tunggal di dalamnya.
  const multi = t.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|gr|gram|ml|l|liter)\b/)
  const tunggal = t.match(/(\d+(?:\.\d+)?)\s*(g|gr|gram|ml|l|liter)\b/)
  const m = multi ? { n: Number(multi[2]), u: multi[3] } : tunggal ? { n: Number(tunggal[1]), u: tunggal[2] } : null
  if (!m || !Number.isFinite(m.n) || m.n <= 0) return 0
  // Liter dan kilogram-nya sengaja tidak ditangani sebagai unit terpisah selain `l`: OFF menulis
  // "1 l" untuk Ultra Milk 1 liter, dan itu satu-satunya bentuk yang benar-benar muncul.
  const g = /^l/.test(m.u) ? m.n * 1000 : m.n
  if (g < 1 || g > 5000) return 0
  return Math.round(g)
}

/**
 * Tag OFF yang benar-benar berarti CAIR. Dicocokkan EKSAK, bukan substring.
 *
 * Versi pertama memakai regex `/beverage|drink|water|.../`, dan itu langsung menandai **Indomie
 * Goreng Rendang** sebagai minuman — karena tag payung OFF `en:plant-based-foods-and-beverages`
 * memuat kata "beverages" dan mencakup makanan DAN minuman sekaligus.
 *
 * Ini jebakan substring yang KETIGA di fitur ini, setelah `rum` di "rumput laut" dan `gin` di
 * "original". Kelas yang sama, tempat yang beda tiap kali. Pelajarannya bukan "hati-hati dengan
 * kata kunci" — pelajarannya **jangan mencocokkan sebagian pada data yang berhierarki**: yang
 * hilang atau tersisa justru bagian yang menentukan artinya.
 *
 * Dua payung yang SENGAJA tidak masuk daftar:
 *   · `plant-based-foods-and-beverages`         — mencakup keduanya
 *   · `beverages-and-beverages-preparations`    — memuat bubuk seperti Energen, yang per 100 g
 */
const TAG_CAIR = new Set([
  'beverages', 'waters', 'mineral-waters', 'spring-waters', 'flavoured-waters',
  'juices', 'fruit-juices', 'vegetable-juices', 'fruit-based-beverages', 'nectars',
  'sodas', 'carbonated-drinks', 'colas', 'lemonades',
  'teas', 'iced-teas', 'green-teas', 'black-teas',
  'coffees', 'coffee-drinks', 'iced-coffees',
  'milks', 'dairy-drinks', 'fermented-milk-products', 'yogurt-drinks',
  'plant-based-beverages', 'soy-milks', 'almond-milks',
  'energy-drinks', 'sports-drinks', 'isotonic-drinks',
  'syrups', 'concentrated-syrups',
])

/**
 * Apakah produknya CAIR, dan kenapa itu bukan kosmetik.
 *
 * Angka gizi OFF selalu per 100 gram, dan untuk minuman UI harus mengatakan "per 100 ml" — bukan
 * karena lebih rapi, tapi karena "per 100 g" untuk teh dalam botol adalah satuan yang tidak bisa
 * dibayangkan orang, dan satuan yang tidak bisa dibayangkan membuat orang menebak.
 *
 * Untuk minuman berbasis air, 100 ml dan 100 g selisihnya di bawah 5%; itu perkiraan yang
 * disebutkan, bukan disembunyikan.
 *
 * Sinyalnya kategori OFF DAN satuan kemasannya, karena keduanya sering kosong sendiri-sendiri.
 */
function cair(tags, quantity, satuanDariNama, servingSize) {
  if (tags.some(t => TAG_CAIR.has(t))) return true
  // Satuan yang kontributor tulis SENDIRI — dari ekor nama atau dari ukuran porsi. Bukan tebakan,
  // dan bukan kata kunci: itu yang membuat "kopi tubruk 150 gr" tetap gram.
  if (satuanDariNama === 'ml') return true
  if (/\d+(?:[.,]\d+)?\s*(ml|liter|mililiter)\b/.test(String(servingSize || '').toLowerCase())) return true
  return /\b\d+(?:\.\d+)?\s*(ml|l|liter)\b/.test(String(quantity || '').toLowerCase())
}

/**
 * Kunci dedup: NAMA + UKURAN KEMASAN. Merek sengaja TIDAK ikut.
 *
 * Ukuran kemasan wajib ikut sejak ukurannya dibuang dari nama — tanpa itu "Pocari Sweat 350ml"
 * dan "Pocari Sweat 500 ml" runtuh jadi satu dan salah satunya hilang. Itu produk berbeda.
 *
 * Merek TIDAK ikut karena dia sering kosong di sebagian baris untuk produk yang sama:
 * "Ultra milk full cream" muncul tiga kali — dengan merek, tanpa merek, dan dengan kapital yang
 * berbeda. Untuk catatan makan, dua baris dengan nama dan ukuran yang sama ADALAH hal yang sama,
 * dan tiga baris kembar di daftar yang harus dipindai mata lebih buruk daripada satu baris yang
 * mereknya kurang lengkap. Yang menang tetap yang datanya paling lengkap.
 */
const kunci = (nama, kemasan) =>
  (nama + '|' + (kemasan || 0)).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

async function main() {
  if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true })

  const pertama = await ambilHalaman(1)
  const total = Number(pertama.count) || 0
  const halaman = Math.min(MAX_HALAMAN, Number(pertama.page_count) || Math.ceil(total / PAGE_SIZE))
  if (!total) {
    // NOL hasil tanpa error adalah kegagalan yang paling menipu di sini: dia terbaca seperti
    // "Indonesia memang tidak punya data", dan sintaks query yang salah menghasilkan tepat itu.
    console.error('OFF mengembalikan NOL produk. Itu hampir pasti sintaks query, bukan data.')
    console.error('Yang benar: countries_tags:"en:indonesia" (dengan tanda kutip).')
    process.exit(1)
  }
  console.log('OFF melaporkan ' + total + ' produk Indonesia dalam ' + halaman + ' halaman')

  const mentah = [...(pertama.hits || [])]
  let terhentiDi = 0
  for (let p = 2; p <= halaman; p++) {
    let j = null
    try {
      j = await ambilHalaman(p)
    } catch (e) {
      // BERHENTI RAPI, bukan menulis katalog yang bolong. Skrip ini tahan-ulang: halaman yang
      // sudah ada di cache tidak diunduh lagi, jadi menjalankannya kembali melanjutkan dari
      // titik ini. Katalog separuh jadi yang ditulis diam-diam adalah bug yang tidak akan
      // dilaporkan siapa pun — orang cuma tidak menemukan makanannya.
      console.error('\nBERHENTI di halaman ' + p + ': ' + e.message)
      console.error('Cache aman. Jalankan ulang perintah yang sama untuk melanjutkan.')
      if (!PARTIAL) {
        console.error('Berkas keluaran TIDAK ditulis, karena katalog belum lengkap.')
        console.error('Pakai --allow-partial kalau memang mau menulis apa yang sudah ada.')
        process.exit(2)
      }
      console.error('--allow-partial: menulis ' + (p - 1) + ' halaman yang sudah ada.')
      terhentiDi = p - 1
      break
    }
    mentah.push(...(j.hits || []))
    if (p % 5 === 0) console.log('  halaman ' + p + '/' + halaman + ' (' + mentah.length + ' produk)')
    // 300 ms: bukan karena dibutuhkan — 47 halaman berturut-turut tanpa jeda pun lolos — tapi
    // karena ini layanan gratis milik proyek nirlaba, dan skrip ini dijalankan ulang tiap kali
    // katalognya disegarkan.
    await tidur(300)
  }

  const buang = { namaTakWajar: 0, tanpaKcal: 0, kcalAneh: 0, makroAneh: 0, alkohol: 0, tagHaram: 0, tertandai: 0, duplikat: 0 }
  const tandaiContoh = []
  const atwaterMeleset = []
  const peta = new Map()

  for (const p of mentah) {
    // Dihitung dari nama ASLI, sebelum ekornya dibuang — setelah itu satuannya sudah hilang.
    const satuanNama = satuanEkor(p.product_name)
    const nama = bersihkanNama(p.product_name)
    if (!namaWajar(nama)) { buang.namaTakWajar++; continue }

    const n = p.nutriments || {}
    const tags = (p.categories_tags || []).map(t => String(t).replace(/^[a-z]{2}:/, ''))

    if (typeof n.alcohol_100g === 'number' && n.alcohol_100g > 0) { buang.alkohol++; continue }

    if (tags.some(t => TAG_HARAM.includes(t))) { buang.tagHaram++; continue }

    const teks = (nama + ' ' + (Array.isArray(p.brands) ? p.brands.join(' ') : p.brands || '')).toLowerCase()
    if (RE_TANDAI.test(teks) && !IZINKAN.some(re => re.test(teks))) {
      buang.tertandai++
      if (tandaiContoh.length < 25) tandaiContoh.push(nama + (p.brands ? ' [' + p.brands + ']' : ''))
      continue
    }

    /**
     * Kalori, dengan kJ sebagai jalan kedua.
     *
     * Membaginya dengan 4,184 adalah KONVERSI SATUAN, bukan perkiraan — jadi dia boleh dipakai
     * apa adanya. Hasilnya cuma 8 produk tambahan dari 4.693, dan itu tetap dikerjakan karena
     * harganya tiga baris dan yang hilang tanpanya adalah produk yang datanya sebenarnya ADA.
     *
     * Yang TIDAK dilakukan: menebak kalori dari makro lewat Atwater. Itu perkiraan, dan
     * perkiraan tidak boleh masuk ke katalog yang tampil sebagai fakta.
     */
    let kcal = n['energy-kcal_100g']
    if (typeof kcal !== 'number' || !Number.isFinite(kcal)) {
      const kj = n['energy-kj_100g']
      if (typeof kj === 'number' && Number.isFinite(kj) && kj > 0) kcal = kj / 4.184
    }
    if (typeof kcal !== 'number' || !Number.isFinite(kcal)) { buang.tanpaKcal++; continue }
    /**
     * NOL DITERIMA. Versi pertama menolak `kcal < 1`, dan akibatnya langsung terlihat: **Aqua
     * tidak ada di katalog**, begitu juga air mineral lain, teh tawar, dan minuman diet.
     *
     * Nol kalori yang dinyatakan OFF adalah DATA, bukan data yang hilang — dan bedanya persis
     * bentuk yang sudah dijaga di tempat lain di repo ini (`fetchRemoteState` membedakan "tidak
     * tahu" dari "server kosong"; makro yang tidak ada tidak jadi nol). Menolaknya juga merusak
     * hal yang bukan aritmetika: orang yang mencari "Aqua" dan tidak menemukannya menyimpulkan
     * databasenya payah, bukan menyimpulkan bahwa airnya nol kalori.
     *
     * 900 kkal/100 g itu di atas minyak murni (884). Di atas itu pasti salah satuan.
     */
    if (kcal < 0 || kcal > 900) { buang.kcalAneh++; continue }

    const ambil = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? b1(v) : undefined)
    const protein = ambil(n.proteins_100g)
    const carb = ambil(n.carbohydrates_100g)
    const fat = ambil(n.fat_100g)
    if ((protein || 0) + (carb || 0) + (fat || 0) > 105) { buang.makroAneh++; continue }

    if (protein !== undefined && carb !== undefined && fat !== undefined) {
      const atw = 4 * protein + 4 * carb + 9 * fat
      if (kcal > 20 && Math.abs(atw - kcal) / kcal > 0.35) atwaterMeleset.push(nama)
    }

    const merek = bersihkanMerek(p.brands, nama)
    const baris = {
      c: String(p.code || ''),
      n: nama,
      b: merek,
      k: b0(kcal),
      p: protein, ca: carb, f: fat,
      s: kemasanGram(p.quantity),
      // 1 = cair, jadi UI menulis "per 100 ml" bukan "per 100 g". Disimpan sebagai angka dan
      // dihilangkan kalau false, supaya tidak menambah byte untuk mayoritas yang padat.
      ...(cair(tags, p.quantity, satuanNama, p.serving_size) ? { l: 1 } : {}),
      // Dipakai untuk memeringkat, lalu DIBUANG sebelum ditulis: dia metadata OFF, bukan gizi,
      // dan menyimpannya berarti setiap pengguna mengunduh angka yang tidak pernah dia lihat.
      _scan: Number(p.unique_scans_n) || 0,
    }
    const k = kunci(nama, baris.s)
    const ada = peta.get(k)
    if (ada) {
      buang.duplikat++
      // Yang menang: makronya lebih lengkap. Bukan yang datang lebih dulu.
      // Merek ikut dihitung sejak dia dilepas dari kunci: yang punya merek lebih berguna di
      // daftar daripada yang tidak, dan tanpa ini pemenangnya ditentukan urutan kedatangan.
      const skor = x => (x.p !== undefined ? 1 : 0) + (x.ca !== undefined ? 1 : 0)
        + (x.f !== undefined ? 1 : 0) + (x.s ? 1 : 0) + (x.b ? 1 : 0)
      if (skor(baris) > skor(ada)) peta.set(k, baris)
      continue
    }
    peta.set(k, baris)
  }

  // Peringkat popularitas dihitung DI SINI, atas data lengkap. Yang tidak punya `unique_scans_n`
  // dianggap nol — tidak pernah dipindai adalah pernyataan yang wajar untuk data yang hilang di
  // field ini, beda dari gizi yang kosong (di sana kosong tidak boleh dibaca sebagai nol).
  const semua = [...peta.values()].sort((a, b) => (b._scan || 0) - (a._scan || 0))
  const dipotong = Math.max(0, semua.length - TOP_N)
  const rows = semua.slice(0, TOP_N)
    .map(({ _scan, ...r }) => r)
    .sort((a, b) => a.n.localeCompare(b.n, 'id'))

  console.log('\nmentah      : ' + mentah.length)
  console.log('dipakai     : ' + rows.length)
  if (dipotong) {
    console.log('DIPOTONG    : ' + dipotong + ' produk paling jarang dipindai dibuang oleh TOP_N='
      + TOP_N + ' (naikkan lewat env FOOD_TOP)')
  }
  console.log('dibuang     :')
  for (const [k, v] of Object.entries(buang)) if (v) console.log('  ' + k.padEnd(12) + v)
  console.log('Atwater meleset >35% (tetap dipakai, cuma dicatat): ' + atwaterMeleset.length)
  console.log('punya ukuran kemasan : ' + rows.filter(r => r.s).length)
  console.log('ditandai cair        : ' + rows.filter(r => r.l).length)

  if (REPORT) {
    console.log('\n--- yang TERTANDAI kata kunci dan dibuang (periksa mata; yang halal masukkan ke IZINKAN) ---')
    for (const t of tandaiContoh) console.log('  ' + t)
    console.log('\n--- 20 contoh baris hasil ---')
    for (const r of rows.slice(0, 20)) console.log('  ' + JSON.stringify(r))
  }

  const header = `/**
 * Produk ritel Indonesia — data dari Open Food Facts.
 *
 * BERKAS INI DIBUAT MESIN oleh \`scripts/build-food-retail.mjs\`. Jangan diedit tangan.
 *
 * LISENSI DATA (WAJIB DIBACA SEBELUM MENGUBAH APA PUN DI SINI)
 *
 * Databasenya berlisensi **Open Database License (ODbL) 1.0**, isinya **Database Contents
 * License (DbCL) 1.0**. Berkas ini adalah database TURUNAN, jadi dia ikut ODbL 1.0 — dan itu
 * sah berdampingan dengan kode app yang AGPL, karena keduanya melisensikan hal yang berbeda.
 *
 *   Sumber: Open Food Facts (https://world.openfoodfacts.org) - ODbL 1.0
 *   Atribusi ada di NOTICE.md dan di layar Pengaturan -> Tentang, dan dijaga tes.
 *
 * **NOL GAMBAR.** Gambar produk OFF berlisensi CC BY-SA 3.0, yang share-alike-nya menular ke
 * karya turunan. Skrip pembuatnya tidak pernah meminta field gambar sama sekali. Repo ini sudah
 * pernah membayar satu jebakan media berlisensi (Gym visual) dengan membangun ulang seluruh
 * demo gerakan; sekali sudah cukup.
 *
 * Produk beralkohol dan berbahan babi dibuang saat membangun — lihat catatan saringannya di
 * skrip. Saringannya konservatif dan BEST-EFFORT: tag OFF adalah kontribusi pengguna dan sering
 * kosong, jadi ini bukan jaminan sertifikasi halal. Yang menentukan tetap label di kemasan.
 *
 * Bentuk baris, disingkat karena berkas ini dimuat sebagai chunk terpisah:
 *   c  = barcode (juga id-nya, dan pintu masuk pemindai barcode nanti)
 *   n  = nama, b = merek
 *   k  = kkal/100 g, p/ca/f = protein/karbo/lemak gram per 100 g (boleh kosong)
 *   s  = ukuran KEMASAN dalam gram/ml (0 = tidak dinyatakan). Multipack dipecah ke satu unit.
 *   l  = 1 kalau produknya cair, jadi UI menulis "per 100 ml" bukan "per 100 g". Tidak ada
 *        artinya padat.
 *
 * KELENGKAPAN: ${terhentiDi ? terhentiDi + ' dari ' + halaman + ' halaman OFF terambil — katalog ini SEBAGIAN, karena skrip terhenti oleh 503 berulang. Jalankan ulang skripnya untuk melengkapinya; cache membuat yang sudah ada tidak diunduh lagi.' : halaman + ' halaman OFF terambil, lengkap sesuai batas MAX_HALAMAN.'}
 */
`
  const body = 'export default ' + JSON.stringify(rows)
    .replace(/^\[/, '[\n').replace(/\},\{/g, '},\n{').replace(/\]$/, '\n]') + '\n'
  writeFileSync(OUT, header + body, 'utf8')
  console.log('\nditulis: ' + OUT)
}

main().catch(e => { console.error(e.message); process.exit(1) })
