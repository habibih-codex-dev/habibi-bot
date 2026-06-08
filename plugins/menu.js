/**
 * plugins/menu.js
 * Menu utama bot — versi STANDAR (gambar/video + caption teks).
 *
 * CATATAN: Versi Native Flow (button interaktif) DIHAPUS karena pada
 * sebagian klien WhatsApp pesannya dibuang server (menu tidak muncul).
 * Sekarang memakai conn.sendMessage biasa: yang penting list menu TAMPIL
 * dan bisa dibaca. Tetap ada caching media (anti-download berulang) dan
 * fallback ke teks murni bila media gagal/404.
 */

const axios = require('axios');
const config = require('../config');
const { formatNumber } = require('../lib/functions');

// ===================== CACHE MEDIA (module-level) =====================
let mediaCache = null; // Buffer media yang sudah diunduh
let cachedUrl = null; // URL sumber cache saat ini
let cachedType = null; // 'video' | 'image'

function detectType(url) {
  const clean = String(url).split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') ? 'video' : 'image';
}

async function getMenuMedia(url) {
  if (!url) return null;
  if (mediaCache && cachedUrl === url) {
    return { buffer: mediaCache, type: cachedType };
  }
  // Unduh sekali; jika GAGAL (mis. 404/link mati), JANGAN lempar error —
  // kembalikan null agar menu tetap tampil sebagai teks.
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    mediaCache = Buffer.from(res.data);
    cachedUrl = url;
    cachedType = detectType(url);
    console.log('[MENU] Media menu diunduh & disimpan ke cache.');
    return { buffer: mediaCache, type: cachedType };
  } catch (e) {
    const code = e.response?.status ? ` (HTTP ${e.response.status})` : '';
    console.error(`[MENU] Gagal unduh media${code}: ${e.message} — menu tampil tanpa media.`);
    return null;
  }
}

/** Susun teks lengkap daftar fitur (caption menu). */
function buildMenuText(ctx, u) {
  const { usedPrefix } = ctx;
  const p = usedPrefix;
  const status = u.premium ? '👑 Premium (Unlimited)' : '🆓 Free';
  const limitText = u.premium ? '∞ Unlimited' : formatNumber(u.limit);

  return `
╭───「 *${config.botName}* 」
│ 👤 Owner : ${config.ownerName}
│ 🛒 Layanan : ${config.storeName} & ${config.cloudName}
│ 🎫 Status : ${status}
│ 🔋 Limit : ${limitText}
│ 💰 Saldo : Rp${formatNumber(u.saldo || 0)}
╰───────────────

╭───「 *GENERAL* 」
│ • ${p}menu
│ • ${p}ping
│ • ${p}runtime
│ • ${p}owner
│ • ${p}saldo / ${p}me
│ • ${p}deposit
│ • ${p}sewabot
╰───────────────

╭───「 *FITUR (BERLIMIT)* 」
│ • ${p}ai <pertanyaan>
│ • ${p}play <judul lagu>
│ • ${p}iqc <teks> / reply
╰───────────────

╭───「 *DOWNLOADER (BERLIMIT)* 」
│ • ${p}tiktok <url>
│ • ${p}ig <url>
│ • ${p}facebook <url>
│ • ${p}ytmp3 <url/judul>
│ • ${p}ytmp4 <url/judul>
│ • ${p}yts <kata kunci>
│ • ${p}spotify <url>
╰───────────────

╭───「 *ISLAMI* 」
│ • ${p}jadwalsholat <kota>
│ • ${p}alquran <surah>:<ayat>
│ • ${p}autosholat on/off (admin)
╰───────────────

╭───「 *UTILITAS* 」
│ • ${p}sticker / ${p}s
│ • ${p}toimg (reply stiker)
╰───────────────

╭───「 *STORE / KATALOG* 」
│ • ${p}list / ${p}katalog
│ • ${p}addlist <kw> | <isi>
│ • ${p}updatelist <kw> | <isi>
│ • ${p}dellist <kw>
╰───────────────

╭───「 *GRUP (ADMIN)* 」
│ • ${p}kick @user
│ • ${p}promote @user
│ • ${p}demote @user
│ • ${p}tagall / ${p}hidetag
│ • ${p}del (reply)
│ • ${p}open / ${p}close
╰───────────────

╭───「 *PROTEKSI GRUP (ADMIN)* 」
│ • ${p}antilink on/off (hapus)
│ • ${p}antilinkv2 on/off (hapus+kick)
│ • ${p}antilinkwa on/off (hapus)
│ • ${p}antilinkwav2 on/off (warning)
│ • ${p}antilinkch on/off
│ • ${p}antibot on/off
│ • ${p}antitoxic on/off
│ • ${p}antijudol on/off
│ • ${p}antilinkpising on/off
│ • ${p}antibug on/off
│ • ${p}antitagall on/off
│ • ${p}antihidetag on/off
│ • ${p}antiforeign on/off
╰───────────────

╭───「 *OWNER MENU* 」
│ • ${p}addprem <nomor> <hari>
│ • ${p}delprem <nomor>
│ • ${p}addlimit <nomor> <jumlah>
│ • ${p}addsaldo @user <jumlah>
│ • ${p}minussaldo @user <jumlah>
│ • ${p}add <nomor>
│ • ${p}sewabot <link_grup> <hari>
│ • ${p}tambahsewa <hari>
│ • ${p}listsewa
│ • ${p}delsewa
│ • ${p}upswgc <teks>/reply
│ • ${p}bc <teks promosi>
╰───────────────

_Mode bot: *${config.mode}* • Prefix:_ ${config.prefix.join(' ')}
`.trim();
}

module.exports = {
  command: ['menu', 'help', 'start', 'allmenu'],
  desc: 'Menampilkan menu utama',
  run: async (ctx) => {
    const { conn, from, msg, reply, sender, db } = ctx;
    const u = ctx.user || db.getUser(sender) || { premium: false, limit: 0, saldo: 0 };
    const teks = buildMenuText(ctx, u);

    // Kirim sebagai media (image/video) + caption. Jika media gagal -> teks murni.
    try {
      const media = await getMenuMedia(config.thumbMenu);
      if (media) {
        const content =
          media.type === 'video'
            ? { video: media.buffer, caption: teks, gifPlayback: false }
            : { image: media.buffer, caption: teks };
        await conn.sendMessage(from, content, { quoted: msg });
      } else {
        // Tidak ada media / link mati -> tetap tampilkan list menu sebagai teks
        await reply(teks);
      }
    } catch (e) {
      console.error('[MENU] gagal kirim, fallback teks:', e.message);
      await reply(teks);
    }
  },
};
