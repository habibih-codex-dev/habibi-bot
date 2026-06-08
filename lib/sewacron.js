/**
 * lib/sewacron.js
 * ------------------------------------------------------------------
 * Cron-job AUTO EXPIRY sewa bot.
 *
 * - Berjalan berkala (default tiap 1 jam) mengecek database/sewa.json.
 * - Untuk setiap grup yang masa sewanya sudah habis (expiredAt lewat):
 *     1. Kirim pesan pemberitahuan ke grup.
 *     2. Bot keluar (leave) dari grup tersebut.
 *     3. Hapus data sewa grup dari database.
 *
 * Dijalankan dari index.js (proses persisten), bukan handler (reload),
 * agar timer tidak terduplikasi.
 * ------------------------------------------------------------------
 */

const config = require('../config');
const sewadb = require('./sewadb');

const CHECK_INTERVAL = 60 * 60 * 1000; // 1 jam

let timer = null;
let connRef = null;

const PESAN_EXPIRED =
  '⚠️ Masa sewa bot di grup ini telah habis. ' +
  `Terima kasih telah menggunakan layanan ${config?.storeName || 'Habibi Store'}!`;

/** Proses grup-grup yang sudah kedaluwarsa. */
async function checkExpiry() {
  if (!connRef) return;
  try {
    const expired = sewadb.getExpired();
    if (expired.length === 0) return;

    for (const jid of expired) {
      try {
        // 1) Beritahu grup
        await connRef.sendMessage(jid, { text: PESAN_EXPIRED });
        await new Promise((r) => setTimeout(r, 1500));
        // 2) Keluar dari grup
        await connRef.groupLeave(jid).catch((e) =>
          console.error('[SEWACRON] gagal leave', jid, e.message)
        );
        // 3) Hapus data sewa
        sewadb.del(jid);
        console.log(`📤 [SEWACRON] Sewa habis -> keluar dari grup ${jid}`);
      } catch (e) {
        console.error('[SEWACRON] gagal proses', jid, e.message);
      }
    }
  } catch (e) {
    console.error('[SEWACRON] checkExpiry error:', e.message);
  }
}

/** Mulai cron (idempotent). Dipanggil dari index.js saat connect. */
function start(conn) {
  connRef = conn;
  if (timer) return; // sudah berjalan, cukup perbarui koneksi
  timer = setInterval(checkExpiry, CHECK_INTERVAL);
  // Jalankan pengecekan awal 1 menit setelah start (beri waktu koneksi stabil)
  setTimeout(checkExpiry, 60 * 1000);
  console.log('🧾 Sewa auto-expiry cron aktif (cek tiap 1 jam).');
}

/** Perbarui referensi koneksi (mis. setelah reconnect). */
function setConn(conn) {
  connRef = conn;
}

module.exports = { start, setConn, checkExpiry };
