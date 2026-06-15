const { getStore } = require("@netlify/blobs");
const { PRODUCTS } = require("./products");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}

function safeOrderId(order) {
  const value = String(order || "").trim();
  return /^KK-[a-z0-9-]+-\d+$/.test(value) ? value : null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const orderId = safeOrderId(event.queryStringParameters?.order);
    if (!orderId) return json(400, { error: "Missing or invalid order reference." });

    const store = getStore("kk-orders");
    const order = await store.get(`order:${orderId}`, { type: "json" });

    if (!order) {
      return json(202, {
        status: "PENDING",
        message: "Payment verification is still pending. Keep this page open."
      });
    }

    if (order.status !== "COMPLETE") {
      return json(202, {
        status: order.status || "PENDING",
        message: "Payment has not been confirmed as complete yet."
      });
    }

    const product = PRODUCTS[order.productSlug];
    if (!product || !order.token) return json(500, { error: "Verified order is missing product or token data." });

    return json(200, {
      status: "COMPLETE",
      productSlug: product.slug,
      productName: product.name,
      format: product.fmt,
      expiresAt: order.expiresAt,
      downloadUrl: `/api/download-file?token=${encodeURIComponent(order.token)}`
    });
  } catch (error) {
    console.error("get-download-link error:", error);
    return json(500, { error: "Could not check payment status." });
  }
};
