/**
 * plugins/alquran.js
 * Al-Qur'an digital — ambil satu ayat (Arab + latin + arti Indonesia).
 *
 * Perintah: .alquran <surah>:<ayat>   (contoh: .alquran 2:255)
 *           alias: .quran, .ayat
 *
 * Sumber: api.alquran.cloud (multi-edition, gratis & stabil)
 *   /v1/ayah/<surah>:<ayat>/editions/quran-uthmani,en.transliteration,id.indonesian
 *
 * LIMIT: dipotong (-1) jika ayat berhasil dikirim.
 */

const axios = require('axios');
const config = require('../config');

module.exports = {
  command: ['alquran', 'quran', 'ayat'],
  desc: "Ambil ayat Al-Qur'an (Arab, latin, arti)",
  run: async (ctx) => {
    const { text, reply, db, sender, isOwner, usedPrefix } = ctx;

    const match = (text || '').trim().match(/^(\d{1,3})[:.\s](\d{1,3})$/);
    if (!match) {
      return reply(
        `Format: *${usedPrefix}alquran <surah>:<ayat>*\nContoh: *${usedPrefix}alquran 2:255* (Ayat Kursi)`
      );
    }

    const surah = Number(match[1]);
    const ayat = Number(match[2]);
    if (surah < 1 || surah > 114) {
      return reply('Nomor surah harus antara 1 - 114.');
    }

    if (!isOwner && !db.hasLimit(sender)) {
      return reply(config.messages.limit);
    }

    try {
      await reply(config.messages.wait);

      const { data } = await axios.get(
        `https://api.alquran.cloud/v1/ayah/${surah}:${ayat}/editions/quran-uthmani,en.transliteration,id.indonesian`,
        { timeout: 20000 }
      );

      if (data?.code !== 200 || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('Ayat tidak ditemukan');
      }

      const arab = data.data.find((d) => d.edition?.identifier === 'quran-uthmani');
      const latin = data.data.find((d) => d.edition?.identifier === 'en.transliteration');
      const arti = data.data.find((d) => d.edition?.identifier === 'id.indonesian');
      const info = arab || data.data[0];

      const teks =
        `📖 *Al-Qur'an*\n` +
        `*${info.surah?.englishName || ''} (${info.surah?.name || ''})*\n` +
        `Surah ke-${surah} : Ayat ${ayat}\n` +
        `───────────────\n\n` +
        `${arab?.text || '-'}\n\n` +
        `_${latin?.text || '-'}_\n\n` +
        `📝 *Arti:*\n${arti?.text || '-'}\n` +
        `───────────────\n` +
        `_Sumber: alquran.cloud_`;

      await reply(teks);

      if (!isOwner) db.useLimit(sender, 1);
    } catch (e) {
      console.error('[ALQURAN] gagal:', e.message);
      await reply(
        `⚠️ Gagal mengambil ayat.\n_Alasan: ${e.message}_\n\nPastikan nomor surah:ayat valid. Limit kamu *tidak* dipotong.`
      );
    }
  },
};
