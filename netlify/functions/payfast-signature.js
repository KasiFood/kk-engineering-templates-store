const crypto = require("crypto");

/**
 * PayFast checkout signature field order.
 *
 * Do not generate checkout signatures by looping through Object.entries(data).
 * PayFast requires checkout fields to be signed in this sequence.
 */
const PAYFAST_CHECKOUT_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",

  "name_first",
  "name_last",
  "email_address",
  "cell_number",

  "m_payment_id",
  "amount",
  "item_name",
  "item_description",

  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",

  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",

  "email_confirmation",
  "confirmation_address",

  "payment_method",

  "subscription_type",
  "billing_date",
  "recurring_amount",
  "frequency",
  "cycles"
];

function normalizePayFastValue(value) {
  return encodeURIComponent(String(value).trim())
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (char) =>
      "%" + char.charCodeAt(0).toString(16).toUpperCase()
    );
}

function addPassphrase(pairs, passphrase = "") {
  if (passphrase && String(passphrase).trim() !== "") {
    pairs.push(`passphrase=${normalizePayFastValue(passphrase)}`);
  }
  return pairs;
}

function md5Signature(pairs) {
  return crypto
    .createHash("md5")
    .update(pairs.join("&"))
    .digest("hex");
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function computeCheckoutSignature(data, passphrase = "") {
  const pairs = [];

  for (const key of PAYFAST_CHECKOUT_FIELD_ORDER) {
    const value = data[key];
    if (isPresent(value)) {
      pairs.push(`${key}=${normalizePayFastValue(value)}`);
    }
  }

  return md5Signature(addPassphrase(pairs, passphrase));
}

/**
 * PayFast ITN signature verification.
 * ITN data is signed from the variables PayFast posts back, excluding the
 * signature field itself, while preserving the received field order.
 */
function computeItnSignature(data, passphrase = "") {
  const pairs = [];

  for (const [key, value] of Object.entries(data || {})) {
    if (key === "signature") continue;
    if (isPresent(value)) {
      pairs.push(`${key}=${normalizePayFastValue(value)}`);
    }
  }

  return md5Signature(addPassphrase(pairs, passphrase));
}

// Backward-compatible alias used by older files.
const computePayFastSignature = computeCheckoutSignature;

module.exports = {
  computeCheckoutSignature,
  computeItnSignature,
  computePayFastSignature,
  normalizePayFastValue,
  PAYFAST_CHECKOUT_FIELD_ORDER
};
