import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publishBackupToR2 } from "./publish-supabase-backup-r2.mjs";

const required = [
  "SUPABASE_BACKUP_R2_ENDPOINT",
  "SUPABASE_BACKUP_R2_BUCKET",
  "SUPABASE_BACKUP_R2_ACCESS_KEY_ID",
  "SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY",
];
const enabled = process.env.R2_CONNECTION_TEST_REQUIRED === "1";

test("authenticated R2 connection uploads and reads a synthetic object", { skip: !enabled }, async () => {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`R2_CONNECTION_CONFIGURATION_MISSING names=${missing.join(",")}`);

  const root = await mkdtemp(join(tmpdir(), "cmm-r2-connection-proof-"));
  const archivePath = join(root, "synthetic-r2-connection.bin");
  const checksumPath = join(root, "synthetic-r2-connection.bin.sha256");
  const payload = Buffer.from("CleanMyMap synthetic R2 connection proof\n", "utf8");
  const digest = createHash("sha256").update(payload).digest("hex");
  const runId = process.env.GITHUB_RUN_ID || `local-${Date.now()}`;
  const sha = process.env.GITHUB_SHA || "worktree";
  const objectKey = `connection-probes/${sha}/${runId}-${process.pid}.bin`;

  try {
    await writeFile(archivePath, payload);
    await writeFile(checksumPath, `${digest}  synthetic-r2-connection.bin\n`);
    const result = await publishBackupToR2({
      archivePath,
      checksumPath,
      endpoint: process.env.SUPABASE_BACKUP_R2_ENDPOINT,
      bucket: process.env.SUPABASE_BACKUP_R2_BUCKET,
      objectKey,
      accessKeyId: process.env.SUPABASE_BACKUP_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.SUPABASE_BACKUP_R2_SECRET_ACCESS_KEY,
    });
    if (result.archiveSha256 !== digest) throw new Error("R2_CONNECTION_HASH_MISMATCH");
    console.log(`R2_CONNECTION_VERIFIED method=HEAD,PUT,GET status=2xx code=OK object_key=${objectKey}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

if (enabled) {
  for (const name of required) {
    if (process.env[name]?.includes("\n") || process.env[name]?.includes("\r")) {
      throw new Error(`R2_CONNECTION_CONFIGURATION_INVALID name=${name}`);
    }
  }
}
