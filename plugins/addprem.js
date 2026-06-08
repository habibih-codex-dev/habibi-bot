/**
 * plugins/addprem.js
 * Owner: tambah user premium.
 * Penggunaan: .addprem <nomor> [hari]
 *   - nomor : 6281234... ATAU reply/mention target
 *   - hari  : durasi premium (0 = permanen). Default 30.
 */

const { toJid, getNumber } = require('../lib/jid');

module.exports = {
  command: ['addprem', 'addpremium'],
  owner: true,
  desc: 'Tambah user premium',
  run: async (ctx) => {
    const { args, reply, db, msg } = ctx;

    // Target: mention > reply > argumen nomor
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    let targetNumber = mentioned ? getNumber(mentioned) : quoted ? getNumber(quoted) : (args[0] || '').replace(/[^0-9]/g, '');

    if (!targetNumber) {
      return reply('Format salah.\nContoh: *.addprem 6281234567890 30*\n_(30 = jumlah hari, 0 = permanen)_');
    }

    const days = Number(args[1]) || 30;
    const jid = toJid(targetNumber);
    db.setPremium(jid, days);

    await reply(
      `✅ Berhasil menambahkan premium.\n👤 Nomor: ${targetNumber}\n⏳ Durasi: ${days === 0 ? 'Permanen' : days + ' hari'}`
    );
  },
};
