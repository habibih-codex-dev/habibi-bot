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
    const u = ctx.user || db.getUser(sender) || { premium: false, limit: 0 };
    const status = u.premium ? '👑 Premium (Unlimited)' : '🆓 Free';
    const limitText = u.premium ? '∞ Unlimited' : formatNumber(u.limit);

    const p = usedPrefix;
    const teks = `
╭───「 *${config.botName}* 」
│ 👤 Owner : ${config.ownerName}
│ 🛒 Layanan : ${config.storeName} & ${config.cloudName}
│ 🎫 Status : ${status}
│ 🔋 Limit : ${limitText}
╰───────────────

╭───「 *GENERAL* 」
│ • ${p}menu
│ • ${p}ping
│ • ${p}runtime
╰───────────────

╭───「 *FITUR (BERLIMIT)* 」
│ • ${p}ai <pertanyaan>
╰───────────────

╭───「 *GRUP (ADMIN)* 」
│ • ${p}kick @user
│ • ${p}promote @user
│ • ${p}demote @user
│ • ${p}antilink on/off
╰───────────────
${
  isOwner
    ? `
╭───「 *OWNER* 」
│ • ${p}addprem <nomor> <hari>
│ • ${p}delprem <nomor>
│ • ${p}addlimit <nomor> <jumlah>
╰───────────────`
    : ''
}

_Ketik perintah dengan prefix:_ ${config.prefix.join(' ')}
`.trim();

    await reply(teks);
  },
};
