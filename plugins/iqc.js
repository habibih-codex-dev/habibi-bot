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

/** Ekstrak buffer gambar dari respons (image langsung atau JSON {url}). */
async function extractImage(res) {
  const contentType = String(res.headers['content-type'] || '');
  if (contentType.startsWith('image/')) {
    return Buffer.from(res.data);
  }
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
  return Buffer.from(img.data);
}

/**
 * Ambil gambar IQC dari API.
 * Penyebab error 500 biasanya struktur parameter yang salah, jadi kita
 * coba GET (?text=) lebih dulu, lalu fallback POST (JSON {text}) bila gagal.
 * Teks SELALU di-encode dengan benar (encodeURIComponent untuk GET,
 * body JSON untuk POST).
 */
async function fetchIqcImage(rawText) {
  const base = config.iqc?.customUrl || DEFAULT_ENDPOINT;
  const sep = base.includes('?') ? '&' : '?';
  const getUrl = base.includes('{text}')
    ? base.replace('{text}', encodeURIComponent(rawText))
    : `${base}${sep}text=${encodeURIComponent(rawText)}`;

  // 1) Coba GET ?text=
  try {
    const res = await axios.get(getUrl, {
      responseType: 'arraybuffer',
      timeout: 45000,
      headers: { 'User-Agent': UA, Accept: 'image/*,application/json' },
    });
    return await extractImage(res);
  } catch (errGet) {
    const code = errGet.response?.status;
    console.warn(`[IQC] GET gagal (${code || errGet.message}), coba POST...`);

    // 2) Fallback POST JSON { text }
    const postBase = base.split('?')[0];
    const res = await axios.post(
      postBase,
      { text: rawText },
      {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'image/*,application/json' },
      }
    );
    return await extractImage(res);
  }
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

      const imageBuffer = await fetchIqcImage(content);
      if (!imageBuffer || imageBuffer.length < 100) throw new Error('Gambar kosong/tidak valid');

      await conn.sendMessage(
        from,
        { image: imageBuffer, caption: '📱 *iPhone Quote Chat*' },
        { quoted: msg }
      );

      // Sukses -> potong limit
      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      const code = e.response?.status ? ` (HTTP ${e.response.status})` : '';
      console.error('[IQC] gagal:', e.message, code);
      await reply(
        `⚠️ Maaf, gagal membuat IQC${code}.\n_Alasan: ${e.message}_\n\nServer API mungkin sedang sibuk/maintenance. Coba lagi nanti. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
