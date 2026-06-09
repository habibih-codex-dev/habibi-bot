/**
 * lib/jid.js
 * ------------------------------------------------------------------
 * Helper khusus penanganan JID (Jabber ID).
 *
 * MASALAH UTAMA pada Baileys terbaru:
 *   conn.user.id seringkali berbentuk -> "6281234:33@s.whatsapp.net"
 *   Angka ":33" adalah DEVICE ID. Jika tidak dibersihkan, semua
 *   pengecekan (owner, admin grup, simpan DB) akan GAGAL/BUG.
 *
 * Semua perbandingan nomor WAJIB lewat helper di sini.
 * ------------------------------------------------------------------
 */

// Util Baileys dimuat lewat loader tangguh (mendukung wrapper
// habibi-cloud-baileys / base v7 / fork via BAILEYS_PACKAGE).
const _baileys = require('./baileys');
const jidNormalizedUser =
  typeof _baileys.jidNormalizedUser === 'function' ? _baileys.jidNormalizedUser : null;
const areJidsSameUser =
  typeof _baileys.areJidsSameUser === 'function' ? _baileys.areJidsSameUser : null;

/**
 * Bersihkan JID dari Device ID dan normalisasi ke bentuk standar.
 * Contoh:
 *   "6281234:33@s.whatsapp.net"  -> "6281234@s.whatsapp.net"
 *   "6281234@s.whatsapp.net"     -> "6281234@s.whatsapp.net"
 *   "6281234"                    -> "6281234@s.whatsapp.net"
 *
 * @param {string} jid
 * @returns {string}
 */
function cleanJid(jid) {
  if (!jid || typeof jid !== 'string') return '';

  // Untuk JID grup biarkan apa adanya (kecuali bersihkan device id jika ada)
  if (jid.endsWith('@g.us')) return jid;

  // Ambil bagian server (@s.whatsapp.net / @lid / dst)
  const [userPart, serverPart = 's.whatsapp.net'] = jid.split('@');

  // Buang device id (":33") dari bagian user
  const numberOnly = userPart.split(':')[0];
  if (!numberOnly) return '';

  // Hanya normalisasi JID nomor telepon biasa.
  // Untuk @lid (dan domain lain) JANGAN dipaksa ke s.whatsapp.net,
  // karena LID adalah namespace berbeda — domainnya harus dipertahankan.
  if (serverPart === 's.whatsapp.net') {
    try {
      if (jidNormalizedUser) return jidNormalizedUser(`${numberOnly}@s.whatsapp.net`);
      return `${numberOnly}@s.whatsapp.net`;
    } catch {
      return `${numberOnly}@s.whatsapp.net`;
    }
  }
  return `${numberOnly}@${serverPart}`;
}

/**
 * Ambil nomor murni (digit saja) dari sebuah JID.
 * "6281234:33@s.whatsapp.net" -> "6281234"
 *
 * @param {string} jid
 * @returns {string}
 */
function getNumber(jid) {
  if (!jid || typeof jid !== 'string') return '';
  return jid.split('@')[0].split(':')[0];
}

/**
 * Bandingkan dua JID apakah merujuk ke user yang sama,
 * mengabaikan Device ID. Menggunakan areJidsSameUser bawaan Baileys
 * dengan fallback perbandingan manual.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function isSameUser(a, b) {
  if (!a || !b) return false;
  try {
    if (areJidsSameUser && areJidsSameUser(a, b)) return true;
  } catch {
    /* fallback di bawah */
  }
  return getNumber(a) === getNumber(b);
}

/**
 * Ubah nomor (string angka) menjadi JID standar.
 * "6281234" -> "6281234@s.whatsapp.net"
 *
 * @param {string|number} number
 * @returns {string}
 */
function toJid(number) {
  const num = String(number).replace(/[^0-9]/g, '');
  return `${num}@s.whatsapp.net`;
}

/**
 * Apakah sebuah JID berstatus admin/superadmin di daftar participants?
 *
 * ATURAN KETAT:
 *   - DILARANG memakai .includes() / === untuk membandingkan JID.
 *   - WAJIB lewat isSameUser() agar kebal Device ID (":33") dan
 *     perbedaan format (@s.whatsapp.net vs @lid) pada Baileys terbaru.
 *
 * Mendukung BANYAK kandidat JID (mis. nomor telepon + LID untuk
 * identitas yang sama) dan mencocokkan ke SEMUA field identitas
 * pada objek participant (id / jid / lid). Ini penting karena pada
 * Baileys terbaru, satu peserta bisa punya id @lid sekaligus jid @s.whatsapp.net.
 *
 * @param {Array<{id:string, jid?:string, lid?:string, admin?:string}>} participants
 * @param {...string} jids satu atau lebih JID kandidat yang ingin dicek
 * @returns {boolean}
 */
function isParticipantAdmin(participants, ...jids) {
  const targets = jids.filter(Boolean);
  if (!Array.isArray(participants) || targets.length === 0) return false;

  return participants.some((p) => {
    if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
    // Semua kemungkinan identitas peserta
    const pids = [p.id, p.jid, p.lid].filter(Boolean);
    return pids.some((pid) => targets.some((t) => isSameUser(pid, t)));
  });
}

module.exports = { cleanJid, getNumber, isSameUser, toJid, isParticipantAdmin };
