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
    const { conn, from, reply, usedPrefix } = ctx;

    const keys = listdb.keywords();
    if (keys.length === 0) {
      return reply(
        `📭 Katalog masih kosong.\n\nAdmin/Owner bisa menambah dengan:\n*${usedPrefix}addlist <keyword> | <isi balasan>*`
      );
    }

    // ---- Coba kirim sebagai LIST MESSAGE interaktif (habibi-cloud-baileys) ----
    if (typeof conn.sendList === 'function') {
      try {
        await conn.sendList(from, {
          text: `📦 *KATALOG ${config.storeName.toUpperCase()}*\nPilih item untuk melihat detailnya.`,
          buttonText: 'Lihat Katalog',
          sections: [
            {
              title: `${keys.length} Item Tersedia`,
              rows: keys.map((k) => ({
                title: k,
                id: k, // ketik keyword -> auto-response di handler menampilkan isinya
                description: 'Ketik untuk melihat detail',
              })),
            },
          ],
        });
        return;
      } catch (e) {
        console.error('[STORE] sendList gagal, fallback teks:', e.message);
        // lanjut ke fallback teks
      }
    }

    // ---- FALLBACK: teks biasa ----
    let teks = `╭───「 *KATALOG ${config.storeName.toUpperCase()}* 」\n`;
    teks += `│ Total: ${keys.length} item\n`;
    teks += `│ Ketik *keyword*-nya (tanpa titik) untuk melihat detail.\n`;
    teks += `╰───────────────\n\n`;
    teks += keys.map((k, i) => `${i + 1}. ${k}`).join('\n');
    teks += `\n\n_Contoh: ketik *${keys[0]}* untuk melihat isinya._`;

    await reply(teks);
  },
};
