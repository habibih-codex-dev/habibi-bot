/**
 * lib/baileys.js
 * ------------------------------------------------------------------
 * Loader Baileys yang TANGGUH untuk era "habibi-cloud-baileys".
 *
 * Beberapa util Baileys (jidNormalizedUser, areJidsSameUser,
 * downloadMediaMessage, proto, dll) tetap kita butuhkan di helper.
 * Util ini bisa berasal dari:
 *   1) re-export library wrapper  -> require('habibi-cloud-baileys')
 *   2) base engine v7             -> require('@whiskeysockets/baileys')
 *   3) paket "baileys" / fork     -> via env BAILEYS_PACKAGE
 *
 * Modul ini mencoba berurutan dan mengembalikan objek pertama yang
 * menyediakan util yang dibutuhkan. Aman: tidak melempar saat salah
 * satu paket belum terpasang.
 * ------------------------------------------------------------------
 */

function tryRequire(name) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(name);
  } catch {
    return null;
  }
}

// Urutan pencarian paket
const candidates = [
  process.env.BAILEYS_PACKAGE, // override manual (mis. "baileys", "ourin-baileys")
  'habibi-cloud-baileys',
  '@whiskeysockets/baileys',
  'baileys',
].filter(Boolean);

let resolved = {};
for (const name of candidates) {
  const mod = tryRequire(name);
  if (!mod) continue;
  // Wrapper kadang mengekspos util Baileys di root atau di .baileys/.default
  const candidateObjs = [mod, mod.baileys, mod.default].filter(Boolean);
  const found = candidateObjs.find(
    (o) => o.jidNormalizedUser || o.areJidsSameUser || o.downloadMediaMessage || o.proto
  );
  if (found) {
    resolved = found;
    break;
  }
  // Kalau tidak ada util sama sekali, tetap simpan sebagai fallback terakhir
  if (!resolved || Object.keys(resolved).length === 0) resolved = mod;
}

module.exports = resolved;
