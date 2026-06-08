/**
 * lib/protection.js
 * ------------------------------------------------------------------
 * Mesin deteksi & penindakan Anti-Abuse grup.
 *
 * Dipanggil dari handler.js untuk SETIAP pesan grup. Mengevaluasi
 * fitur-fitur proteksi yang AKTIF pada grup tersebut, lalu menindak
 * (delete dan/atau kick) HANYA terhadap MEMBER BIASA.
 *
 * BYPASS WAJIB: Owner bot & Admin grup TIDAK pernah ditindak.
 * ------------------------------------------------------------------
 */

const config = require('../config');
const groupdb = require('./groupdb');

// ===================== REGEX & POLA =====================
const RE_URL = /https?:\/\/[^\s]+/i;
const RE_WA_GROUP = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
const RE_WA_CHANNEL = /(whatsapp\.com\/channel\/|wa\.me\/channel\/)[A-Za-z0-9]+/i;

/** Susun regex word-boundary dari daftar kata (lowercase, escaped). */
function buildWordRegex(words) {
  const escaped = (words || [])
    .map((w) => String(w).trim().toLowerCase())
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return null;
  // \b kurang andal untuk substring seperti "wd " -> gunakan pencocokan longgar
  return new RegExp(`(^|[^a-z0-9])(${escaped.join('|')})([^a-z0-9]|$)`, 'i');
}

const sec = config.security || {};
const RE_TOXIC = buildWordRegex(sec.toxicWords);
const RE_JUDOL = buildWordRegex(sec.gamblingWords);
const RE_PHISING = buildWordRegex(sec.phisingWords);

/**
 * Deteksi teks "virtex"/bug: sangat panjang, atau padat karakter
 * non-ASCII/kombinasi unicode (zalgo) yang berpotensi membuat WA hang.
 */
function isBugText(text) {
  if (!text) return false;
  if (text.length > 8000) return true; // pesan abnormal panjang
  // Hitung karakter unicode "menggabung" (combining marks) -> indikasi zalgo
  const combining = (text.match(/[\u0300-\u036f\u0489\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g) || []).length;
  if (combining > 80) return true;
  // Karakter kontrol/invisible berlebihan
  const invisible = (text.match(/[\u200b-\u200f\u2028-\u202f\u2060-\u206f]/g) || []).length;
  if (invisible > 200) return true;
  return false;
}

/**
 * Evaluasi proteksi terhadap satu pesan grup.
 *
 * @param {object} p
 * @param {object} p.conn       socket Baileys
 * @param {object} p.msg        objek pesan asli (punya .key)
 * @param {string} p.from       groupJid
 * @param {string} p.body       teks pesan
 * @param {string} p.sender     JID pengirim (sudah bersih)
 * @param {string} p.senderNumber nomor pengirim (digit)
 * @param {boolean} p.isAdmin   apakah pengirim admin grup
 * @param {boolean} p.isBotAdmin apakah bot admin grup
 * @param {boolean} p.isOwner   apakah pengirim owner bot
 * @returns {Promise<boolean>}  true jika pesan ditindak (sudah dihapus)
 */
async function runProtections(p) {
  const { conn, msg, from, body, sender, senderNumber, isAdmin, isBotAdmin, isOwner } = p;

  // BYPASS: owner & admin grup tidak pernah ditindak.
  if (isOwner || isAdmin) return false;

  const g = groupdb.getGroup(from);

  // Helper tindakan
  const del = async () => {
    try {
      await conn.sendMessage(from, { delete: msg.key });
    } catch (e) {
      console.error('[PROT] gagal hapus pesan:', e.message);
    }
  };
  const kick = async () => {
    if (!isBotAdmin) return; // butuh bot admin untuk kick
    try {
      await conn.groupParticipantsUpdate(from, [sender], 'remove');
    } catch (e) {
      console.error('[PROT] gagal kick:', e.message);
    }
  };
  const warn = async (label) => {
    try {
      await conn.sendMessage(from, {
        text: `⚠️ *${label}*\n@${senderNumber} melanggar aturan grup. Pesan dihapus.`,
        mentions: [sender],
      });
    } catch (_) {
      /* abaikan */
    }
  };

  // Daftar aturan (urutan = prioritas). Tiap aturan punya: aktif, cocok, aksi.
  // ANTIBUG diutamakan (paling berbahaya).
  const rules = [
    {
      on: g.antibug,
      hit: () => isBugText(body),
      label: 'ANTIBUG',
      kick: true,
    },
    {
      on: g.antilinkpising,
      hit: () => RE_PHISING && RE_PHISING.test(body),
      label: 'ANTI-PHISING',
      kick: true,
    },
    {
      on: g.antijudol,
      hit: () => RE_JUDOL && RE_JUDOL.test(body),
      label: 'ANTI-JUDOL',
      kick: true,
    },
    {
      on: g.antilinkch,
      hit: () => RE_WA_CHANNEL.test(body),
      label: 'ANTI-LINK CHANNEL',
      kick: true,
    },
    {
      on: g.antilinkwa,
      hit: () => RE_WA_GROUP.test(body),
      label: 'ANTI-LINK GRUP WA',
      kick: true,
    },
    {
      on: g.antilinkv2,
      hit: () => RE_URL.test(body),
      label: 'ANTILINK V2',
      kick: true,
    },
    {
      on: g.antitoxic,
      hit: () => RE_TOXIC && RE_TOXIC.test(body),
      label: 'ANTI-TOXIC',
      kick: false, // hanya delete
    },
    {
      on: g.antilink,
      hit: () => RE_URL.test(body),
      label: 'ANTILINK',
      kick: false, // V1: hanya delete (peringatan)
    },
  ];

  for (const r of rules) {
    if (!r.on) continue;
    let matched = false;
    try {
      matched = r.hit();
    } catch (e) {
      console.error(`[PROT] error cek ${r.label}:`, e.message);
      matched = false;
    }
    if (!matched) continue;

    await warn(r.label);
    await del();
    if (r.kick) await kick();
    return true; // sudah ditindak, hentikan evaluasi aturan lain
  }

  return false;
}

module.exports = { runProtections, isBugText };
