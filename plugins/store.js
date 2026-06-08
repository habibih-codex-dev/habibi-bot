/**
 * plugins/store.js
 * PUBLIK: menampilkan katalog/daftar keyword yang tersedia.
 * Perintah: .list / .katalog / .liststore
 */

const config = require('../config');
const listdb = require('../lib/listdb');

module.exports = {
  command: ['list', 'katalog', 'liststore', 'menustore'],
  desc: 'Menampilkan daftar katalog/keyword store',
  run: async (ctx) => {
    const { reply, usedPrefix } = ctx;

    const keys = listdb.keywords();
    if (keys.length === 0) {
      return reply(
        `📭 Katalog masih kosong.\n\nAdmin/Owner bisa menambah dengan:\n*${usedPrefix}addlist <keyword> | <isi balasan>*`
      );
    }

    let teks = `╭───「 *KATALOG ${config.storeName.toUpperCase()}* 」\n`;
    teks += `│ Total: ${keys.length} item\n`;
    teks += `│ Ketik *keyword*-nya (tanpa titik) untuk melihat detail.\n`;
    teks += `╰───────────────\n\n`;
    teks += keys.map((k, i) => `${i + 1}. ${k}`).join('\n');
    teks += `\n\n_Contoh: ketik *${keys[0]}* untuk melihat isinya._`;

    await reply(teks);
  },
};
