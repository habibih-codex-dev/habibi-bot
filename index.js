/**
 * index.js
 * ------------------------------------------------------------------
 * Entry point bot Habibi Official.
 *
 * - Koneksi via PAIRING CODE (bukan QR).
 * - Penyimpanan sesi via useMultiFileAuthState.
 * - Auto-reconnect tangguh dengan @hapi/boom (kecuali loggedOut).
 * - Hot-reload handler.js & folder plugins/ tanpa restart.
 * ------------------------------------------------------------------
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const config = require('./config');
const { cleanJid } = require('./lib/jid');
const autosholat = require('./lib/autosholat');
const sewacron = require('./lib/sewacron');
const antijoin = require('./lib/antijoin');

// Logger senyap agar terminal bersih
const logger = pino({ level: 'silent' });

// ===================== HOT RELOAD HANDLER =====================
// require handler.js secara dinamis agar bisa di-reload saat diedit.
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

// Pantau perubahan handler.js
fs.watchFile(HANDLER_PATH, { interval: 1000 }, () => {
  console.log('📝 Perubahan terdeteksi pada handler.js');
  reloadHandler();
});

// Pantau perubahan seluruh file di folder plugins/
const PLUGIN_DIR = path.join(__dirname, 'plugins');
if (fs.existsSync(PLUGIN_DIR)) {
  fs.readdirSync(PLUGIN_DIR)
    .filter((f) => f.endsWith('.js'))
    .forEach((file) => {
      const full = path.join(PLUGIN_DIR, file);
      fs.watchFile(full, { interval: 1000 }, () => {
        console.log(`📝 Perubahan plugin: ${file} -> reload`);
        // handler.js yang bertugas me-load ulang plugin,
        // jadi cukup reload handler agar cache plugin ikut dibersihkan.
        reloadHandler();
      });
    });
}

// ===================== INPUT TERMINAL =====================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// ===================== KONEKSI UTAMA =====================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();

  const conn = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // pakai pairing code
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  // ---- PAIRING CODE ----
  if (!conn.authState.creds.registered) {
    let number = config.botNumber;
    if (!number) {
      number = await question('📲 Masukkan nomor bot (cth 6281234567890): ');
    }
    number = number.replace(/[^0-9]/g, '');

    try {
      const code = await conn.requestPairingCode(number);
      const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(`\n🔗 PAIRING CODE: ${pretty}\n`);
      console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon.\n');
    } catch (e) {
      console.error('❌ Gagal meminta pairing code:', e.message);
    }
  }

  // ---- SIMPAN SESI ----
  conn.ev.on('creds.update', saveCreds);

  // ---- UPDATE KONEKSI (AUTO-RECONNECT) ----
  conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      // Bersihkan Device ID dari JID bot agar pengecekan owner/admin akurat
      conn.user.id = cleanJid(conn.user.id);
      console.log(`✅ ${config.botName} terhubung sebagai ${conn.user.id}`);
      // Mulai / segarkan scheduler pengingat adzan otomatis (WIB)
      try {
        autosholat.start(conn);
      } catch (e) {
        console.error('Gagal memulai auto-sholat:', e.message);
      }
      // Mulai / segarkan cron auto-expiry sewa bot
      try {
        sewacron.start(conn);
      } catch (e) {
        console.error('Gagal memulai sewa-cron:', e.message);
      }
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'unknown';

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🚪 Sesi logout. Hapus folder "session" lalu jalankan ulang untuk pairing baru.');
        return; // JANGAN reconnect saat loggedOut
      }

      console.log(`⚠️  Koneksi terputus (${statusCode} - ${reason}). Mencoba reconnect...`);
      setTimeout(() => startBot(), 2000); // reconnect dengan jeda kecil
    }
  });

  // ---- PESAN MASUK -> serahkan ke handler (selalu versi terbaru) ----
  conn.ev.on('messages.upsert', async (m) => {
    try {
      await handler(conn, m);
    } catch (e) {
      console.error('❌ Error di handler utama:', e);
    }
  });

  // ---- UPDATE GRUP (cache metadata bisa ditambahkan di sini bila perlu) ----
  conn.ev.on('groups.update', () => {});

  // ---- ANTI-JOIN (antibot / antiforeign) ----
  try {
    antijoin.register(conn);
  } catch (e) {
    console.error('Gagal memasang anti-join:', e.message);
  }

  return conn;
}

// Tangkap error global agar proses tidak mati mendadak
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));

startBot().catch((e) => console.error('Gagal memulai bot:', e));
