/**
 * plugins/iqc.js
 * Fitur IQC (iPhone / iOS Quote Chat) — Siputzx API.
 *
 * Perintah: .iqc <teks>  ATAU reply sebuah pesan lalu ketik .iqc
 *
 * Endpoint utama (sesuai instruksi):
 *   https://brat.siputzx.my.id/iphone-quoted?text=<teks>
 * Hasil: screenshot chat iOS lengkap dengan baris reaksi emoji
 *   (👍 ❤️ 😂 😮 😢 🙏) dan deretan menu konteks di bawahnya.
 *
 * Override opsional via config.iqc.customUrl (placeholder {text}).
 *
 * LIMIT: dipotong (-1) HANYA jika gambar berhasil dibuat & dikirim.
 * Bila API down/gagal, beri pesan ramah & limit TIDAK dipotong.
 */

const axios = require('axios');
const config = require('../config');

// Endpoint default Siputzx (tidak butuh apikey)
const DEFAULT_ENDPOINT = 'https://brat.siputzx.my.id/iphone-quoted';

// User-Agent gaya browser agar tidak ditolak (403) oleh server API
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Ambil teks dari pesan yang di-reply (quoted), bila ada. */
function getQuotedText(msg) {
  const q = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!q) return '';
  return (
    q.conversation ||
    q.extendedTextMessage?.text ||
    q.imageMessage?.caption ||
    q.videoMessage?.caption ||
    ''
  );
}

/** Bangun URL request. Default: Siputzx; bisa di-override via config.iqc.customUrl. */
function buildRequestUrl(text) {
  const enc = encodeURIComponent(text);
  const custom = config.iqc?.customUrl;
  if (custom) {
    return custom.includes('{text}')
      ? custom.replace('{text}', enc)
      : `${custom}${custom.includes('?') ? '&' : '?'}text=${enc}`;
  }
  return `${DEFAULT_ENDPOINT}?text=${enc}`;
}

module.exports = {
  command: ['iqc', 'iphonequote', 'qc'],
  desc: 'Buat screenshot chat iPhone lengkap (reaksi + menu) dari teks',
  run: async (ctx) => {
    const { conn, from, msg, text, reply, db, sender, isOwner, usedPrefix } = ctx;

    // Teks: utamakan argumen; jika kosong pakai teks pesan yang di-reply
    const quotedText = getQuotedText(msg);
    const content = (text && text.trim()) || quotedText;

    if (!content) {
      return reply(`Masukkan teks atau reply sebuah pesan.\nContoh: *${usedPrefix}iqc Halo Habibi Store!*`);
    }

    // ---- Gate limit (pre-check). Limit BARU dipotong saat sukses. ----
    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      await reply(config.messages.wait);

      const url = buildRequestUrl(content);

      // Minta sebagai binary; deteksi apakah respons gambar atau JSON {url}
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: { 'User-Agent': UA, Accept: 'image/*,application/json' },
      });
      const contentType = String(res.headers['content-type'] || '');

      let imageBuffer = null;

      if (contentType.startsWith('image/')) {
        imageBuffer = Buffer.from(res.data);
      } else {
        // Sebagian API mengembalikan JSON { url } / { result }
        let json = {};
        try {
          json = JSON.parse(Buffer.from(res.data).toString('utf-8'));
        } catch {
          throw new Error('Format respons API tidak dikenali');
        }
        const imgUrl = json.result?.url || json.url || json.result;
        if (!imgUrl || typeof imgUrl !== 'string') {
          throw new Error(json.message || 'API tidak mengembalikan gambar');
        }
        const img = await axios.get(imgUrl, {
          responseType: 'arraybuffer',
          timeout: 45000,
          headers: { 'User-Agent': UA },
        });
        imageBuffer = Buffer.from(img.data);
      }

      if (!imageBuffer || imageBuffer.length < 100) throw new Error('Gambar kosong/tidak valid');

      await conn.sendMessage(
        from,
        { image: imageBuffer, caption: '📱 *iPhone Quote Chat*' },
        { quoted: msg }
      );

      // Sukses -> potong limit
      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[IQC] gagal:', e.message);
      await reply(
        `⚠️ Maaf, gagal membuat IQC.\n_Alasan: ${e.message}_\n\nServer API mungkin sedang sibuk. Coba lagi nanti. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
