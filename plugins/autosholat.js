/**
 * plugins/autosholat.js
 * Aktif/nonaktif pengingat adzan OTOMATIS untuk grup ini.
 *
 * Perintah: .autosholat on | .autosholat off
 * Hanya Admin grup / Owner. Pengiriman dijalankan oleh lib/autosholat.js
 * (scheduler global yang dimulai dari index.js).
 */

const config = require('../config');
const groupdb = require('../lib/groupdb');

module.exports = {
  command: ['autosholat', 'autoadzan'],
  group: true,
  admin: true,
  desc: 'Aktif/nonaktif pengingat adzan otomatis di grup',
  run: async (ctx) => {
    const { from, args, reply } = ctx;
    const opt = (args[0] || '').toLowerCase();

    if (opt !== 'on' && opt !== 'off') {
      const cur = groupdb.getGroup(from).autoSholat ? 'ON ✅' : 'OFF ❌';
      return reply(
        `Status auto pengingat adzan: *${cur}*\n\nGunakan:\n• *.autosholat on*\n• *.autosholat off*\n\n_Wilayah: ${config.islamic?.cityName || 'Jakarta'} (WIB). Ubah di config.islamic._`
      );
    }

    const value = opt === 'on';
    groupdb.setAutoSholat(from, value);
    await reply(
      value
        ? `✅ *Auto pengingat adzan AKTIF* untuk grup ini.\nWilayah: *${config.islamic?.cityName || 'Jakarta'}* (WIB).`
        : '❌ *Auto pengingat adzan NONAKTIF* untuk grup ini.'
    );
  },
};
