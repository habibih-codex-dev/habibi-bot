/**
 * plugins/runtime.js
 * Menampilkan lama bot aktif (uptime).
 */

const config = require('../config');
const { formatRuntime } = require('../lib/functions');

module.exports = {
  command: ['runtime', 'uptime'],
  desc: 'Cek lama bot aktif',
  run: async (ctx) => {
    const uptimeMs = process.uptime() * 1000;
    await ctx.reply(
      `🤖 *${config.botName}*\n⏱️ Runtime: *${formatRuntime(uptimeMs)}*`
    );
  },
};
