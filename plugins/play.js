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

      // Kirim sebagai AUDIO BIASA (BUKAN voice note): ptt:false + audio/mpeg.
      // Mengirim via { url } membuat Baileys stream-download file penuh sehingga
      // tidak corrupt, dan WA memutarnya sebagai file musik normal.
      await conn.sendMessage(
        from,
        {
          audio: { url: audioUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: `${video.title}.mp3`,
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
