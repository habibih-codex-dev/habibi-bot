/**
 * plugins/jadwalsholat.js
 * Jadwal Sholat manual berdasarkan nama kota.
 *
 * Perintah: .jadwalsholat <nama kota>   (alias: .jadwal, .sholat)
 *
 * Sumber data: api.myquran.com (v2) — stabil & gratis.
 *   1. Cari kota:  /v2/sholat/kota/cari/<keyword>
 *   2. Jadwal hari ini: /v2/sholat/jadwal/<id>/<YYYY-MM-DD>
 *
 * LIMIT: dipotong (-1) jika jadwal berhasil dikirim.
 */

const axios = require('axios');
const config = require('../config');

/** Tanggal hari ini (YYYY-MM-DD) zona WIB (Asia/Jakarta). */
function wibDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

module.exports = {
  command: ['jadwalsholat', 'jadwal', 'sholat', 'jadwalshalat'],
  desc: 'Jadwal sholat hari ini berdasarkan kota',
  run: async (ctx) => {
    const { text, reply, db, sender, isOwner, usedPrefix } = ctx;

    if (!text) {
      return reply(`Masukkan nama kota.\nContoh: *${usedPrefix}jadwalsholat jakarta*`);
    }

    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      await reply(config.messages.wait);

      // 1) Cari ID kota
      const cari = await axios.get(
        `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(text.trim())}`,
        { timeout: 20000 }
      );
      const kota = cari.data?.data?.[0];
      if (!kota) throw new Error(`Kota "${text}" tidak ditemukan`);

      // 2) Ambil jadwal hari ini (WIB)
      const tgl = wibDate();
      const jadwalRes = await axios.get(
        `https://api.myquran.com/v2/sholat/jadwal/${kota.id}/${tgl}`,
        { timeout: 20000 }
      );
      const data = jadwalRes.data?.data;
      const j = data?.jadwal;
      if (!j) throw new Error('Gagal mengambil data jadwal');

      const teks =
        `🕌 *JADWAL SHOLAT*\n` +
        `📍 ${data.lokasi || kota.lokasi} ${data.daerah ? '(' + data.daerah + ')' : ''}\n` +
        `📅 ${j.tanggal || tgl}\n` +
        `───────────────\n` +
        `🌙 Imsak   : ${j.imsak}\n` +
        `🌄 Subuh   : ${j.subuh}\n` +
        `🌅 Terbit  : ${j.terbit}\n` +
        `🌞 Dzuhur  : ${j.dzuhur}\n` +
        `🌤️ Ashar   : ${j.ashar}\n` +
        `🌇 Maghrib : ${j.maghrib}\n` +
        `🌃 Isya    : ${j.isya}\n` +
        `───────────────\n` +
        `_Sumber: myquran.com • WIB_`;

      await reply(teks);

      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[JADWALSHOLAT] gagal:', e.message);
      await reply(
        `⚠️ Gagal mengambil jadwal sholat.\n_Alasan: ${e.message}_\n\nCoba nama kota lain. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
