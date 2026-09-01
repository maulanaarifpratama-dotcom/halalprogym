/**
 * Bahan pokok Indonesia — nilai gizi dari USDA FoodData Central (SR Legacy).
 *
 * BERKAS INI DIBUAT MESIN. Jangan diedit tangan; ubah daftar kurasinya di
 * `scripts/gen-usda-foods.mjs` lalu jalankan ulang.
 *
 * LISENSI DATA: USDA FoodData Central adalah **domain publik (CC0 1.0)** — nol syarat, nol
 * kewajiban share-alike. Atribusi tidak diwajibkan tapi diminta, dan diberikan di NOTICE.md
 * serta di layar Pengaturan -> Tentang.
 *   Sumber: U.S. Department of Agriculture, Agricultural Research Service,
 *   Beltsville Human Nutrition Research Center. FoodData Central, SR Legacy (2019-04-01).
 *
 * KENAPA USDA DAN BUKAN TKPI. Tabel Komposisi Pangan Indonesia (Kemenkes) adalah sumber yang
 * jauh lebih tepat secara isi — dia justru dibuat untuk pangan Indonesia. Tapi repositori
 * resminya menyatakan "(c) Copyright 2022. All Rights Reserved by Kemenkes", tanpa satu pun
 * pernyataan lisensi terbuka. Jadi dia TIDAK BOLEH didistribusikan di dalam app ini. Itu
 * jawaban tegas atas pertanyaan yang `CLAUDE.md` sempat biarkan menggantung sebagai "belum
 * jelas" — dan jawabannya bukan "belum jelas", tapi "tidak boleh".
 *
 * `fdcId` disimpan di setiap baris supaya angkanya bisa diverifikasi ke sumbernya:
 * https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients
 *
 * `porsi` dan `ket` (porsi rumah tangga: "1 centong", "2 potong") adalah PERKIRAAN KAMI,
 * bukan data USDA. Dipisah dengan sengaja: yang terukur dan yang kami tetapkan tidak boleh
 * terlihat sama.
 *
 * Nama Indonesianya juga milik kami. Sebagian bukan padanan sempurna dan itu disebutkan di
 * `desc` — deskripsi USDA aslinya ikut disimpan supaya ketidakcocokan bisa dilihat, bukan
 * disembunyikan. Contohnya "Ikan kembung" memakai *king mackerel*: kandidat teratas untuk
 * "mackerel" adalah mackerel ASIN 305 kcal, yang akan salah tiga kali lipat.
 */
