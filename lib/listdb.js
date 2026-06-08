/**
 * lib/listdb.js
 * ------------------------------------------------------------------
 * Penyimpanan "Store List" / katalog dinamis di database/list.json.
 *
 * Struktur:
 * {
 *   "keyword": { "response": "isi balasan", "by": "62812...", "at": 1690000000000 }
 * }
 *
 * Keyword selalu disimpan dalam huruf kecil & sudah di-trim agar
 * pencocokan auto-response konsisten.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'list.json');

let list = {};

function ensureFile() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    list = raw.trim() ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[LIST DB] Gagal membaca list.json:', e.message);
    list = {};
  }
  return list;
}

function save() {
  try {
    ensureFile();
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[LIST DB] Gagal menyimpan list.json:', e.message);
  }
}

/** Normalisasi keyword: trim + huruf kecil. */
function key(keyword) {
  return String(keyword || '').trim().toLowerCase();
}

/** Ambil seluruh list (objek mentah). */
function getAll() {
  return list;
}

/** Daftar keyword (array, terurut). */
function keywords() {
  return Object.keys(list).sort();
}

/** Apakah keyword ada? */
function has(keyword) {
  return Object.prototype.hasOwnProperty.call(list, key(keyword));
}

/** Ambil item by keyword (atau null). */
function get(keyword) {
  return list[key(keyword)] || null;
}

/** Tambah keyword baru. Return false jika sudah ada. */
function add(keyword, response, by = '') {
  const k = key(keyword);
  if (!k || !response) return false;
  if (has(k)) return false;
  list[k] = { response: String(response), by, at: Date.now() };
  save();
  return true;
}

/** Update keyword yang sudah ada. Return false jika tidak ada. */
function update(keyword, response) {
  const k = key(keyword);
  if (!has(k)) return false;
  list[k].response = String(response);
  list[k].updatedAt = Date.now();
  save();
  return true;
}

/** Hapus keyword. Return false jika tidak ada. */
function del(keyword) {
  const k = key(keyword);
  if (!has(k)) return false;
  delete list[k];
  save();
  return true;
}

load();

module.exports = { load, save, getAll, keywords, has, get, add, update, del };
