/**
 * plugins/sticker.js
 * Ubah gambar / video pendek menjadi stiker WhatsApp.
 *
 * Perintah: .sticker / .s / .stiker
 *   - Kirim gambar/video dengan caption perintah, ATAU
 *   - Reply gambar/video lalu ketik perintah.
 *
 * LIMIT: dipotong (-1) jika stiker berhasil dikirim.
 */

const config = require('../config');
const { getQuotedMessage, getMediaType, downloadFrom } = require('../lib/media');

let Sticker = null;
let StickerTypes = null;
try {
  ({ Sticker, StickerTypes } = require('wa-sticker-formatter'));
} catch {
  console.warn('[STICKER] Paket "wa-sticker-formatter" belum di-install.');
}

module.exports = {
  command: ['sticker', 's', 'stiker'],
  desc: 'Ubah gambar/video pendek menjadi stiker',
  run: async (ctx) => {
    const { conn, from, msg, reply, db, sender, isOwner, usedPrefix } = ctx;

    // Tentukan sumber media: pesan saat ini atau pesan yang di-reply
    const quoted = getQuotedMessage(msg);
    let target = null;
    const curType = getMediaType(msg);
    if (curType === 'image' || curType === 'video') {
      target = msg;
    } else if (quoted && ['image', 'video'].includes(getMediaType(quoted))) {
      target = quoted;
    }

    if (!target) {
      return reply(
        `Kirim atau reply *gambar/video pendek* dengan caption *${usedPrefix}sticker*.`
      );
    }

    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      if (!Sticker) throw new Error('Modul stiker belum tersedia (npm install wa-sticker-formatter)');
      await reply(config.messages.wait);

      const buffer = await downloadFrom(conn, target);
      const sticker = new Sticker(buffer, {
        pack: config.storeName,
        author: config.botName,
        type: StickerTypes.FULL,
        quality: 50,
      });
      const out = await sticker.toBuffer();

      await conn.sendMessage(from, { sticker: out }, { quoted: msg });

      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[STICKER] gagal:', e.message);
      await reply(
        `⚠️ Gagal membuat stiker.\n_Alasan: ${e.message}_\n\nGunakan video pendek (maks ~10 detik). Limit kamu *tidak* dipotong.`
      );
    }
  },
};
