/**
 * lib/sewadb.js
 * ------------------------------------------------------------------
 * Database manajemen SEWA BOT per-grup (database/sewa.json).
 *
 * Struktur:
 * {
 *   "<groupJid>": { joinedAt: <ts>, expiredAt: <ts>, days: <total hari> }
 * }
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'sewa.json');

const DAY_MS = 24 * 60 * 60 * 1000;

let sewa = {};

function ensureFile() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    sewa = raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[SEWA DB] Gagal membaca sewa.json:', e.message);
    sewa = {};
  }
  return sewa;
}

function save() {
  try {
    ensureFile();
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(sewa, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[SEWA DB] Gagal menyimpan sewa.json:', e.message);
  }
}

/** Seluruh data sewa (objek mentah). */
function getAll() {
  return sewa;
}

/** Ambil data sewa satu grup (atau null). */
function get(jid) {
  return sewa[jid] || null;
}

/**
 * Aktifkan / perpanjang sewa grup.
 * Jika masih aktif, hari ditambahkan ke sisa masa aktif (diperpanjang).
 * @param {string} jid groupJid
 * @param {number} days jumlah hari
 * @returns {object} data sewa terbaru
 */
function add(jid, days) {
  const now = Date.now();
  const n = Math.max(1, Number(days) || 0);
  const tambah = n * DAY_MS;
  const existing = sewa[jid];

  // Basis perpanjangan: dari expired lama jika masih aktif, else dari sekarang
  const base = existing && existing.expiredAt > now ? existing.expiredAt : now;

  sewa[jid] = {
    joinedAt: existing?.joinedAt || now,
    expiredAt: base + tambah,
    days: (existing?.days || 0) + n,
  };
  save();
  return sewa[jid];
}

/** Hapus data sewa grup. Return true jika ada & terhapus. */
function del(jid) {
  if (!sewa[jid]) return false;
  delete sewa[jid];
  save();
  return true;
}

/** Apakah sewa grup masih aktif? */
function isActive(jid) {
  const s = sewa[jid];
  return !!(s && s.expiredAt > Date.now());
}

/** Sisa waktu (ms) sewa grup. Bisa negatif jika sudah lewat. */
function remainingMs(jid) {
  const s = sewa[jid];
  if (!s) return 0;
  return s.expiredAt - Date.now();
}

/** Daftar grup yang sudah kedaluwarsa (expiredAt <= sekarang). */
function getExpired() {
  const now = Date.now();
  return Object.keys(sewa).filter((jid) => sewa[jid].expiredAt <= now);
}

load();

module.exports = {
  load,
  save,
  getAll,
  get,
  add,
  del,
  isActive,
  remainingMs,
  getExpired,
  DAY_MS,
};
