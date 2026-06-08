/**
 * lib/database.js
 * ------------------------------------------------------------------
 * Database lokal sederhana berbasis JSON (database/users.json).
 *
 * - Auto-create user saat nomor baru berinteraksi.
 * - Sistem limit harian + reset otomatis.
 * - Sistem premium (Unlimited).
 *
 * Penulisan file dibuat "atomic-ish" dengan menulis ke file .tmp
 * lalu rename, agar data tidak korup saat proses dibunuh.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getNumber } = require('./jid');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'users.json');

let users = {};

/** Pastikan folder & file database tersedia. */
function ensureFile() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

/** Muat data dari disk ke memori. */
function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    users = raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[DB] Gagal membaca users.json, memulai DB kosong:', e.message);
    users = {};
  }
  return users;
}

/** Simpan data dari memori ke disk (atomic via file sementara). */
function save() {
  try {
    ensureFile();
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[DB] Gagal menyimpan users.json:', e.message);
  }
}

/** Tanggal hari ini (YYYY-MM-DD) berdasarkan waktu server. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ambil (atau buat otomatis) data user berdasarkan JID.
 * Device ID dibersihkan via getNumber agar 1 nomor = 1 record.
 *
 * @param {string} jid
 * @returns {object} record user
 */
function getUser(jid) {
  const id = getNumber(jid);
  if (!id) return null;

  if (!users[id]) {
    users[id] = {
      number: id,
      premium: false,
      premiumExpired: 0, // 0 = tidak ada batas waktu / non premium
      limit: config.defaultLimit,
      lastReset: today(),
      registered: Date.now(),
    };
    save();
  }

  // Auto-reset limit harian jika diaktifkan
  if (config.autoResetLimit && users[id].lastReset !== today()) {
    users[id].limit = config.defaultLimit;
    users[id].lastReset = today();
    save();
  }

  // Cek masa berlaku premium
  if (users[id].premium && users[id].premiumExpired > 0 && Date.now() > users[id].premiumExpired) {
    users[id].premium = false;
    users[id].premiumExpired = 0;
    save();
  }

  return users[id];
}

/**
 * Apakah user premium (aktif)?
 * @param {string} jid
 * @returns {boolean}
 */
function isPremium(jid) {
  const u = getUser(jid);
  return !!(u && u.premium);
}

/**
 * Cek apakah user masih punya limit (premium = selalu true).
 * @param {string} jid
 * @returns {boolean}
 */
function hasLimit(jid) {
  const u = getUser(jid);
  if (!u) return false;
  if (u.premium) return true;
  return u.limit > 0;
}

/**
 * Kurangi limit user sebanyak `amount` (premium tidak terpotong).
 * @param {string} jid
 * @param {number} amount
 * @returns {boolean} true jika berhasil potong / premium
 */
function useLimit(jid, amount = 1) {
  const u = getUser(jid);
  if (!u) return false;
  if (u.premium) return true;
  if (u.limit < amount) return false;
  u.limit -= amount;
  save();
  return true;
}

/**
 * Tambah limit ke user.
 * @param {string} jid
 * @param {number} amount
 */
function addLimit(jid, amount = 1) {
  const u = getUser(jid);
  if (!u) return;
  u.limit += amount;
  save();
}

/**
 * Set status premium user.
 * @param {string} jid
 * @param {number} days jumlah hari (0 = permanen)
 */
function setPremium(jid, days = 30) {
  const u = getUser(jid);
  if (!u) return;
  u.premium = true;
  u.premiumExpired = days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : 0;
  save();
}

/**
 * Cabut status premium user.
 * @param {string} jid
 */
function removePremium(jid) {
  const u = getUser(jid);
  if (!u) return;
  u.premium = false;
  u.premiumExpired = 0;
  save();
}

// Muat database saat modul pertama kali di-require
load();

module.exports = {
  load,
  save,
  getUser,
  isPremium,
  hasLimit,
  useLimit,
  addLimit,
  setPremium,
  removePremium,
  get users() {
    return users;
  },
};
