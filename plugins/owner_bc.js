/**
 * plugins/owner_bc.js
 * OWNER: broadcast pesan promosi ke semua user terdaftar (users.json).
 * Perintah: .bc <teks promosi>  (alias: .broadcast)
 *
 * KEAMANAN ANTI-BLOKIR:
 *   - Jeda acak 3-5 detik antar pengiriman.
 *   - Setiap pengiriman dibungkus try/catch (1 nomor gagal tidak
 *     menghentikan broadcast).
 */

const config = require('../config');
const { sleep } = require('../lib/functions');
const { toJid } = require('../lib/jid');

module.exports = {
  command: ['bc', 'broadcast'],
  owner: true,
  desc: 'Broadcast pesan ke semua user terdaftar',
  run: async (ctx) => {
    const { conn, text, reply, db } = ctx;

    if (!text) {
      return reply(`Format: *${ctx.usedPrefix}bc <teks promosi>*`);
    }

    const numbers = Object.keys(db.users || {});
    if (numbers.length === 0) {
      return reply('📭 Belum ada user terdaftar untuk dikirimi broadcast.');
    }

    const header = `📢 *BROADCAST ${config.botName}*\n\n`;
    const footer = `\n\n— _${config.ownerName} / ${config.storeName}_`;
    const content = header + text + footer;

    await reply(
      `🚀 Memulai broadcast ke *${numbers.length}* nomor...\n_Jeda 3-5 detik antar pesan agar aman dari blokir. Mohon tunggu._`
    );

    let success = 0;
    let failed = 0;

    for (const number of numbers) {
      try {
        const jid = toJid(number);
        await conn.sendMessage(jid, { text: content });
        success += 1;
      } catch (e) {
        failed += 1;
        console.error(`[BC] Gagal kirim ke ${number}:`, e.message);
      }
      // Jeda acak 3000-5000 ms (anti-spam)
      await sleep(3000 + Math.floor(Math.random() * 2000));
    }

    await reply(
      `✅ *Broadcast selesai.*\n• Berhasil: ${success}\n• Gagal: ${failed}\n• Total: ${numbers.length}`
    );
  },
};
