/**
 * lib/media.js
 * ------------------------------------------------------------------
 * Helper untuk mengunduh media dari pesan / pesan yang di-reply (quoted).
 * ------------------------------------------------------------------
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

/**
 * Bangun objek pesan dari pesan yang di-reply (quoted), agar bisa diunduh.
 * @param {object} msg pesan asli
 * @returns {object|null} objek pesan quoted bergaya { key, message }
 */
function getQuotedMessage(msg) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctxInfo?.quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctxInfo.stanzaId,
      fromMe: false,
      participant: ctxInfo.participant,
    },
    message: ctxInfo.quotedMessage,
  };
}

/**
 * Deteksi tipe media dari objek pesan { message }.
 * @param {object} message
 * @returns {('image'|'video'|'sticker'|'audio'|'document'|null)}
 */
function getMediaType(message) {
  const m = message?.message || {};
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return 'video';
  if (m.stickerMessage) return 'sticker';
  if (m.audioMessage) return 'audio';
  if (m.documentMessage) return 'document';
  return null;
}

/**
 * Unduh media menjadi Buffer.
 * @param {object} conn socket Baileys
 * @param {object} message objek pesan { key, message }
 * @returns {Promise<Buffer>}
 */
async function downloadFrom(conn, message) {
  return downloadMediaMessage(
    message,
    'buffer',
    {},
    { reuploadRequest: conn.updateMediaMessage }
  );
}

module.exports = { getQuotedMessage, getMediaType, downloadFrom };
