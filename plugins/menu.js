/**
 * plugins/menu.js
 * Menu utama bot — INTERACTIVE MESSAGE (Native Flow / Button) ala bot premium.
 *
 * Dibuat dengan merakit RAW proto langsung (tanpa fork Baileys):
 *   generateWAMessageFromContent + proto.Message.InteractiveMessage
 *   -> NativeFlowMessage dengan tombol:
 *      - quick_reply : All Menu, Sewa Bot, Owner
 *      - cta_url     : Website Store (Habibi Cloud)
 *   lalu di-relay via conn.relayMessage().
 *
 * Tetap ada sistem CACHING media (anti-download berulang) untuk header
 * gambar/video, dan FALLBACK ke kirim media+caption biasa bila perangkat
 * tidak mendukung interactive message.
 */

const axios = require('axios');
const baileys = require('@whiskeysockets/baileys');
const config = require('../config');
const { formatNumber } = require('../lib/functions');

const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = baileys;

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
  // kembalikan null agar menu tetap tampil sebagai teks/tanpa media.
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

/** Susun teks lengkap daftar fitur (dipakai sebagai body interactive & fallback caption). */
function buildMenuText(ctx, u) {
  const { isOwner, usedPrefix } = ctx;
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

/** Bangun array tombol Native Flow (quick_reply + cta_url). */
function buildNativeButtons(p) {
  return [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '📋 All Menu',
        id: `${p}allmenu`,
      }),
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🛒 Sewa Bot',
        id: `${p}sewabot`,
      }),
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '👤 Owner',
        id: `${p}owner`,
      }),
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '🌐 Website Store',
        url: 'https://wa.me/' + ((config.owner && config.owner[0]) || ''),
        merchant_url: 'https://wa.me/' + ((config.owner && config.owner[0]) || ''),
      }),
    },
  ];
}

module.exports = {
  command: ['menu', 'help', 'start', 'allmenu'],
  desc: 'Menampilkan menu utama (interactive)',
  run: async (ctx) => {
    const { conn, from, msg, reply, sender, db, usedPrefix } = ctx;
    const u = ctx.user || db.getUser(sender) || { premium: false, limit: 0, saldo: 0 };
    const teks = buildMenuText(ctx, u);

    // ---- Coba kirim sebagai INTERACTIVE MESSAGE (Native Flow) ----
    try {
      // Siapkan header media (pakai cache) bila ada URL
      let header = { title: '', subtitle: '', hasMediaAttachment: false };
      const url = config.thumbMenu;
      if (url) {
        try {
          const media = await getMenuMedia(url);
          if (media) {
            const prepared =
              media.type === 'video'
                ? await prepareWAMessageMedia({ video: media.buffer }, { upload: conn.waUploadToServer })
                : await prepareWAMessageMedia({ image: media.buffer }, { upload: conn.waUploadToServer });
            header = {
              ...prepared,
              title: `${config.botName}`,
              subtitle: config.storeName,
              hasMediaAttachment: true,
            };
          }
        } catch (e) {
          console.error('[MENU] header media gagal, lanjut tanpa media:', e.message);
        }
      }

      const interactiveMsg = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: teks }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: `${config.botName} • ${config.cloudName}`,
        }),
        header: proto.Message.InteractiveMessage.Header.create(header),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: buildNativeButtons(usedPrefix),
        }),
      });

      const content = generateWAMessageFromContent(
        from,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: interactiveMsg,
            },
          },
        },
        { quoted: msg }
      );

      await conn.relayMessage(from, content.message, { messageId: content.key.id });
    } catch (e) {
      console.error('[MENU] interactive gagal, fallback media/teks:', e.message);
      // ---- FALLBACK: media + caption, atau teks biasa ----
      try {
        const media = mediaCache ? { buffer: mediaCache, type: cachedType } : await getMenuMedia(config.thumbMenu);
        if (media) {
          const fb =
            media.type === 'video'
              ? { video: media.buffer, caption: teks, gifPlayback: false }
              : { image: media.buffer, caption: teks };
          await conn.sendMessage(from, fb, { quoted: msg });
        } else {
          await reply(teks);
        }
      } catch (e2) {
        console.error('[MENU] fallback gagal:', e2.message);
        await reply(teks);
      }
    }
  },
};
