/**
 * plugins/runtime.js
 * Info runtime & spesifikasi server (VPS) — gaya Habibi Cloud.
 *
 * Menampilkan: uptime bot, uptime VPS, penggunaan RAM, model CPU,
 * platform OS, dan ping respon bot ke server.
 */

const os = require('os');
const config = require('../config');
const { formatRuntime } = require('../lib/functions');

/** Format byte menjadi string GB/MB yang manusiawi. */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${mb.toFixed(1)} MB`;
}

module.exports = {
  command: ['runtime', 'uptime', 'info', 'infobot'],
  desc: 'Info runtime bot & spesifikasi server',
  run: async (ctx) => {
    const { conn, from, msg, reply } = ctx;

    try {
      // ---- Ukur ping/respon bot ke server ----
      const start = Date.now();
      const temp = await conn.sendMessage(from, { text: '⏳ Mengukur kecepatan...' }, { quoted: msg });
      const ping = Date.now() - start;

      // ---- Spesifikasi server ----
      const totalRam = os.totalmem();
      const freeRam = os.freemem();
      const usedRam = totalRam - freeRam;
      const cpu = os.cpus()?.[0]?.model?.trim() || 'Unknown CPU';
      const cpuCount = os.cpus()?.length || 1;
      const platform = `${os.type()} (${os.platform()} ${os.release()})`;
      const botUptime = formatRuntime(process.uptime() * 1000);
      const vpsUptime = formatRuntime(os.uptime() * 1000);

      const teks =
        `╭━━━〔 *${config.botName}* 〕━━━⊷\n` +
        `┃ ☁️ *${config.cloudName} Server Status*\n` +
        `┃\n` +
        `┃ ⚡ *Ping* : ${ping} ms\n` +
        `┃ 🤖 *Uptime Bot* : ${botUptime}\n` +
        `┃ 🖥️ *Uptime VPS* : ${vpsUptime}\n` +
        `┃\n` +
        `┃ 💾 *RAM* : ${formatBytes(usedRam)} / ${formatBytes(totalRam)}\n` +
        `┃ 🧠 *CPU* : ${cpu} (${cpuCount} core)\n` +
        `┃ 🐧 *OS* : ${platform}\n` +
        `╰━━━━━━━━━━━━━━━⊷\n` +
        `_Powered by ${config.cloudName}_`;

      // Edit pesan sementara -> hasil akhir (fallback kirim baru bila gagal)
      await conn
        .sendMessage(from, { text: teks, edit: temp?.key }, { quoted: msg })
        .catch(() => reply(teks));
    } catch (e) {
      console.error('[RUNTIME] gagal:', e.message);
      await reply(`🤖 *${config.botName}*\n⏱️ Runtime: *${formatRuntime(process.uptime() * 1000)}*`);
    }
  },
};
