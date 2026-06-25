const { PRODUCTS } = require("./products");
const { computePayFastSignature } = require("./payfast-signature");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function getSiteUrl(event) {
  const origin = event.headers.origin || event.headers.Origin;
  if (origin) return origin.replace(/\/$/, "");
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");
  return "http://localhost:8888";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const productSlug = String(body.product || body.productSlug || "").trim();
    const buyerEmail = String(body.email || "").trim();
    const product = PRODUCTS[productSlug];

    if (!product) return json(400, { error: "Unknown product" });

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";
    const isLive = process.env.PAYFAST_LIVE === "true";
    const confirmationEmail = process.env.FROM_EMAIL || "khoaranekatleho@gmail.com";

    if (!merchantId || !merchantKey) {
      return json(500, { error: "PayFast merchant environment variables are missing." });
    }

    const siteUrl = getSiteUrl(event);
    const orderId = `KK-${product.slug}-${Date.now()}`;
    const payfastBase = isLive
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";

    const pfParams = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      amount: Number(product.price).toFixed(2),
      item_name: product.name,
      item_description: `KK Engineering — ${product.name}`,
      m_payment_id: orderId,
      email_confirmation: "1",
      confirmation_address: confirmationEmail,
      return_url: `${siteUrl}/download.html?order=${encodeURIComponent(orderId)}`,
      cancel_url: `${siteUrl}/index.html#products`,
      notify_url: `${siteUrl}/api/payfast-itn`
    };

    if (buyerEmail) pfParams.email_address = buyerEmail;

    pfParams.signature = computePayFastSignature(pfParams, passphrase);

    const qs = new URLSearchParams(pfParams).toString();

    return json(200, {
      ok: true,
      orderId,
      paymentUrl: `${payfastBase}?${qs}`
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return json(500, { error: "Could not create checkout session." });
  }
};
