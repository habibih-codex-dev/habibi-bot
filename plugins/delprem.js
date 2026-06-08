/**
 * plugins/delprem.js
 * Owner: hapus status premium user.
 * Penggunaan: .delprem <nomor> | reply | mention
 */

const { toJid, getNumber } = require('../lib/jid');

module.exports = {
  command: ['delprem', 'delpremium'],
  owner: true,
  desc: 'Hapus status premium user',
  run: async (ctx) => {
    const { args, reply, db, msg } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    let targetNumber = mentioned ? getNumber(mentioned) : quoted ? getNumber(quoted) : (args[0] || '').replace(/[^0-9]/g, '');

    if (!targetNumber) {
      return reply('Format salah.\nContoh: *.delprem 6281234567890*');
    }

    const jid = toJid(targetNumber);
    db.removePremium(jid);

    await reply(`✅ Status premium nomor ${targetNumber} telah *dihapus*.`);
  },
};
