/**
 * plugins/iqc.js
 * Fitur IQC (iPhone / iOS Quote Chat).
 *
 * Perintah: .iqc <teks>   ATAU reply sebuah pesan lalu ketik .iqc
 *
 * Cara kerja: mengubah teks menjadi gambar gelembung chat ala iOS
 * memakai API Quotly (LyoSU) — generator quote bergaya bubble chat
 * yang mendukung tema gelap/terang. Hasil dikirim sebagai gambar.
 *
 * LIMIT: dipotong (-1) HANYA jika gambar berhasil dibuat & dikirim.
 * Bila API down/gagal, beri pesan ramah & limit TIDAK dipotong.
 */

const axios = require('axios');
const config = require('../config');
const { getNumber } = require('../lib/jid');

const QUOTLY_API = 'https://bot.lyo.su/quote/generate';

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

module.exports = {
  command: ['iqc', 'iphonequote', 'qc'],
  desc: 'Buat gambar chat ala iPhone/iOS dari teks',
  run: async (ctx) => {
    const { conn, from, msg, text, reply, db, sender, senderNumber, isOwner, usedPrefix } = ctx;

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
      // Identitas pengirim quote: nama & foto profil (untuk avatar bubble)
      // Bila pesan di-reply, gunakan identitas pengirim quoted tersebut.
      const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
      const targetJid = quotedText && ctxInfo?.participant ? ctxInfo.participant : sender;
      const displayName = msg.pushName || `+${getNumber(targetJid)}`;

      // Ambil URL foto profil (boleh gagal -> fallback avatar default)
      let avatarUrl = '';
      try {
        avatarUrl = await conn.profilePictureUrl(targetJid, 'image');
      } catch {
        avatarUrl = '';
      }

      const payload = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#1b1b1b', // tema gelap ala iOS dark mode
        width: 512,
        height: 768,
        scale: 2,
        messages: [
          {
            entities: [],
            avatar: true,
            from: {
              id: 1,
              name: displayName,
              photo: avatarUrl ? { url: avatarUrl } : undefined,
            },
            text: content,
            replyMessage: {},
          },
        ],
      };

      const { data } = await axios.post(QUOTLY_API, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const base64 = data?.result?.image;
      if (!base64) throw new Error('API tidak mengembalikan gambar');

      const buffer = Buffer.from(base64, 'base64');

      await conn.sendMessage(
        from,
        { image: buffer, caption: `📱 *iPhone Quote Chat*` },
        { quoted: msg }
      );

      // Sukses -> potong limit
      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[IQC] gagal:', e.message);
      await reply(
        `⚠️ Maaf, gagal membuat IQC.\n_Alasan: ${e.message}_\n\nServer gambar mungkin sedang sibuk. Coba lagi nanti. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
