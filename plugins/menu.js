/**
 * plugins/menu.js
 * Menu utama bot.
 */

const config = require('../config');
const { formatRuntime, formatNumber } = require('../lib/functions');

module.exports = {
  command: ['menu', 'help', 'start'],
  desc: 'Menampilkan menu utama',
  run: async (ctx) => {
    const { reply, sender, db, isOwner, usedPrefix } = ctx;
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

    await reply(teks);
  },
};