export default [ 
  { "id": "169757", "nama": "Nasi putih", "porsi": 100, "ket": "1 centong", "kcal": 130, "protein": 2.7, "carb": 28.2, "fat": 0.3, "desc": "Rice, white, long-grain, regular, unenriched, cooked without salt" }, 
  { "id": "169704", "nama": "Nasi merah", "porsi": 100, "ket": "1 centong", "kcal": 123, "protein": 2.7, "carb": 25.6, "fat": 1, "desc": "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)" }, 
  { "id": "172467", "nama": "Tempe", "porsi": 50, "ket": "2 potong", "kcal": 195, "protein": 19.9, "carb": 7.6, "fat": 11.4, "desc": "Tempeh, cooked" }, 
  { "id": "172475", "nama": "Tahu putih", "porsi": 80, "ket": "1 potong besar", "kcal": 144, "protein": 17.3, "carb": 2.8, "fat": 8.7, "desc": "Tofu, raw, firm, prepared with calcium sulfate" }, 
  { "id": "172451", "nama": "Tahu goreng", "porsi": 50, "ket": "2 potong", "kcal": 270, "protein": 18.8, "carb": 8.9, "fat": 20.2, "desc": "Tofu, fried" }, 
  { "id": "173424", "nama": "Telur ayam rebus", "porsi": 50, "ket": "1 butir", "kcal": 155, "protein": 12.6, "carb": 1.1, "fat": 10.6, "desc": "Egg, whole, cooked, hard-boiled" }, 
  { "id": "173423", "nama": "Telur ceplok", "porsi": 50, "ket": "1 butir", "kcal": 196, "protein": 13.6, "carb": 0.8, "fat": 14.8, "desc": "Egg, whole, cooked, fried" }, 
  { "id": "171477", "nama": "Dada ayam tanpa kulit", "porsi": 100, "ket": "1 potong", "kcal": 165, "protein": 31, "carb": 0, "fat": 3.6, "desc": "Chicken, broilers or fryers, breast, meat only, cooked, roasted" }, 
  { "id": "172388", "nama": "Paha ayam tanpa kulit", "porsi": 80, "ket": "1 potong", "kcal": 179, "protein": 24.8, "carb": 0, "fat": 8.2, "desc": "Chicken, broilers or fryers, thigh, meat only, cooked, roasted" }, 
  { "id": "173611", "nama": "Ayam goreng berkulit", "porsi": 100, "ket": "1 potong", "kcal": 245, "protein": 27, "carb": 1.6, "fat": 13.7, "desc": "Chicken, broilers or fryers, drumstick, meat and skin, cooked, fried, flour" }, 
  { "id": "168634", "nama": "Daging sapi has (tanpa lemak)", "porsi": 100, "ket": "1 potong", "kcal": 183, "protein": 30.6, "carb": 0, "fat": 5.8, "desc": "Beef, top sirloin, steak, separable lean only, trimmed to 0\"\" fat, all grades, cooked, broiled" }, 
  { "id": "174032", "nama": "Daging sapi giling", "porsi": 100, "ket": "", "kcal": 250, "protein": 25.9, "carb": 0, "fat": 15.4, "desc": "Beef, ground, 85% lean meat / 15% fat, patty, cooked, broiled" }, 
  { "id": "172479", "nama": "Daging kambing", "porsi": 100, "ket": "1 potong", "kcal": 267, "protein": 16.9, "carb": 0, "fat": 21.6, "desc": "Lamb, composite of trimmed retail cuts, separable lean and fat, trimmed to 1/4\"\" fat, choice, raw" }, 
  { "id": "174236", "nama": "Ikan kembung", "porsi": 100, "ket": "1 ekor sedang", "kcal": 134, "protein": 26, "carb": 0, "fat": 2.6, "desc": "Fish, mackerel, king, cooked, dry heat" }, 
  { "id": "175166", "nama": "Ikan lele", "porsi": 100, "ket": "1 ekor", "kcal": 144, "protein": 18.4, "carb": 0, "fat": 7.2, "desc": "Fish, catfish, channel, farmed, cooked, dry heat" }, 
  { "id": "172006", "nama": "Ikan tuna", "porsi": 100, "ket": "1 potong", "kcal": 130, "protein": 29.2, "carb": 0, "fat": 0.6, "desc": "Fish, tuna, yellowfin, fresh, cooked, dry heat" }, 
  { "id": "175180", "nama": "Udang", "porsi": 60, "ket": "5 ekor sedang", "kcal": 99, "protein": 24, "carb": 0.2, "fat": 0.3, "desc": "Crustaceans, shrimp, cooked" }, 
  { "id": "170173", "nama": "Santan kental", "porsi": 50, "ket": "1/4 gelas", "kcal": 197, "protein": 2, "carb": 2.8, "fat": 21.3, "desc": "Nuts, coconut milk, canned (liquid expressed from grated meat and water)" }, 
  { "id": "171412", "nama": "Minyak kelapa", "porsi": 5, "ket": "1 sdt", "kcal": 892, "protein": 0, "carb": 0, "fat": 99.1, "desc": "Oil, coconut" }, 
  { "id": "171015", "nama": "Minyak sawit", "porsi": 5, "ket": "1 sdt", "kcal": 884, "protein": 0, "carb": 0, "fat": 100, "desc": "Oil, palm" }, 
  { "id": "171411", "nama": "Minyak goreng", "porsi": 5, "ket": "1 sdt", "kcal": 884, "protein": 0, "carb": 0, "fat": 100, "desc": "Oil, soybean, salad or cooking" }, 
  { "id": "172430", "nama": "Kacang tanah", "porsi": 30, "ket": "1 genggam", "kcal": 567, "protein": 25.8, "carb": 16.1, "fat": 49.2, "desc": "Peanuts, all types, raw" }, 
  { "id": "174299", "nama": "Kedelai rebus", "porsi": 100, "ket": "", "kcal": 172, "protein": 18.2, "carb": 8.4, "fat": 9, "desc": "Soybeans, mature seeds, cooked, boiled, with salt" }, 
  { "id": "174257", "nama": "Kacang hijau rebus", "porsi": 100, "ket": "1 mangkuk kecil", "kcal": 105, "protein": 7, "carb": 19.2, "fat": 0.4, "desc": "Mung beans, mature seeds, cooked, boiled, without salt" }, 
  { "id": "169957", "nama": "Tauge", "porsi": 50, "ket": "1 genggam", "kcal": 30, "protein": 3, "carb": 5.9, "fat": 0.2, "desc": "Mung beans, mature seeds, sprouted, raw" }, 
  { "id": "168462", "nama": "Bayam", "porsi": 50, "ket": "1 ikat kecil", "kcal": 23, "protein": 2.9, "carb": 3.6, "fat": 0.4, "desc": "Spinach, raw" }, 
  { "id": "170068", "nama": "Kangkung", "porsi": 50, "ket": "1 ikat kecil", "kcal": 11, "protein": 2.3, "carb": 1.3, "fat": 0.1, "desc": "Watercress, raw" }, 
  { "id": "170393", "nama": "Wortel", "porsi": 60, "ket": "1 buah", "kcal": 41, "protein": 0.9, "carb": 9.6, "fat": 0.2, "desc": "Carrots, raw" }, 
  { "id": "170440", "nama": "Kentang rebus", "porsi": 100, "ket": "1 buah sedang", "kcal": 86, "protein": 1.7, "carb": 20, "fat": 0.1, "desc": "Potatoes, boiled, cooked without skin, flesh, without salt" }, 
  { "id": "168484", "nama": "Ubi jalar rebus", "porsi": 100, "ket": "1 buah sedang", "kcal": 76, "protein": 1.4, "carb": 17.7, "fat": 0.1, "desc": "Sweet potato, cooked, boiled, without skin" }, 
  { "id": "169985", "nama": "Singkong", "porsi": 100, "ket": "1 potong", "kcal": 160, "protein": 1.4, "carb": 38.1, "fat": 0.3, "desc": "Cassava, raw" }, 
  { "id": "169999", "nama": "Jagung manis", "porsi": 100, "ket": "1 buah", "kcal": 96, "protein": 3.4, "carb": 21, "fat": 1.5, "desc": "Corn, sweet, yellow, cooked, boiled, drained, without salt" }, 
  { "id": "173944", "nama": "Pisang", "porsi": 100, "ket": "1 buah sedang", "kcal": 89, "protein": 1.1, "carb": 22.8, "fat": 0.3, "desc": "Bananas, raw" }, 
  { "id": "169926", "nama": "Pepaya", "porsi": 100, "ket": "1 potong", "kcal": 43, "protein": 0.5, "carb": 10.8, "fat": 0.3, "desc": "Papayas, raw" }, 
  { "id": "169910", "nama": "Mangga", "porsi": 100, "ket": "1 buah kecil", "kcal": 60, "protein": 0.8, "carb": 15, "fat": 0.4, "desc": "Mangos, raw" }, 
  { "id": "169097", "nama": "Jeruk", "porsi": 100, "ket": "1 buah", "kcal": 47, "protein": 0.9, "carb": 11.8, "fat": 0.1, "desc": "Oranges, raw, all commercial varieties" }, 
  { "id": "167765", "nama": "Semangka", "porsi": 100, "ket": "1 potong", "kcal": 30, "protein": 0.6, "carb": 7.6, "fat": 0.2, "desc": "Watermelon, raw" }, 
  { "id": "171705", "nama": "Alpukat", "porsi": 100, "ket": "1/2 buah", "kcal": 160, "protein": 2, "carb": 8.5, "fat": 14.7, "desc": "Avocados, raw, all commercial varieties" }, 
  { "id": "171688", "nama": "Apel", "porsi": 100, "ket": "1 buah kecil", "kcal": 52, "protein": 0.3, "carb": 13.8, "fat": 0.2, "desc": "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)" }, 
  { "id": "169655", "nama": "Gula pasir", "porsi": 6, "ket": "1 sdt", "kcal": 387, "protein": 0, "carb": 100, "fat": 0, "desc": "Sugars, granulated" }, 
  { "id": "169640", "nama": "Madu", "porsi": 20, "ket": "1 sdm", "kcal": 304, "protein": 0.3, "carb": 82.4, "fat": 0, "desc": "Honey" }, 
  { "id": "172217", "nama": "Susu sapi", "porsi": 200, "ket": "1 gelas", "kcal": 61, "protein": 3.2, "carb": 4.8, "fat": 3.3, "desc": "Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D" }, 
  { "id": "170872", "nama": "Susu rendah lemak", "porsi": 200, "ket": "1 gelas", "kcal": 42, "protein": 3.4, "carb": 5, "fat": 1, "desc": "Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D" }, 
  { "id": "171284", "nama": "Yoghurt plain", "porsi": 150, "ket": "1 cup", "kcal": 61, "protein": 3.5, "carb": 4.7, "fat": 3.3, "desc": "Yogurt, plain, whole milk" }, 
  { "id": "170899", "nama": "Keju cheddar", "porsi": 20, "ket": "1 lembar", "kcal": 410, "protein": 24.3, "carb": 2.1, "fat": 33.8, "desc": "Cheese, cheddar, sharp, sliced" }, 
  { "id": "172818", "nama": "Roti tawar", "porsi": 25, "ket": "1 lembar", "kcal": 267, "protein": 8.2, "carb": 49.6, "fat": 3.6, "desc": "Bread, white, commercially prepared, low sodium, no salt" }, 
  { "id": "169731", "nama": "Mi telur kering", "porsi": 80, "ket": "1 bungkus", "kcal": 384, "protein": 14.2, "carb": 71.3, "fat": 4.4, "desc": "Noodles, egg, dry, enriched" }, 
  { "id": "169742", "nama": "Bihun kering", "porsi": 50, "ket": "1 porsi", "kcal": 364, "protein": 6, "carb": 80.2, "fat": 0.6, "desc": "Rice noodles, dry" }, 
  { "id": "169705", "nama": "Oat", "porsi": 40, "ket": "4 sdm", "kcal": 389, "protein": 16.9, "carb": 66.3, "fat": 6.9, "desc": "Oats (Includes foods for USDA's Food Distribution Program)" }, 
  { "id": "168894", "nama": "Tepung terigu", "porsi": 100, "ket": "", "kcal": 364, "protein": 10.3, "carb": 76.3, "fat": 1, "desc": "Wheat flour, white, all-purpose, enriched, bleached" }, 
  { "id": "169714", "nama": "Tepung beras", "porsi": 100, "ket": "", "kcal": 366, "protein": 6, "carb": 80.1, "fat": 1.4, "desc": "Rice flour, white, unenriched" }, 
  { "id": "170499", "nama": "Bawang merah", "porsi": 10, "ket": "2 siung", "kcal": 72, "protein": 2.5, "carb": 16.8, "fat": 0.1, "desc": "Shallots, raw" }, 
  { "id": "169230", "nama": "Bawang putih", "porsi": 5, "ket": "1 siung", "kcal": 149, "protein": 6.4, "carb": 33.1, "fat": 0.5, "desc": "Garlic, raw" }, 
  { "id": "170000", "nama": "Bawang bombay", "porsi": 50, "ket": "1/2 buah", "kcal": 40, "protein": 1.1, "carb": 9.3, "fat": 0.1, "desc": "Onions, raw" }, 
  { "id": "170106", "nama": "Cabai merah", "porsi": 10, "ket": "2 buah", "kcal": 40, "protein": 1.9, "carb": 8.8, "fat": 0.4, "desc": "Peppers, hot chili, red, raw" }, 
  { "id": "170457", "nama": "Tomat", "porsi": 80, "ket": "1 buah", "kcal": 18, "protein": 0.9, "carb": 3.9, "fat": 0.2, "desc": "Tomatoes, red, ripe, raw, year round average" }, 
  { "id": "168409", "nama": "Timun", "porsi": 80, "ket": "1/2 buah", "kcal": 15, "protein": 0.7, "carb": 3.6, "fat": 0.1, "desc": "Cucumber, with peel, raw" }, 
  { "id": "169228", "nama": "Terong", "porsi": 80, "ket": "1 buah kecil", "kcal": 25, "protein": 1, "carb": 5.9, "fat": 0.2, "desc": "Eggplant, raw" }, 
  { "id": "169961", "nama": "Buncis", "porsi": 50, "ket": "1 genggam", "kcal": 31, "protein": 1.8, "carb": 7, "fat": 0.2, "desc": "Beans, snap, green, raw" }
]
