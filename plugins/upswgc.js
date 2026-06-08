/**
 * plugins/upswgc.js
 * Upload Status (Story) KHUSUS anggota grup tertentu.
 *
 * Perintah: .upswgc <teks>  ATAU reply foto/video + .upswgc <caption>
 * Akses: Owner & Admin Grup (group:true, admin:true).
 *
 * Cara kerja: status dikirim ke 'status@broadcast' TETAPI dengan
 * statusJidList = daftar anggota grup ini. Artinya status hanya
 * tampil untuk anggota grup tempat perintah diketik (tertarget),
 * bukan ke seluruh kontak.
 */

const config = require('../config');
const { getQuotedMessage, getMediaType, downloadFrom } = require('../lib/media');

const PETUNJUK =
  '📢 *Upload Status Grup*\n' +
  'Cara pakai:\n' +
  '• `.upswgc Halo grup!` (text-only)\n' +
  '• Reply foto/video + `.upswgc <caption>`\n\n' +
  'Status hanya muncul untuk anggota grup ini.';

module.exports = {
  command: ['upswgc', 'upsw', 'swgc'],
  group: true,
  admin: true,
  desc: 'Upload status (story) tertarget hanya untuk anggota grup ini',
  run: async (ctx) => {
    const { conn, from, msg, text, reply, participants } = ctx;

    const quoted = getQuotedMessage(msg);
    const quotedType = quoted ? getMediaType(quoted) : null;
    const hasMedia = quoted && ['image', 'video'].includes(quotedType);

    // Tanpa teks & tanpa media -> tampilkan petunjuk
    if (!text && !hasMedia) {
      return reply(PETUNJUK);
    }

    try {
      // Daftar JID anggota grup -> target status (tertarget, bukan publik)
      const jids = (participants || []).map((p) => p.id).filter(Boolean);
      if (jids.length === 0) {
        return reply('⚠️ Gagal mengambil daftar anggota grup. Coba lagi.');
      }

      const statusOpts = {
        backgroundColor: '#000000', // background hitam untuk status teks
        font: 3,
        statusJidList: jids,
        broadcast: true,
      };

      if (hasMedia) {
        // ---- Status MEDIA (foto/video) khusus grup ----
        const buffer = await downloadFrom(conn, quoted);
        const caption = (text && text.trim()) || '';
        const content =
          quotedType === 'image'
            ? { image: buffer, caption }
            : { video: buffer, caption };
        await conn.sendMessage('status@broadcast', content, statusOpts);
      } else {
        // ---- Status TEKS (background hitam) khusus grup ----
        await conn.sendMessage('status@broadcast', { text: text.trim() }, statusOpts);
      }

      await reply('✅ Status grup berhasil dikirim.');
    } catch (e) {
      console.error('[UPSWGC] gagal:', e.message);
      await reply(
        `⚠️ Gagal mengirim status grup.\n_Alasan: ${e.message}_\n\nPastikan bot mendukung fitur status & coba lagi.`
      );
    }
  },
};
