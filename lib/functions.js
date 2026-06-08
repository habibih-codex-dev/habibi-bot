/**
 * lib/functions.js
 * ------------------------------------------------------------------
 * Kumpulan fungsi bantuan umum (helper).
 * ------------------------------------------------------------------
 */

const config = require('../config');
const { isSameUser } = require('./jid');

/**
 * Format durasi (milidetik) menjadi string runtime "Xd Xh Xm Xs".
 * @param {number} ms
 * @returns {string}
 */
function formatRuntime(ms) {
  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / (1000 * 60)) % 60);
  const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (day) parts.push(`${day} hari`);
  if (hrs) parts.push(`${hrs} jam`);
  if (min) parts.push(`${min} menit`);
  parts.push(`${sec} detik`);
  return parts.join(' ');
}

/**
 * Cek apakah JID termasuk Owner (membandingkan dengan config.owner).
 * Aman dari Device ID karena memakai isSameUser.
 * @param {string} jid
 * @returns {boolean}
 */
function isOwner(jid) {
  if (!jid) return false;
  return config.owner.some((num) => isSameUser(`${num}@s.whatsapp.net`, jid));
}

/**
 * Format angka menjadi format ribuan (1.000).
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  return Number(n).toLocaleString('id-ID');
}

/**
 * Sleep / delay.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Buat objek "fake quoted" official (centang biru) untuk dipakai sebagai
 * { quoted: ... } saat bot membalas. Di atas balon pesan bot akan muncul
 * kotak balasan bernama "WhatsApp" lengkap dengan badge official.
 *
 * Triknya: participant diarahkan ke 0@s.whatsapp.net (akun sistem WA),
 * dan isi quoted berupa contactMessage bernama official.
 *
 * @param {string} name   nama yang tampil pada kotak quoted (default WhatsApp)
 * @param {string} caption teks kecil isi quoted (default verified)
 * @returns {object} objek pesan untuk dipakai sebagai `quoted`
 */
function fakeQuoted(name = 'WhatsApp', caption = 'Official Account ✓') {
  return {
    key: {
      fromMe: false,
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast',
    },
    message: {
      contactMessage: {
        displayName: name,
        vcard:
          'BEGIN:VCARD\n' +
          'VERSION:3.0\n' +
          `N:;${name};;;\n` +
          `FN:${name}\n` +
          'item1.TEL;waid=0:0\n' +
          'item1.X-ABLabel:Mobile\n' +
          'END:VCARD',
      },
    },
  };
}

// Variabel global fake-reply official (centang biru) untuk dipakai di plugin.
//  - fkon   : kotak balasan bernama "WhatsApp"
//  - fdoc   : kotak balasan bernama "WhatsApp Business"
//  - ftoko  : kotak balasan ber-brand toko (Habibi Store)
global.fkon = fakeQuoted('WhatsApp', 'Official Account ✓');
global.fdoc = fakeQuoted('WhatsApp Business', 'Verified Business ✓');
global.ftoko = fakeQuoted(config.storeName || 'Habibi Store', 'Official Store ✓');

module.exports = { formatRuntime, isOwner, formatNumber, sleep, fakeQuoted };
