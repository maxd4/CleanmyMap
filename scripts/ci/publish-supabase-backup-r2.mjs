import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}

const encoder = new TextEncoder();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function validateEndpoint(endpoint, allowInsecureEndpoint = false) {
  const parsed = new URL(endpoint);
  if ((!allowInsecureEndpoint && parsed.protocol !== "https:") || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("R2_ENDPOINT_INVALID");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("R2_ENDPOINT_INVALID");
  return parsed;
}

function validateInputs({ bucket, key, accessKeyId, secretAccessKey }) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("R2_BUCKET_INVALID");
  if (!key || key.startsWith("/") || key.includes("\\") || key.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("R2_OBJECT_KEY_INVALID");
  }
  if (!accessKeyId || !secretAccessKey) throw new Error("R2_CREDENTIALS_MISSING");
}

function requestTarget(endpoint, bucket, key) {
  const basePath = endpoint.pathname.replace(/\/+$/, "");
  const path = `${basePath}/${encodePathPart(bucket)}/${key.split("/").map(encodePathPart).join("/")}`;
  return { url: new URL(path, endpoint), canonicalUri: path || "/" };
}

function authorization({ method, endpoint, canonicalUri, headers, payloadHash, accessKeyId, secretAccessKey, now }) {
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const requestHeaders = {
    ...headers,
    host: endpoint.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  const canonicalHeaders = Object.entries(requestHeaders)
    .map(([name, value]) => [name.toLowerCase(), String(value).trim().replace(/\s+/g, " ")])
    .sort(([left], [right]) => left.localeCompare(right));
  const signedHeaders = canonicalHeaders.map(([name]) => name).join(";");
  const headerBlock = canonicalHeaders.map(([name, value]) => `${name}:${value}\n`).join("");
  const canonicalRequest = [method, canonicalUri, "", headerBlock, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), service), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    ...requestHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}; Signature=${signature}`,
  };
}

async function s3Request({ endpoint, bucket, key, method, accessKeyId, secretAccessKey, body, contentType, fetchImpl, now = new Date() }) {
  const { url, canonicalUri } = requestTarget(endpoint, bucket, key);
  const payload = body === undefined ? Buffer.alloc(0) : Buffer.from(body);
  const headers = {};
  if (contentType) headers["content-type"] = contentType;
  if (method === "PUT") headers["if-none-match"] = "*";
  const signedHeaders = authorization({
    method,
    endpoint,
    canonicalUri,
    headers,
    payloadHash: sha256(payload),
    accessKeyId,
    secretAccessKey,
    now,
  });
  const response = await fetchImpl(url, { method, headers: signedHeaders, body: method === "PUT" ? payload : undefined });
  if (response.ok) return response;
  if (response.body) await response.arrayBuffer().catch(() => undefined);
  if (response.status === 404 && method === "HEAD") return null;
  if (response.status === 412) throw new Error("R2_OBJECT_COLLISION");
  if (response.status === 403) throw new Error("R2_ACCESS_DENIED");
  if (response.status >= 500) throw new Error("R2_TRANSFER_FAILED");
  throw new Error(`R2_${method}_FAILED`);
}

function checksumFromFile(value) {
  const match = String(value).trim().match(/^([0-9a-f]{64})\s+\S+$/i);
  if (!match) throw new Error("CHECKSUM_FILE_INVALID");
  return match[1].toLowerCase();
}

export async function publishBackupToR2({
  archivePath,
  checksumPath,
  endpoint,
  bucket,
  objectKey,
  accessKeyId,
  secretAccessKey,
  allowInsecureEndpoint = false,
  fetchImpl = fetch,
  now = new Date(),
}) {
  const parsedEndpoint = validateEndpoint(endpoint, allowInsecureEndpoint);
  validateInputs({ bucket, key: objectKey, accessKeyId, secretAccessKey });
  const archive = await readFile(archivePath);
  const checksum = await readFile(checksumPath, "utf8");
  const archiveSha256 = sha256(archive);
  if (checksumFromFile(checksum) !== archiveSha256) throw new Error("CHECKSUM_LOCAL_MISMATCH");
  const checksumKey = `${objectKey}.sha256`;
  const existingArchive = await s3Request({ endpoint: parsedEndpoint, bucket, key: objectKey, method: "HEAD", accessKeyId, secretAccessKey, fetchImpl, now });
  const existingChecksum = await s3Request({ endpoint: parsedEndpoint, bucket, key: checksumKey, method: "HEAD", accessKeyId, secretAccessKey, fetchImpl, now });
  if (existingArchive || existingChecksum) throw new Error("R2_OBJECT_COLLISION");
  await s3Request({ endpoint: parsedEndpoint, bucket, key: objectKey, method: "PUT", body: archive, contentType: "application/octet-stream", accessKeyId, secretAccessKey, fetchImpl, now });
  await s3Request({ endpoint: parsedEndpoint, bucket, key: checksumKey, method: "PUT", body: checksum, contentType: "text/plain; charset=utf-8", accessKeyId, secretAccessKey, fetchImpl, now });
  const uploadedArchive = await s3Request({ endpoint: parsedEndpoint, bucket, key: objectKey, method: "GET", accessKeyId, secretAccessKey, fetchImpl, now });
  const downloadedArchive = Buffer.from(await uploadedArchive.arrayBuffer());
  if (sha256(downloadedArchive) !== archiveSha256) throw new Error("R2_ARCHIVE_CORRUPTED");
  const uploadedChecksum = await s3Request({ endpoint: parsedEndpoint, bucket, key: checksumKey, method: "GET", accessKeyId, secretAccessKey, fetchImpl, now });
  if ((await uploadedChecksum.text()).trim() !== checksum.trim()) throw new Error("R2_CHECKSUM_CORRUPTED");
  return { archiveSha256, objectKey, checksumKey };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  try {
    const result = await publishBackupToR2({
      archivePath: args.get("archive"),
      checksumPath: args.get("checksum"),
      endpoint: process.env.SUPABASE_BACKUP_R2_ENDPOINT,
      bucket: process.env.SUPABASE_BACKUP_R2_BUCKET,
      objectKey: process.env.SUPABASE_BACKUP_R2_OBJECT_KEY,
      accessKeyId: process.env.SUPABASE_BACKUP_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY,
    });
    console.log(`BACKUP_CREATED: archive_sha256=${result.archiveSha256}`);
  } catch (error) {
    console.error(`R2_BACKUP: FAIL classification=${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
