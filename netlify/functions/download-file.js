const fs = require("fs");
const path = require("path");
const { PRODUCTS } = require("./products");
const { verifyDownloadToken } = require("./token");

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
    path.join(process.cwd(), "downloads", fileName),
    path.join(__dirname, "..", "..", "downloads", fileName),
    path.join(__dirname, "downloads", fileName),
    path.join("/var/task", "downloads", fileName),
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

    const filePath = resolveDownloadPath(product.file);
    if (!filePath) {
      console.error("File not found for product:", product.slug, product.file);
      return text(404, "Purchased file is missing on the server.");
    }

    const fileBuffer = fs.readFileSync(filePath);

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
