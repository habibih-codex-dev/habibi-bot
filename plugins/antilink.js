/**
 * plugins/antilink.js
 * Toggle SEMUA fitur proteksi grup (Antilink & Anti-Abuse).
 *
 * Perintah (Admin grup / Owner) — masing-masing on/off:
 *   .antilink        V1: hanya HAPUS pesan ber-link (peringatan, tanpa kick)
 *   .antilinkv2      V2: HAPUS + KICK pengirim link
 *   .antilinkwa      link grup WA (chat.whatsapp.com) -> hapus + kick
 *   .antilinkch      link channel WA (whatsapp.com/channel) -> hapus + kick
 *   .antibot         kick bot lain yang join grup
 *   .antitoxic       hapus pesan kata kasar/kotor
 *   .antijudol       hapus + kick keyword judi (slot/judol/gacor/dll)
 *   .antilinkpising  hapus + kick link/keyword phising
 *   .antibug         hapus + kick teks virtex/bug
 *   .antitagall      blokir tagall/hidetag massal oleh member biasa
 *   .antiforeign     kick nomor luar negeri yang join
 *
 * Deteksi & penindakan dijalankan di handler.js (per pesan) dan
 * lib/antijoin.js (saat join). Plugin ini hanya untuk on/off.
 */

const groupdb = require('../lib/groupdb');

// Pemetaan command -> { key fitur, deskripsi singkat }
const FEATURES = {
  antilink: { key: 'antilink', info: 'hapus pesan ber-link (V1, tanpa kick)' },
  antilinkv2: { key: 'antilinkv2', info: 'hapus + KICK pengirim link (V2)' },
  antilinkwa: { key: 'antilinkwa', info: 'hapus pesan link grup WhatsApp (V1, tanpa kick)' },
  antilinkwav2: { key: 'antilinkwav2', info: 'link grup WA: warning bertahap -> kick di batas maxWarn' },
  antilinkch: { key: 'antilinkch', info: 'hapus + kick link channel WhatsApp' },
  antibot: { key: 'antibot', info: 'kick bot lain yang join grup' },
  antitoxic: { key: 'antitoxic', info: 'hapus pesan kata kasar/kotor' },
  antijudol: { key: 'antijudol', info: 'hapus + kick keyword judi online' },
  antilinkpising: { key: 'antilinkpising', info: 'hapus + kick link/keyword phising' },
  antibug: { key: 'antibug', info: 'hapus + kick teks virtex/bug' },
  antitagall: { key: 'antitagall', info: 'blokir tagall/hidetag massal member biasa' },
  antihidetag: { key: 'antihidetag', info: 'hapus pesan hidetag (mention tersembunyi) member biasa' },
  antiforeign: { key: 'antiforeign', info: 'kick nomor luar negeri yang join' },
};

module.exports = {
  command: Object.keys(FEATURES),
  group: true,
  admin: true,
  botAdmin: true,
  desc: 'Aktif/nonaktif fitur proteksi grup (antilink & anti-abuse)',
  run: async (ctx) => {
    const { from, command, args, reply } = ctx;
    const feat = FEATURES[command];
    if (!feat) return; // pengaman

    const opt = (args[0] || '').toLowerCase();
    if (opt !== 'on' && opt !== 'off') {
      const cur = groupdb.isOn(from, feat.key) ? 'ON ✅' : 'OFF ❌';
      return reply(
        `🛡️ *${command}* : *${cur}*\n` +
          `Fungsi: _${feat.info}_\n\n` +
          `Gunakan:\n• *.${command} on*\n• *.${command} off*`
      );
    }

    const value = opt === 'on';
    groupdb.setFeature(from, feat.key, value);
    await reply(
      value
        ? `✅ *${command} AKTIF.*\n${feat.info[0].toUpperCase() + feat.info.slice(1)}.\n\n_Owner & Admin grup otomatis dikecualikan._`
        : `❌ *${command} NONAKTIF.*`
    );
  },
};
