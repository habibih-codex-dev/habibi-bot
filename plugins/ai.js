/**
 * plugins/ai.js
 * Contoh fitur BERLIMIT.
 *
 * `limit: 1` -> setiap penggunaan sukses memotong 1 limit user.
 * Owner & user Premium TIDAK terpotong (lihat handler.js).
 *
 * Catatan: ini contoh dummy. Ganti bagian "JAWABAN AI" dengan
 * integrasi API AI favoritmu (OpenAI, Gemini, dsb).
 */

const config = require('../config');
const { formatNumber } = require('../lib/functions');

module.exports = {
  command: ['ai', 'tanya', 'gpt'],
  limit: 1, // memotong 1 limit per penggunaan sukses
  desc: 'Contoh fitur AI (berlimit)',
  run: async (ctx) => {
    const { text, reply, db, sender, isOwner } = ctx;

    if (!text) {
      return reply(`Masukkan pertanyaan.\nContoh: *${ctx.usedPrefix}ai apa itu Habibi Cloud?*`);
    }

    // ====== GANTI BAGIAN INI DENGAN API AI SUNGGUHAN ======
    const jawaban = `🤖 *AI ${config.botName}*\n\nPertanyaan: ${text}\n\nJawaban: (ini contoh respon. Hubungkan ke API AI untuk jawaban nyata.)`;
    // =======================================================

    await reply(jawaban);

    // Info sisa limit (limit aktual dipotong oleh handler setelah sukses)
    const u = ctx.user || db.getUser(sender) || { premium: false, limit: 0 };
    if (!isOwner && !u.premium) {
      const sisa = Math.max(0, u.limit - 1);
      await reply(`🔋 Sisa limit kamu: *${formatNumber(sisa)}*`);
    }
  },
};
