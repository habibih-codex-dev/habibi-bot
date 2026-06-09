/**
 * index.js
 * ------------------------------------------------------------------
 * Entry point bot Habibi Official.
 *
 * MIGRASI CORE ENGINE -> "habibi-cloud-baileys"
 * ------------------------------------------------------------------
 * Library ini wrapper modular di atas Baileys v7 (RC) yang mengekspos
 * API `createBot(options)` berbasis EventEmitter, plus helper pesan
 * interaktif pada `bot.sock`: sendButton / sendList / sendCarousel.
 *
 * STRATEGI MIGRASI (aman & minim risiko):
 *  - Lifecycle (koneksi, pairing-code, auto-reconnect) ditangani penuh
 *    oleh library via createBot + event.
 *  - Pemrosesan pesan TETAP memakai handler.js lama yang sudah teruji
 *    (LID/Device-ID safe, owner-bypass, proteksi, dll). Caranya: kita
 *    pasang listener RAW `messages.upsert` langsung pada `bot.sock.ev`,
 *    bukan memakai event 'message' (serialized) bawaan library — agar
 *    kontrak data ke handler.js tidak berubah.
 *  - Setiap reconnect membuat socket baru, jadi kita "wire" ulang tiap
 *    event 'open' dengan guard WeakSet agar tidak dobel listener.
 *
 * Hot-reload handler.js & folder plugins/ tetap dipertahankan.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const { createBot } = require('habibi-cloud-baileys');

const config = require('./config');
const { cleanJid } = require('./lib/jid');
const autosholat = require('./lib/autosholat');
const sewacron = require('./lib/sewacron');
const antijoin = require('./lib/antijoin');

// ===================== HOT RELOAD HANDLER =====================
const HANDLER_PATH = require.resolve('./handler.js');
let handler = require('./handler.js');

function reloadHandler() {
  try {
    delete require.cache[HANDLER_PATH];
    handler = require('./handler.js');
    console.log('♻️  handler.js berhasil di-reload.');
  } catch (e) {
    console.error('❌ Gagal reload handler.js:', e.message);
  }
}

fs.watchFile(HANDLER_PATH, { interval: 1000 }, () => {
  console.log('📝 Perubahan terdeteksi pada handler.js');
  reloadHandler();
});

const PLUGIN_DIR = path.join(__dirname, 'plugins');
if (fs.existsSync(PLUGIN_DIR)) {
  fs.readdirSync(PLUGIN_DIR)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const full = path.join(PLUGIN_DIR, file);
      fs.watchFile(full, { interval: 1000 }, () => {
        console.log(`📝 Perubahan plugin: ${file} -> reload`);
        reloadHandler();
      });
    });
}

// ===================== WIRING SOCKET =====================
// Guard agar satu socket hanya di-wire sekali (hindari dobel listener).
const wiredSockets = new WeakSet();

function wireSocket(conn) {
  if (!conn || wiredSockets.has(conn)) return;
  wiredSockets.add(conn);

  // Pesan masuk RAW -> handler.js lama (kontrak data tidak berubah)
  conn.ev.on('messages.upsert', async (m) => {
    try {
      await handler(conn, m);
    } catch (e) {
      console.error('❌ Error di handler utama:', e);
    }
  });

  // Anti-join (antibot / antiforeign) — pasang per socket baru
  try {
    antijoin.register(conn);
  } catch (e) {
    console.error('Gagal memasang anti-join:', e.message);
  }
}

// ===================== START BOT =====================
async function startBot() {
  // Nomor bot untuk pairing code (opsional; isi di config.botNumber).
  const phoneNumber = String(config.botNumber || '').replace(/[^0-9]/g, '');
  const usePairingCode = !!phoneNumber; // ada nomor -> pairing code, else QR

  const bot = await createBot({
    authFolder: './session', // tetap pakai folder "session" agar sesi lama kompatibel
    printQR: !usePairingCode,
    usePairingCode,
    phoneNumber: phoneNumber || undefined,
    maxReconnectAttempts: Infinity, // reconnect tak terbatas (ditangani library)
  });

  // ---- PAIRING CODE ----
  bot.on('pairing', (code) => {
    const pretty = String(code).match(/.{1,4}/g)?.join('-') || code;
    console.log(`\n🔗 PAIRING CODE: ${pretty}\n`);
    console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon.\n');
  });

  bot.on('qr', () =>
    console.log('📲 Scan QR di atas untuk login (atau isi config.botNumber untuk pairing code).')
  );
  bot.on('connecting', () => console.log('⏳ Menyambungkan ke WhatsApp...'));

  // ---- KONEKSI TERBUKA ----
  bot.on('open', () => {
    const conn = bot.sock;
    try {
      if (conn?.user?.id) conn.user.id = cleanJid(conn.user.id);
    } catch (_) {
      /* abaikan */
    }
    console.log(`✅ ${config.botName} terhubung sebagai ${conn?.user?.id || '-'}`);

    // Pasang listener pesan & anti-join pada socket (idempotent via WeakSet)
    wireSocket(conn);

    // Perbarui referensi koneksi untuk scheduler, lalu mulai (idempotent)
    try {
      autosholat.setConn(conn);
      autosholat.start(conn);
    } catch (e) {
      console.error('Gagal memulai auto-sholat:', e.message);
    }
    try {
      sewacron.setConn(conn);
      sewacron.start(conn);
    } catch (e) {
      console.error('Gagal memulai sewa-cron:', e.message);
    }
  });

  // ---- KONEKSI TERPUTUS / LOGOUT (reconnect ditangani library) ----
  bot.on('close', (info) =>
    console.log('⚠️  Koneksi terputus. Library reconnect otomatis...', info?.reason || '')
  );
  bot.on('logout', () =>
    console.log('🚪 Sesi logout. Hapus folder "session" lalu jalankan ulang untuk pairing baru.')
  );

  bot.on('error', (e) => console.error('❌ Bot error:', e?.message || e));

  return bot;
}

// Tangkap error global agar proses tidak mati mendadak
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));

startBot().catch((e) => console.error('Gagal memulai bot:', e));
