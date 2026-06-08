/**
 * handler.js
 * ------------------------------------------------------------------
 * Router pemroses pesan masuk.
 *
 * Tugas:
 *  - Parsing pesan (teks, prefix, command, args).
 *  - Auto-register user ke database (JID dibersihkan dari Device ID).
 *  - Anti-spam cooldown per user (default 3 detik).
 *  - Load semua plugin dari folder plugins/ (mendukung hot-reload).
 *  - Validasi permission: owner / group / admin / botAdmin / limit.
 *  - try...catch menyeluruh agar bot tidak crash bila 1 fitur error.
 * ------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const db = require('./lib/database');
const groupdb = require('./lib/groupdb');
const { cleanJid, getNumber, isSameUser } = require('./lib/jid');
const { isOwner } = require('./lib/functions');

// Regex deteksi link grup WhatsApp & URL umum
const LINK_REGEX = /(chat\.whatsapp\.com\/[A-Za-z0-9]+)|(https?:\/\/[^\s]+)/i;
const WA_GROUP_REGEX = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

// ===================== LOADER PLUGIN =====================
const PLUGIN_DIR = path.join(__dirname, 'plugins');
let plugins = [];

function loadPlugins() {
  plugins = [];
  if (!fs.existsSync(PLUGIN_DIR)) return;

  for (const file of fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith('.js'))) {
    const full = path.join(PLUGIN_DIR, file);
    try {
      delete require.cache[require.resolve(full)]; // bersihkan cache -> hot reload
      const plugin = require(full);
      if (plugin && Array.isArray(plugin.command) && typeof plugin.run === 'function') {
        plugins.push({ ...plugin, __file: file });
      } else {
        console.warn(`[PLUGIN] Dilewati (format salah): ${file}`);
      }
    } catch (e) {
      console.error(`[PLUGIN] Gagal load ${file}:`, e.message);
    }
  }
  console.log(`[PLUGIN] ${plugins.length} perintah dimuat.`);
}
loadPlugins();

// ===================== ANTI-SPAM (COOLDOWN) =====================
const cooldowns = new Map(); // number -> timestamp terakhir

function isOnCooldown(number) {
  const now = Date.now();
  const last = cooldowns.get(number) || 0;
  if (now - last < config.cooldown) return true;
  cooldowns.set(number, now);
  return false;
}

// ===================== UTIL EKSTRAK TEKS =====================
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ''
  );
}

// ===================== HANDLER UTAMA =====================
module.exports = async function handler(conn, mUpsert) {
  try {
    const msg = mUpsert.messages?.[0];
    if (!msg || !msg.message) return;
    if (msg.key.fromMe) return; // abaikan pesan dari bot sendiri
    if (mUpsert.type !== 'notify') return;

    const from = msg.key.remoteJid; // JID chat (grup atau pribadi)
    const isGroup = from.endsWith('@g.us');

    // Sender JID -> WAJIB dibersihkan dari Device ID
    const senderRaw = isGroup ? msg.key.participant : msg.key.remoteJid;
    const sender = cleanJid(senderRaw);
    const senderNumber = getNumber(sender);

    const body = getMessageText(msg).trim();
    if (!body) return;

    // ---- Auto register user (auto-create di getUser) ----
    db.getUser(sender);

    const owner = isOwner(sender);
    const botJid = cleanJid(conn.user.id);

    // ===================== ANTILINK =====================
    // Berjalan di SETIAP pesan grup (bukan hanya perintah).
    if (isGroup && groupdb.getGroup(from).antilink && LINK_REGEX.test(body)) {
      try {
        const meta = await conn.groupMetadata(from);
        const parts = meta.participants || [];
        const senderIsAdmin = parts.some(
          (p) => isSameUser(p.id, sender) && (p.admin === 'admin' || p.admin === 'superadmin')
        );
        const botIsAdmin = parts.some(
          (p) => isSameUser(p.id, botJid) && (p.admin === 'admin' || p.admin === 'superadmin')
        );

        // Hanya tindak link grup WA dari NON-admin & NON-owner
        if (botIsAdmin && !senderIsAdmin && !owner && WA_GROUP_REGEX.test(body)) {
          await conn.sendMessage(from, {
            text: `⚠️ *ANTILINK AKTIF*\n@${senderNumber} terdeteksi mengirim link grup. Pesan dihapus.`,
            mentions: [sender],
          });
          // Hapus pesan pelanggar
          await conn.sendMessage(from, { delete: msg.key });
          // Keluarkan pelanggar
          await conn.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {});
        }
      } catch (e) {
        console.error('[ANTILINK] Error:', e.message);
      }
    }

    // ---- Deteksi prefix & command ----
    const usedPrefix = config.prefix.find((p) => body.startsWith(p));
    if (!usedPrefix) return; // bukan perintah

    const args = body.slice(usedPrefix.length).trim().split(/\s+/);
    const command = (args.shift() || '').toLowerCase();
    const text = args.join(' ');
    if (!command) return;

    // ---- Cari plugin yang cocok ----
    const plugin = plugins.find((p) => p.command.includes(command));
    if (!plugin) return; // command tidak dikenal -> diam

    // ---- ANTI-SPAM: owner dikecualikan ----
    if (!owner && isOnCooldown(senderNumber)) {
      // Diam total agar tidak memancing spam balasan (aman dari blokir)
      return;
    }

    // ---- Kumpulkan metadata grup & status admin (JID-safe) ----
    let groupMetadata = null;
    let participants = [];
    let isAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
      try {
        groupMetadata = await conn.groupMetadata(from);
        participants = groupMetadata.participants || [];

        // Pengecekan admin KEBAL Device ID karena pakai isSameUser
        isAdmin = participants.some(
          (p) => isSameUser(p.id, sender) && (p.admin === 'admin' || p.admin === 'superadmin')
        );
        isBotAdmin = participants.some(
          (p) => isSameUser(p.id, botJid) && (p.admin === 'admin' || p.admin === 'superadmin')
        );
      } catch (e) {
        console.error('[GROUP] Gagal ambil metadata:', e.message);
      }
    }

    // ---- Helper balas pesan ----
    const reply = (teks) =>
      conn.sendMessage(from, { text: String(teks) }, { quoted: msg });

    // ---- Context yang dikirim ke plugin ----
    const ctx = {
      conn,
      msg,
      from,
      sender,
      senderNumber,
      body,
      command,
      args,
      text,
      usedPrefix,
      isGroup,
      groupMetadata,
      participants,
      isAdmin,
      isBotAdmin,
      isOwner: owner,
      reply,
      db,
    };

    // ---- Validasi permission sebelum eksekusi ----
    if (plugin.owner && !owner) return reply(config.messages.owner);
    if (plugin.group && !isGroup) return reply(config.messages.group);
    if (plugin.private && isGroup) return reply(config.messages.private);
    if (plugin.admin && !isAdmin && !owner) return reply(config.messages.admin);
    if (plugin.botAdmin && !isBotAdmin) return reply(config.messages.botAdmin);

    // ---- Sistem LIMIT ----
    if (plugin.limit && !owner) {
      if (!db.hasLimit(sender)) return reply(config.messages.limit);
    }

    // ---- EKSEKUSI plugin (try...catch per perintah) ----
    try {
      await plugin.run(ctx);

      // Potong limit HANYA jika eksekusi sukses & plugin butuh limit
      if (plugin.limit && !owner) {
        db.useLimit(sender, plugin.limit === true ? 1 : Number(plugin.limit) || 1);
      }
    } catch (e) {
      console.error(`[CMD ERROR] .${command} oleh ${senderNumber}:`, e);
      await reply(`${config.messages.error}\n\n_Detail: ${e.message}_`);
    }
  } catch (e) {
    // Pengaman lapisan terluar: apapun yang terjadi, bot TIDAK mati
    console.error('[HANDLER FATAL]', e);
  }
};
