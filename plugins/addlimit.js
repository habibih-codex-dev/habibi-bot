/**
 * plugins/addlimit.js
 * Owner: tambah limit ke user.
 * Penggunaan: .addlimit <nomor> <jumlah> | reply/mention <jumlah>
 */

const { toJid, getNumber } = require('../lib/jid');

module.exports = {
  command: ['addlimit'],
  owner: true,
  desc: 'Tambah limit harian user',
  run: async (ctx) => {
    const { args, reply, db, msg } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

    let targetNumber;
    let amount;

    if (mentioned || quoted) {
      targetNumber = getNumber(mentioned || quoted);
      amount = Number(args[0]);
    } else {
      targetNumber = (args[0] || '').replace(/[^0-9]/g, '');
      amount = Number(args[1]);
    }

    if (!targetNumber || !amount || amount <= 0) {
      return reply('Format salah.\nContoh: *.addlimit 6281234567890 50*');
    }

    const jid = toJid(targetNumber);
    db.addLimit(jid, amount);
    const u = db.getUser(jid);

    await reply(`✅ Berhasil menambah *${amount}* limit ke ${targetNumber}.\n🔋 Limit sekarang: *${u.limit}*`);
  },
};
