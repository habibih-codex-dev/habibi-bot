/**
 * plugins/storeadmin.js
 * ADMIN GRUP / OWNER: kelola katalog store (list.json).
 * Perintah:
 *   .addlist <keyword> | <isi balasan>
 *   .updatelist <keyword> | <isi balasan>
 *   .dellist <keyword>
 *
 * Catatan permission: admin:true -> di grup wajib admin; di chat
 * pribadi hanya owner (handler mengizinkan owner melewati cek admin).
 */

const listdb = require('../lib/listdb');

module.exports = {
  command: ['addlist', 'updatelist', 'dellist'],
  admin: true, // admin grup ATAU owner (lihat handler.js)
  desc: 'Kelola katalog store (tambah/ubah/hapus keyword)',
  run: async (ctx) => {
    const { command, text, reply, senderNumber, usedPrefix } = ctx;

    // ---------- HAPUS ----------
    if (command === 'dellist') {
      const keyword = text.trim();
      if (!keyword) {
        return reply(`Format: *${usedPrefix}dellist <keyword>*`);
      }
      if (!listdb.has(keyword)) {
        return reply(`❌ Keyword *${keyword}* tidak ditemukan di katalog.`);
      }
      listdb.del(keyword);
      return reply(`🗑️ Keyword *${keyword}* berhasil dihapus dari katalog.`);
    }

    // ---------- TAMBAH / UPDATE (butuh format: keyword | isi) ----------
    if (!text.includes('|')) {
      return reply(
        `Format salah. Pisahkan keyword & isi dengan tanda *|*\n\nContoh:\n*${usedPrefix}${command} netflix | Harga Netflix 1 bulan: Rp25.000*`
      );
    }

    const idx = text.indexOf('|');
    const keyword = text.slice(0, idx).trim();
    const response = text.slice(idx + 1).trim();

    if (!keyword || !response) {
      return reply('⚠️ Keyword dan isi balasan tidak boleh kosong.');
    }

    if (command === 'addlist') {
      if (listdb.has(keyword)) {
        return reply(
          `⚠️ Keyword *${keyword}* sudah ada. Gunakan *${usedPrefix}updatelist* untuk mengubahnya.`
        );
      }
      listdb.add(keyword, response, senderNumber);
      return reply(`✅ Keyword *${keyword}* berhasil ditambahkan ke katalog.`);
    }

    if (command === 'updatelist') {
      if (!listdb.has(keyword)) {
        return reply(
          `❌ Keyword *${keyword}* belum ada. Gunakan *${usedPrefix}addlist* untuk menambahkannya.`
        );
      }
      listdb.update(keyword, response);
      return reply(`✏️ Keyword *${keyword}* berhasil diperbarui.`);
    }
  },
};
