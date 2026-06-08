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

module.exports = { formatRuntime, isOwner, formatNumber, sleep };
