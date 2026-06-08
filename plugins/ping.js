/**
 * plugins/ping.js
 * Cek kecepatan respon bot.
 */

module.exports = {
  command: ['ping', 'p'],
  desc: 'Cek latency/respon bot',
  run: async (ctx) => {
    const start = Date.now();
    const sent = await ctx.reply('🏓 Pinging...');
    const latency = Date.now() - start;

    await ctx.conn.sendMessage(
      ctx.from,
      { text: `🏓 *Pong!*\n⚡ Kecepatan respon: *${latency} ms*`, edit: sent?.key },
      { quoted: ctx.msg }
    ).catch(async () => {
      await ctx.reply(`🏓 *Pong!*\n⚡ Kecepatan respon: *${latency} ms*`);
    });
  },
};
