/**
 * lib/autosholat.js
 * ------------------------------------------------------------------
 * Penjadwal pengingat adzan OTOMATIS (dikunci ke WIB / Asia/Jakarta).
 *
 * - Mengambil jadwal sholat harian dari api.myquran.com untuk kota
 *   yang dikonfigurasi (config.islamic.cityId).
 * - Setiap 30 detik mengecek apakah jam WIB tepat memasuki waktu
 *   Subuh / Dzuhur / Ashar / Maghrib / Isya.
 * - Jika ya, mengirim pengingat ke semua grup yang mengaktifkan
 *   auto-sholat (groupdb: autoSholat = true).
 *
 * Dijalankan dari index.js (proses persisten), BUKAN dari handler
 * (yang di-reload), agar timer tidak terduplikasi saat hot-reload.
 * ------------------------------------------------------------------
 */

const axios = require('axios');
const config = require('../config');
const groupdb = require('./groupdb');

let timer = null;
let connRef = null;
let cache = { date: '', jadwal: null };
let sentKeys = new Set(); // mencegah kirim ganda dalam 1 hari

/** Bagian waktu WIB: { date: 'YYYY-MM-DD', hm: 'HH:mm' }. */
function wibParts() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return { date, hm };
}

/** Ambil jadwal harian (dengan cache per tanggal). */
async function fetchJadwal(date) {
  const id = config.islamic?.cityId || '1301';
  const { data } = await axios.get(
    `https://api.myquran.com/v2/sholat/jadwal/${id}/${date}`,
    { timeout: 20000 }
  );
  return data?.data?.jadwal || null;
}

/** Kirim pengingat ke semua grup yang mengaktifkan auto-sholat. */
async function broadcast(name) {
  if (!connRef) return;
  const groups = groupdb.getAll();
  const targets = Object.keys(groups).filter((g) => groups[g]?.autoSholat);
  if (targets.length === 0) return;

  const wilayah = config.islamic?.cityName || 'Jakarta';
  const text =
    `⚠️ *[PENGINGAT ADZAN]*\n\n` +
    `Waktu Sholat *${name}* untuk wilayah *${wilayah}* dan sekitarnya telah tiba.\n\n` +
    `Selamat menunaikan ibadah sholat. 🤲\n_— ${config.botName}_`;

  for (const jid of targets) {
    try {
      await connRef.sendMessage(jid, { text });
      await new Promise((r) => setTimeout(r, 1500)); // jeda anti-spam
    } catch (e) {
      console.error('[AUTOSHOLAT] gagal kirim ke', jid, e.message);
    }
  }
  console.log(`🕌 [AUTOSHOLAT] Pengingat ${name} dikirim ke ${targets.length} grup.`);
}

/** Tick utama: dijalankan tiap 30 detik. */
async function tick() {
  try {
    const { date, hm } = wibParts();

    // Refresh jadwal bila ganti hari / belum ada cache
    if (cache.date !== date || !cache.jadwal) {
      cache.jadwal = await fetchJadwal(date);
      cache.date = date;
      sentKeys = new Set();
    }
    const j = cache.jadwal;
    if (!j) return;

    const times = {
      Subuh: j.subuh,
      Dzuhur: j.dzuhur,
      Ashar: j.ashar,
      Maghrib: j.maghrib,
      Isya: j.isya,
    };

    for (const [name, t] of Object.entries(times)) {
      if (t && String(t).slice(0, 5) === hm) {
        const key = `${date}-${name}`;
        if (sentKeys.has(key)) continue;
        sentKeys.add(key);
        await broadcast(name);
      }
    }
  } catch (e) {
    console.error('[AUTOSHOLAT] tick error:', e.message);
  }
}

/** Mulai scheduler (idempotent). Dipanggil dari index.js saat connect. */
function start(conn) {
  connRef = conn;
  if (timer) return; // sudah berjalan, cukup perbarui koneksi
  timer = setInterval(tick, 30000);
  console.log('🕌 Auto-sholat scheduler aktif (WIB).');
}

/** Perbarui referensi koneksi (mis. setelah reconnect). */
function setConn(conn) {
  connRef = conn;
}

module.exports = { start, setConn };
