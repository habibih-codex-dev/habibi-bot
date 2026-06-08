/**
 * config.js
 * ------------------------------------------------------------------
 * Pusat konfigurasi bot Habibi Official.
 * Edit nilai di sini untuk mengubah identitas & setting global bot.
 * ------------------------------------------------------------------
 */

const config = {
  // ====================== IDENTITAS ======================
  // Nomor Owner (boleh lebih dari satu). Format internasional TANPA + dan TANPA spasi.
  // Contoh: '6281234567890'
  owner: ['6281234567890'],

  // Nama pemilik bot (dipanggil di menu, dsb)
  ownerName: 'Habibih',

  // Nama bot
  botName: 'Habibi Official',

  // Brand layanan
  storeName: 'Habibi Store',
  cloudName: 'Habibi Cloud',

  // ====================== KONEKSI ======================
  // Nomor bot untuk Pairing Code (TANPA + dan TANPA spasi).
  // Bisa juga dikosongkan ('') lalu diisi saat diminta di terminal.
  botNumber: '',

  // Prefix perintah. Bisa multi-prefix.
  prefix: ['.', '!', '/', '#'],

  // ====================== MEDIA MENU ======================
  // Link gambar/video untuk thumbnail menu (.menu).
  // Boleh .jpg/.png (dikirim sebagai image) atau .mp4 (dikirim sebagai video).
  // Kosongkan ('') jika ingin menu tampil sebagai teks biasa.
  thumbMenu: 'https://files.catbox.moe/8z7g0k.jpg',

  // ====================== LIMIT & PREMIUM ======================
  // Limit harian default untuk user biasa
  defaultLimit: 25,

  // Apakah limit direset otomatis setiap hari
  autoResetLimit: true,

  // Jam reset limit harian (format 24 jam, waktu server). 0 = tengah malam
  resetHour: 0,

  // ====================== MODE BOT ======================
  // Tempat bot merespon perintah:
  //   'group'   -> hanya merespon di dalam grup (chat pribadi diabaikan)
  //   'private' -> hanya merespon di chat pribadi (grup diabaikan)
  //   'both'    -> merespon di grup & chat pribadi
  // Catatan: Owner SELALU bypass (bisa pakai bot di mana saja).
  mode: 'both',

  // ====================== ANTI-SPAM ======================
  // Cooldown antar perintah per user (dalam milidetik). 3000 = 3 detik
  cooldown: 3000,

  // ====================== SALDO / DEPOSIT ======================
  // Info pembayaran yang ditampilkan pada perintah .deposit
  payment: {
    qris: 'https://example.com/qris-habibi.png', // ganti link gambar QRIS kamu
    gopay: '0812-3456-7890 (a.n. Habibih)',
    dana: '0812-3456-7890 (a.n. Habibih)',
    note: 'Setelah transfer, kirim bukti ke Owner untuk konfirmasi pengisian saldo.',
  },

  // ====================== FITUR ISLAMI ======================
  islamic: {
    // ID kota untuk Auto Jadwal Sholat (sumber: api.myquran.com).
    // 1301 = KOTA JAKARTA. Cari ID lain via .jadwalsholat <kota>.
    cityId: '1301',
    // Nama wilayah yang ditampilkan pada pengingat adzan otomatis.
    cityName: 'Jakarta',
  },

  // ====================== API IPHONE QUOTE (IQC) ======================
  // Fitur .iqc butuh API yang mendukung screenshot reaksi iOS lengkap.
  // Banyak provider butuh apikey (lolhuman / neoxr / dll). Isi sesuai langganan.
  iqc: {
    // provider: 'lolhuman' | 'custom'
    provider: 'lolhuman',
    apikey: '', // ISI dengan apikey kamu
    // Untuk provider 'custom': URL GET, gunakan {text} & {apikey} sebagai placeholder.
    // Endpoint harus mengembalikan gambar (binary) atau JSON { url }.
    customUrl: '',
  },

  // ====================== PESAN ======================
  messages: {
    owner: '⛔ Perintah ini khusus *Owner* bot.',
    group: '⛔ Perintah ini hanya bisa digunakan di dalam *Grup*.',
    private: '⛔ Perintah ini hanya bisa digunakan di *Chat Pribadi*.',
    admin: '⛔ Perintah ini hanya untuk *Admin Grup*.',
    botAdmin: '⛔ Jadikan *bot sebagai Admin* terlebih dahulu.',
    limit: '⛔ Limit harian kamu sudah *habis*. Upgrade ke *Premium* untuk akses Unlimited.',
    wait: '⏳ Sebentar, sedang diproses...',
    error: '⚠️ Terjadi error saat menjalankan perintah. Coba lagi nanti.',
  },
};

module.exports = config;

// Ekspos sebagai variabel global agar mudah diakses lintas-file (opsional).
global.thumbMenu = config.thumbMenu;
