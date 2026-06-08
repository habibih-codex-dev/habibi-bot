/**
 * plugins/menu.js
 * Menu utama bot — dikirim sebagai GAMBAR/VIDEO dengan sistem CACHING.
 *
 * Anti-download berulang: media (config.thumbMenu) hanya diunduh SEKALI
 * pada pemakaian pertama, lalu disimpan di memori (Buffer). Request
 * berikutnya langsung dikirim dari cache (instan, hemat kuota & CPU VPS).
 */

const axios = require('axios');
const config = require('../config');
const { formatNumber } = require('../lib/functions');

// ===================== CACHE MEDIA (module-level) =====================
// Bertahan selama proses hidup; ikut tereset saat hot-reload plugin.
let mediaCache = null; // Buffer media yang sudah diunduh
let cachedUrl = null; // URL sumber cache saat ini (deteksi perubahan config)
let cachedType = null; // 'video' | 'image'

/** Tentukan tipe media dari URL (abaikan query string). */
function detectType(url) {
  const clean = String(url).split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') ? 'video' : 'image';
}

/**
 * Ambil media dari cache; jika belum ada (atau URL berubah), unduh sekali.
 * @returns {Promise<{buffer: Buffer, type: string}|null>}
 */
async function getMenuMedia(url) {
  if (!url) return null;
  // Sudah ada di cache & URL sama -> pakai cache (instan)
  if (mediaCache && cachedUrl === url) {
    return { buffer: mediaCache, type: cachedType };
  }
  // Unduh sekali, lalu simpan ke memori
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  mediaCache = Buffer.from(res.data);
  cachedUrl = url;
  cachedType = detectType(url);
  console.log('[MENU] Media menu diunduh & disimpan ke cache.');
  return { buffer: mediaCache, type: cachedType };
}

module.exports = {
  command: ['menu', 'help', 'start'],
  desc: 'Menampilkan menu utama',
  run: async (ctx) => {
    const { conn, from, msg, reply, sender, db, isOwner, usedPrefix } = ctx;
    // Pakai user dari ctx (sudah dijamin valid oleh handler).
    // Fallback berlapis agar TIDAK PERNAH null -> tidak ada lagi error "reading 'premium'".
    const u = ctx.user || db.getUser(sender) || { premium: false, limit: 0, saldo: 0 };
    const status = u.premium ? '👑 Premium (Unlimited)' : '🆓 Free';
    const limitText = u.premium ? '∞ Unlimited' : formatNumber(u.limit);

    const p = usedPrefix;
    const teks = `
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
│ • ${p}antilink on/off
│ • ${p}tagall / ${p}hidetag
│ • ${p}del (reply)
│ • ${p}open / ${p}close
│ • ${p}upswgc <teks>/reply
╰───────────────
${
  isOwner
    ? `
╭───「 *OWNER* 」
│ • ${p}addprem <nomor> <hari>
│ • ${p}delprem <nomor>
│ • ${p}addlimit <nomor> <jumlah>
│ • ${p}addsaldo @user <jumlah>
│ • ${p}minussaldo @user <jumlah>
│ • ${p}add <nomor>
│ • ${p}tambahsewa <hari>
│ • ${p}listsewa / ${p}delsewa
│ • ${p}bc <teks promosi>
╰───────────────`
    : ''
}

_Mode bot: *${config.mode}* • Prefix:_ ${config.prefix.join(' ')}
`.trim();

    // ---- Kirim menu sebagai media (image/video) dengan caption ----
    try {
      const url = config.thumbMenu;
      const media = await getMenuMedia(url);

      if (!media) {
        // Tidak ada URL media -> fallback teks biasa
        return reply(teks);
      }

      const content =
        media.type === 'video'
          ? { video: media.buffer, caption: teks, gifPlayback: false }
          : { image: media.buffer, caption: teks };

      await conn.sendMessage(from, content, { quoted: msg });
    } catch (e) {
      console.error('[MENU] gagal kirim media, fallback teks:', e.message);
      // Jika media gagal diunduh/dikirim, menu tetap tampil sebagai teks
      await reply(teks);
    }
  },
};
