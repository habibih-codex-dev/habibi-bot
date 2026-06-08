/**
 * plugins/add_member.js
 * Tambah anggota ke grup berdasarkan nomor HP.
 *
 * Perintah: .add <nomor_hp>   (contoh: .add 628xxxxxxxxx)
 * Akses: KHUSUS OWNER (owner:true). Admin grup biasa tidak boleh.
 * Bot WAJIB jadi admin grup (botAdmin:true).
 *
 * Catatan: jika nomor mengunci privasi "siapa yang bisa menambahkan
 * ke grup", WhatsApp menolak penambahan langsung. Ditangani via
 * try/catch + pembacaan status hasil agar bot tidak crash.
 */

const config = require('../config');
const { toJid, getNumber } = require('../lib/jid');

module.exports = {
  command: ['add', 'adduser', 'tambah'],
  group: true,
  owner: true,
  botAdmin: true,
  desc: 'Tambah anggota ke grup via nomor (khusus owner)',
  run: async (ctx) => {
    const { conn, from, text, args, reply } = ctx;

    // Bersihkan input nomor dari spasi, strip, +, dll -> sisa digit saja
    const raw = (text || args.join(' ') || '').replace(/[^0-9]/g, '');
    if (!raw || raw.length < 8) {
      return reply(`Format: *${ctx.usedPrefix}add <nomor>*\nContoh: *${ctx.usedPrefix}add 628123456789*`);
    }

    const jid = toJid(raw);

    try {
      const res = await conn.groupParticipantsUpdate(from, [jid], 'add');
      const status = String(res?.[0]?.status || '');

      if (status === '200') {
        await reply(`✅ Berhasil menambahkan @${getNumber(jid)} ke grup.`);
        await conn.sendMessage(from, {
          text: `👋 Selamat datang @${getNumber(jid)}!`,
          mentions: [jid],
        });
        return;
      }

      // Status non-200: jelaskan kemungkinan penyebabnya
      let alasan = `Gagal menambahkan (kode: ${status || 'tidak diketahui'}).`;
      if (status === '403') {
        alasan =
          'Nomor tersebut mengunci privasi grup, jadi tidak bisa ditambahkan langsung. ' +
          'Bot akan mengirim undangan jika didukung, atau minta nomor itu bergabung via link.';
      } else if (status === '408') {
        alasan = 'Nomor baru-baru ini keluar dari grup, coba lagi nanti.';
      } else if (status === '409') {
        alasan = 'Nomor tersebut sudah berada di dalam grup.';
      } else if (status === '401') {
        alasan = 'Nomor tersebut memblokir bot.';
      }

      await reply(`⚠️ ${alasan}`);
    } catch (e) {
      console.error('[ADD_MEMBER] gagal:', e.message);
      await reply(
        `⚠️ Gagal menambahkan nomor ke grup.\n_Alasan: ${e.message}_\n\nPastikan bot adalah *Admin* grup & nomor valid.`
      );
    }
  },
};
