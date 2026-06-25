const crypto = require("crypto");

function getSecret() {
  const secret = process.env.LINK_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LINK_SECRET must be set to a random 32+ character string.");
  }
  return secret;
}

function generateDownloadToken(productSlug, email, paymentId) {
  const secret = getSecret();
  const expiry = Date.now() + 48 * 60 * 60 * 1000;
  const payload = `${productSlug}|${email || ""}|${paymentId || ""}|${expiry}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}|${hmac}`).toString("base64url");
}

function verifyDownloadToken(token) {
  const secret = getSecret();
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  let raw;
  try {
    raw = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid token encoding");
  }

  const parts = raw.split("|");
  if (parts.length !== 5) {
    throw new Error("Invalid token format");
  }

  const [productSlug, email, paymentId, expiryRaw, receivedHmac] = parts;
  const expiry = Number(expiryRaw);
  if (!productSlug || !expiry || Number.isNaN(expiry)) {
    throw new Error("Invalid token payload");
  }

  if (Date.now() > expiry) {
    throw new Error("Download link expired");
  }

  const payload = `${productSlug}|${email}|${paymentId}|${expiryRaw}`;
  const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const expected = Buffer.from(expectedHmac, "hex");
  const received = Buffer.from(receivedHmac || "", "hex");
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error("Invalid token signature");
  }

  return { productSlug, email, paymentId, expiry };
}

module.exports = { generateDownloadToken, verifyDownloadToken };
