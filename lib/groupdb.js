/**
 * lib/groupdb.js
 * ------------------------------------------------------------------
 * Penyimpanan setting per-grup (mis. status antilink) di
 * database/groups.json.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'groups.json');

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

/** Ambil/buat setting grup. */
function getGroup(jid) {
  if (!groups[jid]) {
    groups[jid] = { antilink: false, autoSholat: false };
    save();
  } else if (groups[jid].autoSholat === undefined) {
    // Migrasi untuk grup lama
    groups[jid].autoSholat = false;
    save();
  }
  return groups[jid];
}

/** Set status antilink grup. */
function setAntilink(jid, value) {
  const g = getGroup(jid);
  g.antilink = !!value;
  save();
  return g.antilink;
}

/** Set status auto pengingat adzan grup. */
function setAutoSholat(jid, value) {
  const g = getGroup(jid);
  g.autoSholat = !!value;
  save();
  return g.autoSholat;
}

/** Ambil seluruh setting grup (objek mentah). */
function getAll() {
  return groups;
}

load();

module.exports = { load, save, getGroup, setAntilink, setAutoSholat, getAll };
