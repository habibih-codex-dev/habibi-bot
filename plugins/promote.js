/**
 * plugins/promote.js
 * Grup: jadikan member sebagai admin.
 */

const { getNumber } = require('../lib/jid');

module.exports = {
  command: ['promote'],
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Jadikan member sebagai admin',
  run: async (ctx) => {
    const { conn, from, msg, reply } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned || quoted;

    if (!target) return reply('Tag/mention atau reply member yang ingin dijadikan admin.\nContoh: *.promote @user*');

    await conn.groupParticipantsUpdate(from, [target], 'promote');
    await conn.sendMessage(from, {
      text: `⬆️ @${getNumber(target)} sekarang menjadi *Admin*.`,
      mentions: [target],
    });
  },
};
