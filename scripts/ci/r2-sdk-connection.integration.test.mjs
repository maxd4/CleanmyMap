import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const required = [
  "SUPABASE_BACKUP_R2_ENDPOINT",
  "SUPABASE_BACKUP_R2_BUCKET",
  "SUPABASE_BACKUP_R2_ACCESS_KEY_ID",
  "SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY",
];

function normalizedError(error) {
  const status = error?.$metadata?.httpStatusCode ?? null;
  const code = String(error?.Code ?? error?.code ?? error?.name ?? "UNKNOWN").replace(/[^A-Za-z0-9_-]/g, "_");
  return { method: "HEAD", status, code };
}

test("official S3 SDK authenticates against an intentionally missing R2 object", async (t) => {
  if (process.env.R2_CONNECTION_TEST_REQUIRED !== "1") {
    t.skip("protected R2 credentials are required for this integration proof");
    return;
  }
  for (const name of required) assert.ok(process.env[name], `${name} is required`);
  const { HeadObjectCommand, S3Client } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    endpoint: process.env.SUPABASE_BACKUP_R2_ENDPOINT,
    region: "auto",
    credentials: {
      accessKeyId: process.env.SUPABASE_BACKUP_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY,
    },
  });
  const key = `connection-probes/sdk-missing-${process.env.GITHUB_RUN_ID ?? randomUUID()}.bin`;

  try {
    await client.send(new HeadObjectCommand({
      Bucket: process.env.SUPABASE_BACKUP_R2_BUCKET,
      Key: key,
    }));
    assert.fail("the synthetic object unexpectedly exists");
  } catch (error) {
    const diagnostic = normalizedError(error);
    process.stdout.write(`R2_SDK_PROBE: method=HEAD status=${diagnostic.status ?? "UNKNOWN"} code=${diagnostic.code}\n`);
    assert.equal(diagnostic.status, 404, "the official SDK must reach R2 and receive NoSuchKey");
    assert.match(diagnostic.code, /NoSuchKey|NotFound/);
  } finally {
    client.destroy();
  }
});
