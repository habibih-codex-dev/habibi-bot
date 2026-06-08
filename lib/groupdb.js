/**
 * lib/groupdb.js
 * ------------------------------------------------------------------
 * Penyimpanan setting per-grup (antilink, proteksi anti-abuse, dll)
 * di database/groups.json.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'groups.json');

// Daftar fitur proteksi yang didukung + nilai default (semua OFF).
const PROTECTION_KEYS = [
  'antilink', // V1: hanya delete pesan ber-link (http/https)
  'antilinkv2', // V2: delete + kick
  'antilinkwa', // V1: link grup chat.whatsapp.com -> delete saja
  'antilinkwav2', // V2: link grup WA -> warning bertahap -> kick di maxWarn
  'antilinkch', // link channel whatsapp.com/channel -> delete + kick
  'antibot', // kick bot lain yang join
  'antitoxic', // delete kata kasar
  'antijudol', // delete + kick kata judi
  'antilinkpising', // delete + kick link/keyword phising
  'antibug', // delete + kick teks virtex/bug
  'antitagall', // member biasa tagall/hidetag massal -> delete (+kick)
  'antihidetag', // member biasa pakai hidetag (mention tersembunyi) -> delete
  'antiforeign', // kick nomor luar negeri yang join
  'autoSholat', // pengingat adzan otomatis
];

let groups = {};

function ensureFile() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    groups = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    groups = {};
  }
  return groups;
}

function save() {
  try {
    ensureFile();
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(groups, null, 2));
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[GROUP DB] Gagal menyimpan:', e.message);
  }
}

/** Ambil/buat setting grup (sekaligus migrasi field proteksi yang belum ada). */
function getGroup(jid) {
  if (!groups[jid]) groups[jid] = {};
  let changed = false;
  for (const key of PROTECTION_KEYS) {
    if (groups[jid][key] === undefined) {
      groups[jid][key] = false;
      changed = true;
    }
  }
  if (changed) save();
  return groups[jid];
}

/**
 * Set sebuah fitur proteksi grup (generic).
 * @param {string} jid groupJid
 * @param {string} feature salah satu PROTECTION_KEYS
 * @param {boolean} value
 * @returns {boolean} nilai akhir
 */
function setFeature(jid, feature, value) {
  if (!PROTECTION_KEYS.includes(feature)) {
    throw new Error(`Fitur proteksi tidak dikenal: ${feature}`);
  }
  const g = getGroup(jid);
  g[feature] = !!value;
  save();
  return g[feature];
}

/** Cek status sebuah fitur proteksi grup. */
function isOn(jid, feature) {
  const g = getGroup(jid);
  return !!g[feature];
}

// ---- Backward compatibility helpers ----
function setAntilink(jid, value) {
  return setFeature(jid, 'antilink', value);
}
function setAutoSholat(jid, value) {
  return setFeature(jid, 'autoSholat', value);
}

/** Ambil seluruh setting grup (objek mentah). */
function getAll() {
  return groups;
}

load();

module.exports = {
  load,
  save,
  getGroup,
  setFeature,
  isOn,
  setAntilink,
  setAutoSholat,
  getAll,
  PROTECTION_KEYS,
};
