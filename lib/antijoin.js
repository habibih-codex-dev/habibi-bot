/**
 * lib/antijoin.js
 * ------------------------------------------------------------------
 * Penindakan saat ada anggota BARU bergabung ke grup:
 *   - .antibot     : kick nomor bot lain (heuristik) yang join
 *   - .antiforeign : kick nomor luar negeri (awalan non-62) yang join
 *
 * Dipasang sekali di index.js melalui event 'group-participants.update'.
 * ------------------------------------------------------------------
 */

const config = require('../config');
const groupdb = require('./groupdb');
const { cleanJid, getNumber, isParticipantAdmin, isSameUser } = require('./jid');
const { isOwner } = require('./functions');

/** Heuristik: apakah sebuah nomor kemungkinan BOT lain? */
function looksLikeBot(number) {
  if (!number) return false;
  // Bot WhatsApp Business API umumnya pakai country code Amerika (1) dgn
  // pola panjang tertentu, atau nomor sangat panjang (>15 digit).
  if (number.length > 15) return true;
  // Pola nomor "test"/virtual yang umum dipakai bot (heuristik longgar).
  if (/^1(\d{10,})$/.test(number) && number.length >= 13) return true;
  return false;
}

/** Apakah nomor termasuk luar negeri (bukan awalan Indonesia 62)? */
function isForeign(number) {
  if (!number) return false;
  if (number.startsWith('62')) return false; // Indonesia -> aman
  const prefixes = config.security?.foreignPrefixes || [];
  return prefixes.some((pre) => number.startsWith(String(pre)));
}

/**
 * Daftarkan listener join. Dipanggil sekali dari index.js.
 * @param {object} conn socket Baileys
 */
function register(conn) {
  conn.ev.on('group-participants.update', async (update) => {
    try {
      const { id: from, participants: joined, action } = update;
      if (action !== 'add' || !from?.endsWith('@g.us')) return;

      const g = groupdb.getGroup(from);
      if (!g.antibot && !g.antiforeign) return; // tidak ada proteksi join aktif

      // Ambil metadata untuk cek bot admin & jangan kick admin
      let parts = [];
      try {
        const meta = await conn.groupMetadata(from);
        parts = meta.participants || [];
      } catch (e) {
        console.error('[ANTIJOIN] gagal metadata:', e.message);
      }

      const botPn = cleanJid(conn.user?.id);
      const botLid = cleanJid(conn.user?.lid);
      const botIds = [botPn, botLid].filter(Boolean);
      const botIsAdmin = isParticipantAdmin(parts, ...botIds);
      if (!botIsAdmin) return; // tidak bisa kick tanpa admin

      for (const raw of joined) {
        const jid = cleanJid(raw);
        const number = getNumber(jid);
        if (!number) continue;

        // Jangan tindak bot sendiri / owner / admin
        if (botIds.some((b) => isSameUser(b, jid))) continue;
        if (isOwner(jid)) continue;
        if (isParticipantAdmin(parts, jid)) continue;

        let alasan = null;
        if (g.antibot && looksLikeBot(number)) alasan = 'ANTIBOT (terdeteksi bot lain)';
        else if (g.antiforeign && isForeign(number)) alasan = 'ANTI-FOREIGN (nomor luar negeri)';

        if (alasan) {
          try {
            await conn.sendMessage(from, {
              text: `🛡️ *${alasan}*\n@${number} otomatis dikeluarkan dari grup.`,
              mentions: [jid],
            });
            await conn.groupParticipantsUpdate(from, [jid], 'remove');
          } catch (e) {
            console.error('[ANTIJOIN] gagal kick', number, e.message);
          }
        }
      }
    } catch (e) {
      console.error('[ANTIJOIN] error:', e.message);
    }
  });
  console.log('🛡️ Anti-join (antibot/antiforeign) listener aktif.');
}

module.exports = { register, looksLikeBot, isForeign };
