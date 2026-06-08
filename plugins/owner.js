/**
 * plugins/owner.js
 * Kirim kontak Owner (vCard) agar user mudah menghubungi.
 *
 * Perintah: .owner / .creator / .pemilik
 */

const config = require('../config');

module.exports = {
  command: ['owner', 'creator', 'pemilik'],
  desc: 'Kirim kontak Owner bot',
  run: async (ctx) => {
    const { conn, from, msg, reply } = ctx;

    try {
      const nomor = (config.owner && config.owner[0]) || '';
      if (!nomor) return reply('⚠️ Nomor owner belum diatur di config.');

      const nama = config.ownerName || 'Owner';

      // vCard kontak owner
      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${nama}\n` +
        `ORG:${config.storeName || 'Habibi Store'};\n` +
        `TEL;type=CELL;type=VOICE;waid=${nomor}:+${nomor}\n` +
        'END:VCARD';

      await conn.sendMessage(
        from,
        {
          contacts: {
            displayName: nama,
            contacts: [{ vcard }],
          },
        },
        { quoted: msg }
      );

      // Pesan teks pelengkap
      await conn.sendMessage(
        from,
        {
          text:
            `👤 *Owner ${config.botName}*\n` +
            `Nama  : ${nama}\n` +
            `Nomor : wa.me/${nomor}\n\n` +
            `Silakan hubungi untuk order/sewa bot ${config.storeName}.`,
        },
        { quoted: msg }
      );
    } catch (e) {
      console.error('[OWNER] gagal:', e.message);
      const nomor = (config.owner && config.owner[0]) || '-';
      await reply(`👤 *Owner:* ${config.ownerName}\n📲 wa.me/${nomor}`);
    }
  },
};
