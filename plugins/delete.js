/**
 * plugins/delete.js
 * Hapus pesan dengan cara me-reply pesan target.
 *
 * Perintah: .delete / .del / .d  (reply pesan yang ingin dihapus)
 *
 * - Pesan bot sendiri: selalu bisa dihapus.
 * - Pesan member lain: hanya berhasil jika BOT sudah jadi Admin grup
 *   (jika bukan admin, WhatsApp menolak -> ditangani try/catch).
 */

module.exports = {
  command: ['delete', 'del', 'd'],
  desc: 'Hapus pesan yang di-reply',
  run: async (ctx) => {
    const { conn, from, msg, reply, usedPrefix } = ctx;

    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.stanzaId) {
      return reply(`Reply pesan yang ingin dihapus, lalu ketik *${usedPrefix}del*.`);
    }

    // Bangun key pesan target. Jika tidak ada participant -> pesan dari bot sendiri.
    const key = {
      remoteJid: from,
      fromMe: !ctxInfo.participant,
      id: ctxInfo.stanzaId,
      participant: ctxInfo.participant || undefined,
    };

    try {
      await conn.sendMessage(from, { delete: key });
    } catch (e) {
      console.error('[DELETE] gagal:', e.message);
      await reply(
        `⚠️ Gagal menghapus pesan.\n_Alasan: ${e.message}_\n\nUntuk menghapus pesan orang lain, jadikan *bot sebagai Admin* grup.`
      );
    }
  },
};
