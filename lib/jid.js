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

const { jidNormalizedUser, areJidsSameUser } = require('@whiskeysockets/baileys');

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

  // Coba normalisasi via Baileys, fallback manual jika gagal
  try {
    return jidNormalizedUser(`${numberOnly}@${serverPart}`);
  } catch {
    return `${numberOnly}@s.whatsapp.net`;
  }
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
    if (areJidsSameUser(a, b)) return true;
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

module.exports = { cleanJid, getNumber, isSameUser, toJid };
