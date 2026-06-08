/**
 * plugins/toimg.js
 * Ubah stiker (yang di-reply) kembali menjadi file gambar (PNG).
 *
 * Perintah: .toimg  (reply sebuah stiker)
 *
 * LIMIT: dipotong (-1) jika gambar berhasil dikirim.
 */

const config = require('../config');
const { getQuotedMessage, getMediaType, downloadFrom } = require('../lib/media');

let sharp = null;
try {
  sharp = require('sharp');
} catch {
  console.warn('[TOIMG] Paket "sharp" belum di-install.');
}

module.exports = {
  command: ['toimg', 'toimage', 'stikertoimg'],
  desc: 'Ubah stiker menjadi gambar',
  run: async (ctx) => {
    const { conn, from, msg, reply, db, sender, isOwner, usedPrefix } = ctx;

    const quoted = getQuotedMessage(msg);
    if (!quoted || getMediaType(quoted) !== 'sticker') {
      return reply(`Reply sebuah *stiker* lalu ketik *${usedPrefix}toimg*.`);
    }

    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      if (!sharp) throw new Error('Modul konversi belum tersedia (npm install sharp)');
      await reply(config.messages.wait);

      const buffer = await downloadFrom(conn, quoted);
      // Konversi WEBP (stiker) -> PNG. Untuk stiker animasi diambil frame pertama.
      const png = await sharp(buffer).png().toBuffer();

      await conn.sendMessage(from, { image: png, caption: '🖼️ Stiker -> Gambar' }, { quoted: msg });

      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[TOIMG] gagal:', e.message);
      await reply(
        `⚠️ Gagal mengubah stiker ke gambar.\n_Alasan: ${e.message}_\n\nLimit kamu *tidak* dipotong.`
      );
    }
  },
};
