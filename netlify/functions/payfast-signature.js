const crypto = require("crypto");

/**
 * PayFast checkout signature field order.
 *
 * Do not generate the signature by looping through Object.entries(data).
 * PayFast requires the checkout fields to be signed in this exact sequence.
 */
const PAYFAST_FIELD_ORDER = [
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

function computePayFastSignature(data, passphrase = "") {
  const pairs = [];

  for (const key of PAYFAST_FIELD_ORDER) {
    const value = data[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      pairs.push(`${key}=${normalizePayFastValue(value)}`);
    }
  }

  if (passphrase && String(passphrase).trim() !== "") {
    pairs.push(`passphrase=${normalizePayFastValue(passphrase)}`);
  }

  const signatureString = pairs.join("&");

  return crypto
    .createHash("md5")
    .update(signatureString)
    .digest("hex");
}

module.exports = {
  computePayFastSignature,
  normalizePayFastValue,
  PAYFAST_FIELD_ORDER
};
