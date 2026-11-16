import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}

function normalizedS3ErrorCode(status) {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "ACCESS_DENIED";
  if (status === 404) return "NOT_FOUND";
  if (status === 412) return "OBJECT_COLLISION";
  if (status >= 500) return "TRANSFER_FAILED";
  return `HTTP_${status}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function normalizedSdkErrorCode(error, status) {
  const raw = String(error?.Code ?? error?.code ?? error?.name ?? "UNKNOWN").replace(/[^A-Za-z0-9_-]/g, "_");
  if (raw !== "UNKNOWN") return raw;
  return normalizedS3ErrorCode(status);
}

function sdkError(method, error) {
  const status = error?.$metadata?.httpStatusCode ?? null;
  const code = normalizedSdkErrorCode(error, status);
  const classification = status === 412 || code === "PreconditionFailed"
    ? "R2_OBJECT_COLLISION"
    : status === 403 || code === "AccessDenied"
      ? "R2_ACCESS_DENIED"
      : status !== null && status >= 500
        ? "R2_TRANSFER_FAILED"
        : `R2_${method}_FAILED`;
  const diagnosticStatus = status ?? "UNKNOWN";
  const diagnostic = new Error(`${classification} method=${method} status=${diagnosticStatus} code=${code}`);
  diagnostic.cause = error;
  return diagnostic;
}

async function readObjectBody(body) {
  if (body?.transformToByteArray) return Buffer.from(await body.transformToByteArray());
  if (body?.transformToString) return Buffer.from(await body.transformToString(), "utf8");
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function s3Request(client, command, method) {
  try {
    return await client.send(command);
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode ?? null;
    if (status === 404 && method === "HEAD") return null;
    throw sdkError(method, error);
  }
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
  clientFactory = (configuration) => new S3Client(configuration),
}) {
  const parsedEndpoint = validateEndpoint(endpoint, allowInsecureEndpoint);
  validateInputs({ bucket, key: objectKey, accessKeyId, secretAccessKey });
  const client = clientFactory({
    endpoint: parsedEndpoint.toString().replace(/\/$/, ""),
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  try {
    const archive = await readFile(archivePath);
    const checksum = await readFile(checksumPath, "utf8");
    const archiveSha256 = sha256(archive);
    if (checksumFromFile(checksum) !== archiveSha256) throw new Error("CHECKSUM_LOCAL_MISMATCH");
    const checksumKey = `${objectKey}.sha256`;
    const existingArchive = await s3Request(client, new HeadObjectCommand({ Bucket: bucket, Key: objectKey }), "HEAD");
    const existingChecksum = await s3Request(client, new HeadObjectCommand({ Bucket: bucket, Key: checksumKey }), "HEAD");
    if (existingArchive || existingChecksum) throw new Error("R2_OBJECT_COLLISION");
    await s3Request(client, new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: archive,
      ContentType: "application/octet-stream",
      IfNoneMatch: "*",
    }), "PUT");
    await s3Request(client, new PutObjectCommand({
      Bucket: bucket,
      Key: checksumKey,
      Body: checksum,
      ContentType: "text/plain; charset=utf-8",
      IfNoneMatch: "*",
    }), "PUT");
    const uploadedArchive = await s3Request(client, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), "GET");
    const downloadedArchive = await readObjectBody(uploadedArchive.Body);
    if (sha256(downloadedArchive) !== archiveSha256) throw new Error("R2_ARCHIVE_CORRUPTED");
    const uploadedChecksum = await s3Request(client, new GetObjectCommand({ Bucket: bucket, Key: checksumKey }), "GET");
    const downloadedChecksum = (await readObjectBody(uploadedChecksum.Body)).toString("utf8");
    if (downloadedChecksum.trim() !== checksum.trim()) throw new Error("R2_CHECKSUM_CORRUPTED");
    return { archiveSha256, objectKey, checksumKey };
  } finally {
    client.destroy?.();
  }
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
    const classification = error instanceof Error ? error.message : "unknown";
    console.error(`R2_BACKUP: FAIL classification=${classification}`);
    process.exitCode = 1;
  }
}
