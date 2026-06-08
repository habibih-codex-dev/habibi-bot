/**
 * plugins/antilink.js
 * Grup: aktif/nonaktif fitur antilink.
 * Penggunaan: .antilink on | .antilink off
 *
 * Deteksi & tindakan link berjalan di handler.js (berlaku ke
 * SETIAP pesan grup). Plugin ini hanya untuk toggle setting.
 */

const groupdb = require('../lib/groupdb');

module.exports = {
  command: ['antilink'],
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Aktif/nonaktif antilink grup',
  run: async (ctx) => {
    const { from, args, reply } = ctx;
    const opt = (args[0] || '').toLowerCase();

    if (opt !== 'on' && opt !== 'off') {
      const cur = groupdb.getGroup(from).antilink ? 'ON ✅' : 'OFF ❌';
      return reply(`Status antilink saat ini: *${cur}*\n\nGunakan:\n• *.antilink on*\n• *.antilink off*`);
    }

    const value = opt === 'on';
    groupdb.setAntilink(from, value);
    await reply(
      value
        ? '✅ *Antilink AKTIF*. Member non-admin yang mengirim link grup WhatsApp akan dihapus & dikeluarkan.'
        : '❌ *Antilink NONAKTIF*.'
    );
  },
};
