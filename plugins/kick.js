/**
 * plugins/kick.js
 * Grup: keluarkan member. Butuh admin (user) + bot admin.
 * Penggunaan: .kick @user | reply pesan target
 */

const { getNumber, isSameUser } = require('../lib/jid');

module.exports = {
  command: ['kick'],
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Keluarkan member dari grup',
  run: async (ctx) => {
    const { conn, from, msg, reply, participants } = ctx;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const target = mentioned || quoted;

    if (!target) return reply('Tag/mention atau reply member yang ingin dikeluarkan.\nContoh: *.kick @user*');

    // Jangan kick sesama admin / owner grup
    const targetIsAdmin = participants.some(
      (p) => isSameUser(p.id, target) && (p.admin === 'admin' || p.admin === 'superadmin')
    );
    if (targetIsAdmin) return reply('⛔ Tidak bisa mengeluarkan sesama admin.');

    await conn.groupParticipantsUpdate(from, [target], 'remove');
    await reply(`✅ Berhasil mengeluarkan @${getNumber(target)}`);
    await conn.sendMessage(from, { text: '👋', mentions: [target] }).catch(() => {});
  },
};
