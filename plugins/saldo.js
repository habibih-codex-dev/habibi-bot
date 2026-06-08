/**
 * plugins/saldo.js
 * Sistem Saldo & Deposit Habibi Store.
 *
 * Perintah publik:
 *   .saldo / .me        -> cek saldo & profil sendiri
 *   .deposit            -> instruksi cara isi saldo (QRIS/GoPay/Dana)
 *
 * Perintah Owner:
 *   .addsaldo @user <jumlah>     -> tambah saldo user
 *   .minussaldo @user <jumlah>   -> kurangi saldo user
 *
 * (Owner-check dilakukan manual di dalam run agar bisa digabung
 *  dengan perintah publik dalam satu file.)
 */

const config = require('../config');
const { formatNumber } = require('../lib/functions');
const { toJid, getNumber } = require('../lib/jid');

/** Tentukan target dari mention / reply / argumen nomor. */
function resolveTarget(ctx) {
  const { msg, args } = ctx;
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctxInfo?.mentionedJid?.[0];
  const quoted = ctxInfo?.participant;
  if (mentioned) return getNumber(mentioned);
  if (quoted) return getNumber(quoted);
  // argumen pertama berupa nomor
  const argNum = (args[0] || '').replace(/[^0-9]/g, '');
  return argNum || '';
}

module.exports = {
  command: ['saldo', 'me', 'deposit', 'addsaldo', 'minussaldo'],
  desc: 'Cek saldo, info deposit, dan manajemen saldo (owner)',
  run: async (ctx) => {
    const { command, reply, db, sender, isOwner, args, usedPrefix } = ctx;

    // ==================== CEK SALDO / PROFIL ====================
    if (command === 'saldo' || command === 'me') {
      const u = db.getUser(sender);
      const status = u.premium ? '👑 Premium' : '🆓 Free';
      const limitText = u.premium ? '∞ Unlimited' : formatNumber(u.limit);
      const teks =
        `╭───「 *PROFIL SAYA* 」\n` +
        `│ 👤 Nomor  : ${u.number}\n` +
        `│ 🎫 Status : ${status}\n` +
        `│ 🔋 Limit  : ${limitText}\n` +
        `│ 💰 Saldo  : Rp${formatNumber(u.saldo || 0)}\n` +
        `╰───────────────\n` +
        `_Isi saldo: ketik *${usedPrefix}deposit*_`;
      return reply(teks);
    }

    // ==================== INSTRUKSI DEPOSIT ====================
    if (command === 'deposit') {
      const p = config.payment || {};
      const teks =
        `💳 *CARA ISI SALDO ${config.storeName.toUpperCase()}*\n` +
        `───────────────\n` +
        `Silakan transfer ke salah satu metode berikut:\n\n` +
        `• *QRIS*  : ${p.qris || '-'}\n` +
        `• *GoPay* : ${p.gopay || '-'}\n` +
        `• *Dana*  : ${p.dana || '-'}\n\n` +
        `📌 ${p.note || 'Kirim bukti transfer ke Owner untuk konfirmasi.'}\n` +
        `👤 Owner: *${config.ownerName}*`;
      return reply(teks);
    }

    // ==================== OWNER: ADD / MINUS SALDO ====================
    if (command === 'addsaldo' || command === 'minussaldo') {
      if (!isOwner) return reply(config.messages.owner);

      const targetNumber = resolveTarget(ctx);
      // Jumlah: jika target dari arg nomor -> amount di args[1], else args[0]
      const ctxInfo = ctx.msg.message?.extendedTextMessage?.contextInfo;
      const targetFromTagOrReply = ctxInfo?.mentionedJid?.[0] || ctxInfo?.participant;
      const amount = Number(targetFromTagOrReply ? args[0] : args[1]);

      if (!targetNumber || !amount || amount <= 0) {
        return reply(
          `Format: *${usedPrefix}${command} @user <jumlah>*\nContoh: *${usedPrefix}${command} @user 50000*`
        );
      }

      const jid = toJid(targetNumber);
      const saldoBaru =
        command === 'addsaldo' ? db.addSaldo(jid, amount) : db.minusSaldo(jid, amount);

      const aksi = command === 'addsaldo' ? 'ditambahkan ke' : 'dikurangi dari';
      return reply(
        `✅ Saldo Rp${formatNumber(amount)} berhasil ${aksi} ${targetNumber}.\n💰 Saldo sekarang: *Rp${formatNumber(saldoBaru || 0)}*`
      );
    }
  },
};
