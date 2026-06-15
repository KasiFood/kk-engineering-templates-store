const crypto = require("crypto");

function normalizePayFastValue(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, "+");
}

function computePayFastSignature(data, passphrase = "") {
  const entries = Object.entries(data)
    .filter(([key, value]) => key !== "signature" && value !== undefined && value !== null && String(value) !== "")
    .map(([key, value]) => `${key}=${normalizePayFastValue(value)}`)
    .join("&");

  const signatureString = passphrase
    ? `${entries}&passphrase=${normalizePayFastValue(passphrase)}`
    : entries;

  return crypto.createHash("md5").update(signatureString).digest("hex");
}

module.exports = { computePayFastSignature };
