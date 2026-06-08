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
      // ==================== .sewabot / .sewa ====================
      if (command === 'sewabot' || command === 'sewa') {
        const params = (text || '').trim();

        // ---- TANPA parameter -> KATALOG HARGA (semua user) ----
        if (!params) {
          const adminNomor = (config.owner && config.owner[0]) || 'owner';
          const katalog =
            `👋 *HALO! MAU SEWA BOT UNTUK GRUP KAMU?*\n\n` +
            `Berikut Paket Sewa Bot Resmi ${config.storeName} & ${config.cloudName}:\n` +
            `• 1 Hari  : Rp 3.000\n` +
            `• 3 Hari  : Rp 5.000\n` +
            `• 7 Hari  : Rp 10.000\n` +
            `• 30 Hari : Rp 25.000\n` +
            `• Permanen: Rp 50.000\n\n` +
            `⚡ *Keuntungan Sewa Bot:*\n` +
            `- Fitur AI Assistant (.ai) 24 Jam\n` +
            `- Downloader lengkap (TikTok, IG, FB, Spotify)\n` +
            `- Fitur Group Management (Open/Close, Kick, Add)\n` +
            `- Fitur Islami (Auto Jadwal Sholat)\n\n` +
            `Jika berminat, silakan hubungi Owner untuk proses aktivasi!\n` +
            `📲 wa.me/${adminNomor} (${config.ownerName})`;
          return reply(katalog);
        }

        // ---- DENGAN parameter -> KHUSUS OWNER: join via link + daftarkan sewa ----
        if (!isOwner) return reply(config.messages.owner);

        const parts = params.split(/\s+/);
        const link = parts[0];
        const days = parseInt(parts[1], 10);
        const m = link.match(/chat\.whatsapp\.com\/([0-9A-Za-z-_]+)/i);

        if (!m || !days || days <= 0) {
          return reply(
            `Format: *${usedPrefix}sewabot <link_grup> <jumlah_hari>*\n` +
              `Contoh: *${usedPrefix}sewabot https://chat.whatsapp.com/XXXXXXXX 30*`
          );
        }

        try {
          // Eksekusi link invitation -> bot join grup target
          const groupJid = await conn.groupAcceptInvite(m[1]);
          if (!groupJid) throw new Error('Link tidak valid / sudah kedaluwarsa');

          // Daftarkan masa expired ke sewa.json
          const data = sewadb.add(groupJid, days);

          // Notifikasi ke grup target (boleh gagal)
          await conn
            .sendMessage(groupJid, {
              text:
                `✅ *${config.botName} telah bergabung!*\n` +
                `Masa sewa aktif: *${days} hari*\n` +
                `⏳ Expired: ${fmtDate(data.expiredAt)}\n\n` +
                `Terima kasih telah menyewa layanan ${config.storeName}!`,
            })
            .catch(() => {});

          return reply(
            `✅ *Berhasil join & mendaftarkan sewa!*\n` +
              `🆔 Grup: ${groupJid}\n` +
              `📅 Mulai   : ${fmtDate(data.joinedAt)}\n` +
              `⏳ Expired : ${fmtDate(data.expiredAt)}\n` +
              `📊 Total durasi: ${data.days} hari`
          );
        } catch (e) {
          console.error('[SEWABOT join] gagal:', e.message);
          return reply(
            `⚠️ Gagal join grup via link.\n_Alasan: ${e.message}_\n\n` +
              `Pastikan link undangan valid & bot belum berada di grup tersebut.`
          );
        }
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
