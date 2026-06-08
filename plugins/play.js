/**
 * plugins/play.js
 * Fitur PLAY YouTube (audio/MP3).
 *
 * Perintah: .play <judul lagu>   (alias: .play2 untuk kirim ulang info saja)
 *
 * Alur:
 *   1. Cari video paling relevan via yt-search.
 *   2. Kirim kartu info: thumbnail + judul + channel + durasi + views + link.
 *   3. Unduh audio (MP3) via scraper publik (btch-downloader) lalu kirim.
 *
 * LIMIT: dipotong (-1) HANYA jika audio berhasil dikirim. Bila gagal,
 * pesan ramah ditampilkan dan limit TIDAK dipotong.
 */

const config = require('../config');
const axios = require('axios');

// Dependency defensif (tidak meledak bila belum di-install)
let yts = null;
try {
  yts = require('yt-search');
} catch {
  console.warn('[PLAY] Paket "yt-search" belum di-install (npm install yt-search)');
}

let btch = {};
try {
  btch = require('btch-downloader');
} catch {
  console.warn('[PLAY] Paket "btch-downloader" belum di-install (npm install btch-downloader)');
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/**
 * Tentukan mimetype audio dari URL & content-type respons.
 * Banyak scraper YouTube sebenarnya mengembalikan m4a/webm walau diberi
 * label "mp3" -> WA bilang "file audio bermasalah" karena mimetype salah.
 */
function resolveAudioMime(url, contentType) {
  const ct = String(contentType || '').toLowerCase();
  const u = String(url || '').split('?')[0].toLowerCase();
  if (ct.includes('audio/mp4') || ct.includes('audio/m4a') || u.endsWith('.m4a')) return 'audio/mp4';
  if (ct.includes('audio/webm') || u.endsWith('.webm')) return 'audio/webm';
  if (ct.includes('audio/ogg') || u.endsWith('.ogg') || u.endsWith('.opus')) return 'audio/ogg';
  if (ct.includes('audio/mpeg') || u.endsWith('.mp3')) return 'audio/mpeg';
  // Default aman untuk audio YouTube modern adalah m4a (audio/mp4)
  return 'audio/mpeg';
}

/** Ekstensi file dari mimetype (untuk fileName). */
function extFromMime(mime) {
  if (mime === 'audio/mp4') return 'm4a';
  if (mime === 'audio/webm') return 'webm';
  if (mime === 'audio/ogg') return 'ogg';
  return 'mp3';
}

module.exports = {
  command: ['play', 'ytplay', 'song'],
  desc: 'Cari & kirim lagu (audio MP3) dari YouTube',
  run: async (ctx) => {
    const { conn, from, msg, text, reply, db, sender, isOwner, usedPrefix, fakeOfficial } = ctx;
    const fq = fakeOfficial || msg; // fake reply official (centang biru)

    if (!text) {
      return reply(`Masukkan judul lagu.\nContoh: *${usedPrefix}play dj siul*`);
    }

    // ---- Gate limit (pre-check). Limit BARU dipotong saat sukses. ----
    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      if (!yts) throw new Error('Modul pencarian YouTube tidak tersedia');

      await reply(`🔎 Mencari *${text}* di YouTube...`);

      const search = await yts(text);
      const video = (search?.videos || [])[0];
      if (!video) throw new Error('Lagu tidak ditemukan');

      // ---- Output 1: kartu info lagu ----
      const caption =
        `╭───「 *PLAY ${config.botName}* 」\n` +
        `│ 🎵 Judul   : ${video.title}\n` +
        `│ 📺 Channel : ${video.author?.name || '-'}\n` +
        `│ ⏱️ Durasi  : ${video.timestamp || '-'}\n` +
        `│ 👁️ Views   : ${video.views?.toLocaleString('id-ID') || '-'}\n` +
        `│ 📅 Upload  : ${video.ago || '-'}\n` +
        `╰───────────────\n` +
        `🔗 ${video.url}\n\n` +
        `⏳ _Mengunduh audio, mohon tunggu..._`;

      await conn.sendMessage(
        from,
        { image: { url: video.thumbnail || video.image }, caption },
        { quoted: fq }
      );

      // ---- Output 2: unduh & kirim audio ----
      if (typeof btch.youtube !== 'function') throw new Error('Modul YouTube downloader tidak tersedia');

      const res = await btch.youtube(video.url);
      const audioUrl = res?.mp3 || res?.audio;
      if (!audioUrl) throw new Error('Gagal mengambil tautan audio');

      // PENTING: unduh penuh ke Buffer dulu agar file TIDAK corrupt/0KB.
      // Mengirim langsung { url } kadang terputus di tengah -> "file audio bermasalah".
      const dl = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: 100 * 1024 * 1024, // 100 MB
        headers: { 'User-Agent': UA },
      });
      const audioBuffer = Buffer.from(dl.data);
      if (!audioBuffer || audioBuffer.length < 1024) {
        throw new Error('File audio kosong/tidak lengkap');
      }

      // Tentukan mimetype sesuai format ASLI file (mp3/m4a/webm) agar bisa diputar.
      const mimetype = resolveAudioMime(audioUrl, dl.headers['content-type']);
      const ext = extFromMime(mimetype);

      await conn.sendMessage(
        from,
        {
          audio: audioBuffer,
          mimetype,
          ptt: false,
          fileName: `${video.title}.${ext}`,
        },
        { quoted: fq }
      );

      // Sukses -> potong limit
      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[PLAY] gagal:', e.message);
      await reply(
        `⚠️ Maaf, gagal memutar *${text}*.\n_Alasan: ${e.message}_\n\nCoba lagi nanti. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
