import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { publishBackupToR2 } from "./publish-supabase-backup-r2.mjs";

const credentials = { accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" };

async function withFakeR2(mode, callback) {
  const objects = new Map();
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const body = [];
    request.on("data", (chunk) => body.push(chunk));
    request.on("end", () => {
      if (mode === "transfer-failure" && request.method === "PUT") {
        response.writeHead(503).end();
        return;
      }
      if (request.method === "HEAD") {
        if (mode.startsWith("head-")) {
          const status = Number(mode.slice("head-".length));
          response.writeHead(status).end();
          return;
        }
        response.writeHead(objects.has(path) ? 200 : 404).end();
        return;
      }
      if (request.method === "PUT") {
        if (objects.has(path) || request.headers["if-none-match"] !== "*") {
          response.writeHead(412).end();
          return;
        }
        objects.set(path, Buffer.concat(body));
        response.writeHead(200).end();
        return;
      }
      if (request.method === "GET") {
        const stored = objects.get(path);
        if (!stored) {
          response.writeHead(404).end();
          return;
        }
        const output = mode === "corruption" && !path.endsWith(".sha256") ? Buffer.from("corrupted") : stored;
        response.writeHead(200, { "content-length": output.length }).end(output);
        return;
      }
      response.writeHead(405).end();
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await callback({ endpoint: `http://127.0.0.1:${server.address().port}`, objects });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "cmm-r2-backup-"));
  const archivePath = join(root, "backup.tar.gpg");
  const checksumPath = join(root, "backup.tar.gpg.sha256");
  const archive = Buffer.from("encrypted synthetic backup\n");
  const digest = (await import("node:crypto")).createHash("sha256").update(archive).digest("hex");
  await writeFile(archivePath, archive);
  await writeFile(checksumPath, `${digest}  backup.tar.gpg\n`);
  return { root, archivePath, checksumPath };
}

async function publish(endpoint, fixture, objectKey = "monthly/2026/11/run-1.tar.gpg") {
  return publishBackupToR2({
    ...credentials,
    ...fixture,
    endpoint,
    bucket: "cmm-private-backups",
    objectKey,
    allowInsecureEndpoint: true,
    now: new Date("2026-11-01T02:17:00.000Z"),
  });
}

test("uploads archive and checksum, then verifies the exact archive hash from fake R2", async () => {
  const fixture = await createFixture();
  try {
    await withFakeR2("healthy", async ({ endpoint, objects }) => {
      const result = await publish(endpoint, fixture);
      assert.match(result.archiveSha256, /^[0-9a-f]{64}$/);
      assert.equal(objects.size, 2);
      assert.ok(objects.has("/cmm-private-backups/monthly/2026/11/run-1.tar.gpg"));
      assert.ok(objects.has("/cmm-private-backups/monthly/2026/11/run-1.tar.gpg.sha256"));
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("rejects an existing archive or checksum without overwriting it", async () => {
  const fixture = await createFixture();
  try {
    await withFakeR2("healthy", async ({ endpoint, objects }) => {
      objects.set("/cmm-private-backups/monthly/2026/11/run-1.tar.gpg", Buffer.from("existing"));
      await assert.rejects(publish(endpoint, fixture), /R2_OBJECT_COLLISION/);
      assert.equal((await readFile(fixture.archivePath)).toString(), "encrypted synthetic backup\n");
      assert.equal(objects.get("/cmm-private-backups/monthly/2026/11/run-1.tar.gpg").toString(), "existing");
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fails closed on transfer failure and downloaded archive corruption", async (t) => {
  const fixture = await createFixture();
  try {
    await t.test("transfer failure", async () => {
      await withFakeR2("transfer-failure", async ({ endpoint }) => {
        await assert.rejects(publish(endpoint, fixture), /R2_TRANSFER_FAILED/);
      });
    });
    await t.test("archive corruption", async () => {
      await withFakeR2("corruption", async ({ endpoint }) => {
        await assert.rejects(publish(endpoint, fixture), /R2_ARCHIVE_CORRUPTED/);
      });
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("publishes normalized method, status, and code for HEAD S3 failures", async (t) => {
  const fixture = await createFixture();
  try {
    for (const [status, classification, code] of [[400, "R2_HEAD_FAILED", "BAD_REQUEST"], [401, "R2_HEAD_FAILED", "UNAUTHORIZED"], [403, "R2_ACCESS_DENIED", "ACCESS_DENIED"]]) {
      await t.test(`HEAD ${status}`, async () => {
        await withFakeR2(`head-${status}`, async ({ endpoint }) => {
          await assert.rejects(
            publish(endpoint, fixture),
            new RegExp(`${classification} method=HEAD status=${status} code=${code}`),
          );
        });
      });
    }
    await t.test("HEAD 404 remains the non-existent-object path", async () => {
      await withFakeR2("head-404", async ({ endpoint, objects }) => {
        await publish(endpoint, fixture);
        assert.equal(objects.size, 2);
      });
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
