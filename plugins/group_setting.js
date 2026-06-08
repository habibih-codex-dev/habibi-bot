/**
 * plugins/group_setting.js
 * Buka / tutup grup (siapa yang boleh kirim pesan).
 *
 * Perintah:
 *   .close -> hanya admin yang bisa kirim pesan (announcement)
 *   .open  -> semua anggota bisa kirim pesan (not_announcement)
 *
 * Akses: Owner & Admin Grup. Bot WAJIB jadi admin (botAdmin:true).
 */

const config = require('../config');

module.exports = {
  command: ['open', 'close', 'bukagrup', 'tutupgrup'],
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Buka/tutup grup (announcement mode)',
  run: async (ctx) => {
    const { conn, from, command, reply } = ctx;

    const close = command === 'close' || command === 'tutupgrup';

    try {
      await conn.groupSettingUpdate(from, close ? 'announcement' : 'not_announcement');
      await reply(
        close
          ? `🔒 *Grup DITUTUP.*\nHanya admin yang bisa mengirim pesan.\n_— ${config.botName}_`
          : `🔓 *Grup DIBUKA.*\nSemua anggota bisa mengirim pesan kembali.\n_— ${config.botName}_`
      );
    } catch (e) {
      console.error('[GROUP_SETTING] gagal:', e.message);
      await reply(
        `⚠️ Gagal mengubah setelan grup.\n_Alasan: ${e.message}_\n\nPastikan bot adalah *Admin* grup.`
      );
    }
  },
};
