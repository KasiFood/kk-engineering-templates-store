const fs = require("fs");
const path = require("path");
const { getStore } = require("@netlify/blobs");
const { PRODUCTS } = require("./products");
const { verifyDownloadToken, hashDownloadToken } = require("./token");

function text(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body
  };
}

function contentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".zip") return "application/zip";
  if (ext === ".pdf") return "application/pdf";
  return "application/octet-stream";
}

function resolveDownloadPath(fileName) {
  const candidates = [
    path.join(process.cwd(), "secure-downloads", fileName),
    path.join(__dirname, "..", "..", "secure-downloads", fileName),
    path.join(__dirname, "secure-downloads", fileName),
    path.join("/var/task", "secure-downloads", fileName)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return text(405, "Method not allowed");

  try {
    const token = event.queryStringParameters?.token;
    const verified = verifyDownloadToken(token);
    const product = PRODUCTS[verified.productSlug];

    if (!product) return text(404, "Unknown product");

    const tokenHash = hashDownloadToken(token);
    const tokenStore = getStore("kk-download-tokens");
    const used = await tokenStore.get(`used:${tokenHash}`, { type: "json" });

    if (used) {
      return text(410, "This download link has already been used. Please contact support if you need the file re-issued.");
    }

    const filePath = resolveDownloadPath(product.file);
    if (!filePath) {
      console.error("File not found for product:", product.slug, product.file);
      return text(404, "Purchased file is missing on the server.");
    }

    const fileBuffer = fs.readFileSync(filePath);

    await tokenStore.setJSON(`used:${tokenHash}`, {
      productSlug: product.slug,
      paymentId: verified.paymentId || "",
      tokenId: verified.tokenId,
      usedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType(product.file),
        "Content-Disposition": `attachment; filename=\"${product.file}\"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      },
      isBase64Encoded: true,
      body: fileBuffer.toString("base64")
    };
  } catch (error) {
    console.error("download-file error:", error.message);
    return text(403, error.message || "Invalid download link");
  }
};
