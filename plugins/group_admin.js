/**
 * plugins/group_admin.js
 * Tag semua member grup.
 *
 * Perintah (Admin/Owner):
 *   .tagall [teks]   -> tag semua member dengan daftar @mention terlihat
 *   .hidetag [teks]  -> broadcast ke semua member dengan tag tersembunyi
 *
 * Catatan: di handler, admin:true mengizinkan Admin grup ATAU Owner.
 */

const { getNumber } = require('../lib/jid');

/** Ambil teks dari pesan yang di-reply, bila ada. */
function getQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return '';
  return q.conversation || q.extendedTextMessage?.text || q.imageMessage?.caption || q.videoMessage?.caption || '';
}

module.exports = {
  command: ['tagall', 'hidetag', 'tagsemua'],
  group: true,
  admin: true,
  desc: 'Tag semua member (terlihat) atau hidetag (tersembunyi)',
  run: async (ctx) => {
    const { conn, from, msg, command, text, reply, participants } = ctx;

    if (!participants || participants.length === 0) {
      return reply('⚠️ Gagal mengambil daftar peserta grup. Coba lagi.');
    }

    const mentions = participants.map((p) => p.id);
    const isi = (text && text.trim()) || getQuotedText(msg);

    // ---------- HIDETAG: tag tersembunyi ----------
    if (command === 'hidetag') {
      await conn.sendMessage(from, { text: isi || '📢', mentions });
      return;
    }

    // ---------- TAGALL: tag terlihat ----------
    let teks = `📢 *TAG ALL*\n`;
    if (isi) teks += `${isi}\n`;
    teks += `───────────────\n`;
    teks += participants.map((p) => `▢ @${getNumber(p.id)}`).join('\n');

    await conn.sendMessage(from, { text: teks, mentions }, { quoted: msg });
  },
};
