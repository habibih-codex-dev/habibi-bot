/**
 * plugins/iqc.js
 * Fitur IQC (iPhone / iOS Quote Chat) — versi FULL REACTION.
 *
 * Perintah: .iqc <teks>  ATAU reply sebuah pesan lalu ketik .iqc
 *
 * Berbeda dari versi awal (yang hanya bubble polos), versi ini memakai
 * API yang menghasilkan screenshot iOS LENGKAP: baris reaksi emoji
 * (👍 ❤️ 😂 😮 😢 🙏) dan menu konteks (Balas, Teruskan, Beri Bintang, dll).
 *
 * Provider dikonfigurasi di config.iqc:
 *   - 'lolhuman' : https://api.lolhuman.xyz/api/iphonequote (butuh apikey)
 *   - 'custom'   : config.iqc.customUrl dengan placeholder {text} & {apikey}
 *
 * LIMIT: dipotong (-1) HANYA jika gambar berhasil dibuat & dikirim.
 * Bila API down/gagal, beri pesan ramah & limit TIDAK dipotong.
 */

const axios = require('axios');
const config = require('../config');

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

/** Bangun URL request sesuai provider yang dipilih di config. */
function buildRequestUrl(text) {
  const { provider, apikey, customUrl } = config.iqc || {};
  const enc = encodeURIComponent(text);

  if (provider === 'custom' && customUrl) {
    return customUrl.replace('{text}', enc).replace('{apikey}', encodeURIComponent(apikey || ''));
  }

  // Default: lolhuman (endpoint iphonequote -> screenshot reaksi iOS lengkap)
  if (!apikey) {
    throw new Error(
      'API key IQC belum diisi. Set config.iqc.apikey (provider lolhuman) ' +
        'atau pakai provider "custom" + customUrl.'
    );
  }
  return `https://api.lolhuman.xyz/api/iphonequote?apikey=${encodeURIComponent(apikey)}&text=${enc}`;
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
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
      const contentType = String(res.headers['content-type'] || '');

      let imageBuffer = null;

      if (contentType.startsWith('image/')) {
        imageBuffer = Buffer.from(res.data);
      } else {
        // Coba parse JSON (provider yang mengembalikan { result/url })
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
        const img = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
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
        `⚠️ Maaf, gagal membuat IQC.\n_Alasan: ${e.message}_\n\nPastikan *config.iqc.apikey* sudah diisi & server API aktif. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
