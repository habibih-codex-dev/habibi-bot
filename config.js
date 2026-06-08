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

  // ====================== LIMIT & PREMIUM ======================
  // Limit harian default untuk user biasa
  defaultLimit: 25,

  // Apakah limit direset otomatis setiap hari
  autoResetLimit: true,

  // Jam reset limit harian (format 24 jam, waktu server). 0 = tengah malam
  resetHour: 0,

  // ====================== ANTI-SPAM ======================
  // Cooldown antar perintah per user (dalam milidetik). 3000 = 3 detik
  cooldown: 3000,

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
