/**
 * plugins/sewabot.js
 * Manajemen SEWA BOT untuk grup.
 *
 * Perintah:
 *   .sewabot                 (semua user)  -> katalog & harga sewa
 *   .tambahsewa <hari>       (OWNER)       -> aktifkan/perpanjang sewa grup ini
 *   .listsewa                (OWNER)       -> daftar grup penyewa + sisa hari
 *   .delsewa                 (OWNER)       -> hapus data sewa grup ini
 *
 * Data tersimpan di database/sewa.json (lib/sewadb.js).
 */

const config = require('../config');
const sewadb = require('../lib/sewadb');
const { formatRuntime } = require('../lib/functions');

/** Format tanggal ke string lokal WIB. */
function fmtDate(ts) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString();
  }
}

module.exports = {
  command: ['sewabot', 'sewa', 'tambahsewa', 'listsewa', 'delsewa'],
  desc: 'Katalog & manajemen sewa bot grup',
  run: async (ctx) => {
    const { conn, from, command, text, reply, isGroup, isOwner, usedPrefix } = ctx;

    try {
      // ==================== KATALOG (semua user) ====================
      if (command === 'sewabot' || command === 'sewa') {
        const adminNomor = (config.owner && config.owner[0]) || 'owner';
        const teks =
          `╭━━━〔 *SEWA BOT ${config.storeName.toUpperCase()}* 〕━━━⊷\n` +
          `┃ Jadikan grupmu lebih hidup dengan ${config.botName}!\n` +
          `┃\n` +
          `┃ 💰 *DAFTAR HARGA*\n` +
          `┃ • 7 Hari   : Rp5.000\n` +
          `┃ • 30 Hari  : Rp15.000\n` +
          `┃ • 90 Hari  : Rp35.000\n` +
          `┃ • Permanen : Rp100.000\n` +
          `┃\n` +
          `┃ ✨ Fitur: downloader, sticker, islami,\n` +
          `┃    antilink, auto-adzan, dll.\n` +
          `┃\n` +
          `┃ 📲 *Order:* wa.me/${adminNomor}\n` +
          `┃ 👤 Admin: ${config.ownerName}\n` +
          `╰━━━━━━━━━━━━━━━⊷`;
        return reply(teks);
      }

      // Perintah di bawah ini KHUSUS OWNER
      if (!isOwner) return reply(config.messages.owner);

      // ==================== TAMBAH / PERPANJANG SEWA ====================
      if (command === 'tambahsewa') {
        if (!isGroup) return reply(config.messages.group);

        const days = parseInt(text, 10);
        if (!days || days <= 0) {
          return reply(`Format: *${usedPrefix}tambahsewa <jumlah_hari>*\nContoh: *${usedPrefix}tambahsewa 30*`);
        }

        const data = sewadb.add(from, days);
        return reply(
          `✅ *Sewa bot diaktifkan!*\n` +
            `🏷️ Durasi ditambah : ${days} hari\n` +
            `📅 Mulai   : ${fmtDate(data.joinedAt)}\n` +
            `⏳ Expired : ${fmtDate(data.expiredAt)}\n` +
            `📊 Total durasi: ${data.days} hari\n\n` +
            `_Terima kasih telah menyewa ${config.botName}!_`
        );
      }

      // ==================== LIST SEWA ====================
      if (command === 'listsewa') {
        const all = sewadb.getAll();
        const jids = Object.keys(all);
        if (jids.length === 0) return reply('📭 Belum ada grup yang menyewa bot.');

        let teks = `╭━━━〔 *DAFTAR SEWA BOT* 〕━━━⊷\n┃ Total: ${jids.length} grup\n┃\n`;
        let i = 1;
        for (const jid of jids) {
          const remMs = sewadb.remainingMs(jid);
          const sisa = remMs > 0 ? formatRuntime(remMs) : '❌ EXPIRED';
          // Coba ambil nama grup (boleh gagal)
          let nama = jid;
          try {
            const meta = await conn.groupMetadata(jid);
            nama = meta?.subject || jid;
          } catch {
            /* abaikan */
          }
          teks += `┃ ${i}. *${nama}*\n┃    ⏳ Sisa: ${sisa}\n┃    📅 Exp: ${fmtDate(all[jid].expiredAt)}\n┃\n`;
          i += 1;
        }
        teks += `╰━━━━━━━━━━━━━━━⊷`;
        return reply(teks);
      }

      // ==================== HAPUS SEWA ====================
      if (command === 'delsewa') {
        if (!isGroup) return reply(config.messages.group);
        const ok = sewadb.del(from);
        return reply(
          ok
            ? '🗑️ Data sewa grup ini berhasil dihapus dari database.'
            : '⚠️ Grup ini tidak memiliki data sewa.'
        );
      }
    } catch (e) {
      console.error('[SEWABOT] gagal:', e.message);
      await reply(`${config.messages.error}\n\n_Detail: ${e.message}_`);
    }
  },
};
