/**
 * plugins/downloader.js
 * Fitur downloader Habibi Store.
 *
 * Perintah:
 *   .tiktok <url>          - unduh video TikTok (tanpa watermark)
 *   .ig <url>              - unduh media Instagram
 *   .facebook <url>        - unduh video Facebook
 *   .ytmp3 <url|judul>     - unduh audio (mp3) YouTube
 *   .ytmp4 <url|judul>     - unduh video (mp4) YouTube
 *   .yts <kata kunci>      - cari video YouTube
 *   .spotify <url>         - unduh lagu Spotify
 *
 * ATURAN LIMIT (PENTING):
 *   - Limit dipotong (-1) HANYA JIKA file/hasil berhasil dikirim.
 *   - Jika API gagal/error, beri pesan ramah & limit TIDAK dipotong.
 *   - Karena itu plugin ini TIDAK memakai properti `limit` (auto-deduct
 *     handler), melainkan mengelola limit secara manual.
 *
 * Catatan dependency (jalankan: npm install):
 *   axios, yt-search, btch-downloader
 *   Endpoint API publik bisa berubah sewaktu-waktu; semua dibungkus
 *   try/catch agar bot tidak pernah crash.
 */

const axios = require('axios');
const config = require('../config');

// Muat dependency secara defensif (tidak meledak bila belum di-install)
let yts = null;
try {
  yts = require('yt-search');
} catch {
  console.warn('[DL] Paket "yt-search" belum di-install (npm install yt-search)');
}

