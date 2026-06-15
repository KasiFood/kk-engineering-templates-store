// netlify/functions/payfast-itn.js
// PayFast ITN endpoint. It verifies the payment, stores the verified order in Netlify Blobs,
// then creates a signed 48-hour download token.

const https = require("https");
const { getStore } = require("@netlify/blobs");
const { PRODUCTS } = require("./products");
const { generateDownloadToken } = require("./token");
const { computePayFastSignature } = require("./payfast-signature");

function parseFormBody(body) {
  const data = {};
  for (const [key, value] of new URLSearchParams(body || "").entries()) {
    data[key] = value;
  }
  return data;
}

function validateWithPayFast(pfData, isLive) {
  return new Promise((resolve, reject) => {
    const host = isLive ? "www.payfast.co.za" : "sandbox.payfast.co.za";
    const body = Object.entries(pfData)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value).trim()).replace(/%20/g, "+")}`)
      .join("&");

    const req = https.request({
      hostname: host,
      port: 443,
      path: "/eng/query/validate",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      let response = "";
      res.on("data", (chunk) => { response += chunk; });
      res.on("end", () => resolve(response.trim().toUpperCase() === "VALID"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function extractProductSlug(mPaymentId) {
  const match = String(mPaymentId || "").match(/^KK-(.+)-\d+$/);
  return match ? match[1] : null;
}

async function sendDownloadEmail(toEmail, productName, downloadUrl) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || !toEmail) return;

  const body = JSON.stringify({
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: process.env.FROM_EMAIL || "noreply@example.com", name: "KK Engineering Templates" },
    subject: `Your download is ready — ${productName}`,
    content: [{
      type: "text/html",
      value: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0A0C10;color:#F0EEE8;border-radius:8px;">
          <h2 style="color:#E8A020;margin-bottom:1rem;">Your template is ready to download</h2>
          <p style="color:#8A8C94;margin-bottom:1.5rem;">Thank you for your purchase. Click below to download <strong style="color:#F0EEE8;">${productName}</strong>.</p>
          <a href="${downloadUrl}" style="display:inline-block;background:#E8A020;color:#0A0C10;font-weight:700;padding:14px 28px;border-radius:4px;text-decoration:none;margin-bottom:1.5rem;">Download your file →</a>
          <p style="color:#52555E;font-size:12px;">This link expires in 48 hours. If you have any issues, reply to this email.</p>
          <hr style="border-color:rgba(255,255,255,0.07);margin:1.5rem 0;">
          <p style="color:#52555E;font-size:12px;">KK Engineering Templates · Bloemfontein, ZA</p>
        </div>`
    }]
  });

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const pfData = parseFormBody(event.body);
    const isLive = process.env.PAYFAST_LIVE === "true";
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const passphrase = process.env.PAYFAST_PASSPHRASE || "";

    console.log("PayFast ITN received:", JSON.stringify({
      pf_payment_id: pfData.pf_payment_id,
      m_payment_id: pfData.m_payment_id,
      amount_gross: pfData.amount_gross,
      payment_status: pfData.payment_status,
      email_address: pfData.email_address
    }));

    // Allow all IPs in sandbox. In live mode, restrict to PayFast known ITN IPs.
    const pfIPs = [
      "197.97.145.144", "197.97.145.145", "197.97.145.146", "197.97.145.147",
      "41.74.179.192", "41.74.179.193", "41.74.179.194", "41.74.179.195"
    ];
    const sourceIP = event.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    if (isLive && sourceIP && !pfIPs.includes(sourceIP)) {
      console.error("Invalid ITN source IP:", sourceIP);
      return { statusCode: 400, body: "Invalid source IP" };
    }

    const expectedSignature = computePayFastSignature(pfData, passphrase);
    if (expectedSignature !== pfData.signature) {
      console.error("Signature mismatch. Expected:", expectedSignature, "Received:", pfData.signature);
      return { statusCode: 400, body: "Invalid signature" };
    }

    const isPayFastValid = await validateWithPayFast(pfData, isLive);
    if (!isPayFastValid) {
      console.error("PayFast server validation failed.");
      return { statusCode: 400, body: "PayFast validation failed" };
    }

    if (pfData.merchant_id !== merchantId) {
      console.error("Merchant ID mismatch.");
      return { statusCode: 400, body: "Merchant ID mismatch" };
    }

    const mPaymentId = pfData.m_payment_id || "";
    const productSlug = extractProductSlug(mPaymentId);
    const product = PRODUCTS[productSlug];

    if (!product) {
      console.error("Unknown product slug:", productSlug, "from", mPaymentId);
      return { statusCode: 200, body: "OK" };
    }

    const store = getStore("kk-orders");

    if (pfData.payment_status !== "COMPLETE") {
      await store.setJSON(`order:${mPaymentId}`, {
        status: pfData.payment_status || "PENDING",
        productSlug,
        paymentId: pfData.pf_payment_id || "",
        updatedAt: new Date().toISOString()
      });
      return { statusCode: 200, body: "OK" };
    }

    const expectedAmount = Number(product.price).toFixed(2);
    const receivedAmount = Number.parseFloat(pfData.amount_gross).toFixed(2);
    if (receivedAmount !== expectedAmount) {
      console.error(`Amount mismatch. Expected ${expectedAmount}, received ${receivedAmount}`);
      return { statusCode: 400, body: "Amount mismatch" };
    }

    const buyerEmail = pfData.email_address || "";
    const token = generateDownloadToken(productSlug, buyerEmail, pfData.pf_payment_id || mPaymentId);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await store.setJSON(`order:${mPaymentId}`, {
      status: "COMPLETE",
      productSlug,
      productName: product.name,
      buyerEmail,
      paymentId: pfData.pf_payment_id || "",
      amount: receivedAmount,
      token,
      expiresAt,
      updatedAt: new Date().toISOString()
    });

    const siteUrl = (process.env.URL || "").replace(/\/$/, "");
    const downloadUrl = siteUrl
      ? `${siteUrl}/download.html?token=${encodeURIComponent(token)}`
      : `/download.html?token=${encodeURIComponent(token)}`;

    await sendDownloadEmail(buyerEmail, product.name, downloadUrl);

    console.log("Payment verified and order stored:", mPaymentId);
    return { statusCode: 200, body: "OK" };
  } catch (error) {
    console.error("ITN handler error:", error);
    return { statusCode: 200, body: "OK" };
  }
};
