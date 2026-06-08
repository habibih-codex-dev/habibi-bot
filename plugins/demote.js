/**
 * plugins/demote.js
 * Grup: turunkan admin menjadi member biasa.
 */

const { getNumber } = require('../lib/jid');

module.exports = {
  command: ['demote'],
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Turunkan admin menjadi member',
  run: async (ctx) => {
    const { conn, from, msg, reply } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned || quoted;

    if (!target) return reply('Tag/mention atau reply admin yang ingin diturunkan.\nContoh: *.demote @user*');

    await conn.groupParticipantsUpdate(from, [target], 'demote');
    await conn.sendMessage(from, {
      text: `⬇️ @${getNumber(target)} sekarang menjadi *Member* biasa.`,
      mentions: [target],
    });
  },
};