let btch = {};
try {
  btch = require('btch-downloader');
} catch {
  console.warn('[DL] Paket "btch-downloader" belum di-install (npm install btch-downloader)');
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const isUrl = (s) => /^https?:\/\//i.test(String(s || '').trim());

module.exports = {
  command: [
    'tiktok', 'tt',
    'ig', 'instagram', 'igdl',
    'facebook', 'fb',
    'ytmp3', 'yta',
    'ytmp4', 'ytv',
    'yts', 'ytsearch',
    'spotify', 'spotydl',
  ],
  desc: 'Downloader TikTok / IG / Facebook / YouTube / Spotify',
  run: async (ctx) => {
    const { conn, from, msg, command, text, reply, db, sender, isOwner } = ctx;

    // ---- Gate limit (pre-check). Limit BARU dipotong saat sukses. ----
    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    // Helper: potong limit hanya saat sukses
    const chargeLimit = () => {
      if (!isOwner) db.useLimit(sender, 1);
    };

    try {
      switch (command) {
        // ==================== TIKTOK ====================
        case 'tiktok':
        case 'tt': {
          if (!isUrl(text)) return reply(`Kirim link TikTok.\nContoh: *${ctx.usedPrefix}tiktok <url>*`);
          await reply(config.messages.wait);

          let videoUrl = null;
          let title = '';
          // Sumber utama: tikwm (stabil, no watermark)
          try {
            const { data } = await axios.get(
              `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`,
              { headers: { 'User-Agent': UA }, timeout: 30000 }
            );
            if (data?.data?.play) {
              videoUrl = data.data.play.startsWith('http')
                ? data.data.play
                : `https://www.tikwm.com${data.data.play}`;
              title = data.data.title || '';
            }
          } catch (_) {
            /* fallback di bawah */
          }
          // Fallback: btch ttdl
          if (!videoUrl && typeof btch.ttdl === 'function') {
            const res = await btch.ttdl(text);
            videoUrl = res?.video?.[0] || res?.video || res?.url || null;
          }
          if (!videoUrl) throw new Error('Tidak menemukan media TikTok');

          await conn.sendMessage(
            from,
            { video: { url: videoUrl }, caption: `🎬 *TikTok*\n${title}`.trim() },
            { quoted: msg }
          );
          chargeLimit();
          break;
        }

        // ==================== INSTAGRAM ====================
        case 'ig':
        case 'instagram':
        case 'igdl': {
          if (!isUrl(text)) return reply(`Kirim link Instagram.\nContoh: *${ctx.usedPrefix}ig <url>*`);
          if (typeof btch.igdl !== 'function') throw new Error('Modul Instagram tidak tersedia');
          await reply(config.messages.wait);

          const res = await btch.igdl(text);
          const items = Array.isArray(res) ? res : res ? [res] : [];
          if (items.length === 0) throw new Error('Tidak menemukan media Instagram');

          let sent = 0;
          for (const it of items.slice(0, 10)) {
            const url = it?.url || it?.thumbnail || it;
            if (!url) continue;
            const isVideo = /\.mp4|video/i.test(String(url)) || it?.type === 'video';
            try {
              await conn.sendMessage(
                from,
                isVideo ? { video: { url } } : { image: { url } },
                { quoted: msg }
              );
              sent += 1;
            } catch (_) {
              /* lewati item gagal */
            }
          }
          if (sent === 0) throw new Error('Gagal mengirim media Instagram');
          chargeLimit();
          break;
        }

        // ==================== FACEBOOK ====================
        case 'facebook':
        case 'fb': {
          if (!isUrl(text)) return reply(`Kirim link Facebook.\nContoh: *${ctx.usedPrefix}fb <url>*`);
          if (typeof btch.fbdown !== 'function') throw new Error('Modul Facebook tidak tersedia');
          await reply(config.messages.wait);

          const res = await btch.fbdown(text);
          const url = res?.HD || res?.Normal_video || res?.SD || res?.url;
          if (!url) throw new Error('Tidak menemukan video Facebook');

          await conn.sendMessage(
            from,
            { video: { url }, caption: '🎬 *Facebook Video*' },
            { quoted: msg }
          );
          chargeLimit();
          break;
        }

        // ==================== YOUTUBE SEARCH ====================
        case 'yts':
        case 'ytsearch': {
          if (!text) return reply(`Masukkan kata kunci.\nContoh: *${ctx.usedPrefix}yts lo-fi study*`);
          if (!yts) throw new Error('Modul pencarian YouTube tidak tersedia');
          await reply(config.messages.wait);

          const search = await yts(text);
          const vids = (search?.videos || []).slice(0, 8);
          if (vids.length === 0) throw new Error('Video tidak ditemukan');

          let out = `🔎 *Hasil Pencarian YouTube*\n_${text}_\n\n`;
          out += vids
            .map(
              (v, i) =>
                `${i + 1}. *${v.title}*\n   ⏱️ ${v.timestamp} | 👁️ ${v.views?.toLocaleString('id-ID') || '-'}\n   🔗 ${v.url}`
            )
            .join('\n\n');
          out += `\n\n_Unduh dengan:_ *${ctx.usedPrefix}ytmp3 <url>* / *${ctx.usedPrefix}ytmp4 <url>*`;

          await reply(out);
          chargeLimit();
          break;
        }

        // ==================== YOUTUBE MP3 / MP4 ====================
        case 'ytmp3':
        case 'yta':
        case 'ytmp4':
        case 'ytv': {
          if (!text) return reply(`Masukkan link/judul YouTube.\nContoh: *${ctx.usedPrefix}${command} <url>*`);
          const wantAudio = command === 'ytmp3' || command === 'yta';
          await reply(config.messages.wait);

          // Resolusi URL: jika input bukan url, cari dulu via yt-search
          let url = text.trim();
          let title = '';
          if (!isUrl(url)) {
            if (!yts) throw new Error('Modul pencarian YouTube tidak tersedia');
            const search = await yts(url);
            const first = search?.videos?.[0];
            if (!first) throw new Error('Video tidak ditemukan');
            url = first.url;
            title = first.title;
          }

          if (typeof btch.youtube !== 'function') throw new Error('Modul YouTube tidak tersedia');
          const res = await btch.youtube(url);
          title = title || res?.title || 'YouTube';
          const mediaUrl = wantAudio
            ? res?.mp3 || res?.audio
            : res?.mp4 || res?.video;
          if (!mediaUrl) throw new Error('Gagal mengambil tautan unduhan');

          if (wantAudio) {
            await conn.sendMessage(
              from,
              { audio: { url: mediaUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` },
              { quoted: msg }
            );
          } else {
            await conn.sendMessage(
              from,
              { video: { url: mediaUrl }, caption: `🎬 *${title}*` },
              { quoted: msg }
            );
          }
          chargeLimit();
          break;
        }

        // ==================== SPOTIFY ====================
        case 'spotify':
        case 'spotydl': {
          if (!isUrl(text) || !/spotify\.com/i.test(text)) {
            return reply(`Kirim link lagu Spotify.\nContoh: *${ctx.usedPrefix}spotify <url track>*`);
          }
          await reply(config.messages.wait);

          // Sumber: fabdl (2 langkah). Endpoint publik, bisa berubah.
          const info = await axios.get(
            `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(text)}`,
            { headers: { 'User-Agent': UA }, timeout: 30000 }
          );
          const r = info.data?.result;
          if (!r?.gid || !r?.id) throw new Error('Gagal membaca info lagu Spotify');

          let task = await axios.get(
            `https://api.fabdl.com/spotify/mp3-convert-task/${r.gid}/${r.id}`,
            { headers: { 'User-Agent': UA }, timeout: 60000 }
          );
          let dl = task.data?.result;

          // Polling singkat bila proses konversi belum selesai
          let tries = 0;
          while (dl && !dl.download_url && tries < 6) {
            await new Promise((res) => setTimeout(res, 3000));
            task = await axios.get(
              `https://api.fabdl.com/spotify/mp3-convert-task/${r.gid}/${r.id}`,
              { headers: { 'User-Agent': UA }, timeout: 60000 }
            );
            dl = task.data?.result;
            tries += 1;
          }
          if (!dl?.download_url) throw new Error('Konversi Spotify gagal/timeout');

          const audioUrl = dl.download_url.startsWith('http')
            ? dl.download_url
            : `https://api.fabdl.com${dl.download_url}`;

          await conn.sendMessage(
            from,
            {
              audio: { url: audioUrl },
              mimetype: 'audio/mpeg',
              fileName: `${r.name || 'spotify'}.mp3`,
            },
            { quoted: msg }
          );
          chargeLimit();
          break;
        }

        default:
          return reply('Perintah downloader tidak dikenal.');
      }
    } catch (e) {
      console.error(`[DL] .${command} gagal:`, e.message);
      // Limit TIDAK dipotong karena gagal
      await reply(
        `⚠️ Maaf, gagal memproses *${command}*.\n_Alasan: ${e.message}_\n\nCoba lagi nanti atau pastikan link valid. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
