import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { publishBackupToR2 } from "./publish-supabase-backup-r2.mjs";

const credentials = { accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" };

function sdkError(status, code = "S3Error") {
  const error = new Error(code);
  error.name = code;
  error.$metadata = { httpStatusCode: status };
  return error;
}

function createFakeClient(mode = "healthy") {
  const objects = new Map();
  const calls = [];
  return {
    objects,
    calls,
    clientFactory: (configuration) => {
      assert.equal(configuration.region, "auto");
      assert.equal(configuration.requestChecksumCalculation, "WHEN_REQUIRED");
      assert.equal(configuration.responseChecksumValidation, "WHEN_REQUIRED");
      return {
        async send(command) {
          const { Bucket, Key, Body, IfNoneMatch } = command.input;
          const method = command.constructor.name.replace("Command", "");
          calls.push({ method, Bucket, Key, IfNoneMatch });
          const objectId = `${Bucket}/${Key}`;
          if (method === "HeadObject") {
            if (mode.startsWith("head-")) throw sdkError(Number(mode.slice(5)), "HeadError");
            if (!objects.has(objectId)) throw sdkError(404, "NotFound");
            return { ContentLength: objects.get(objectId).length };
          }
          if (method === "PutObject") {
            if (mode === "transfer-failure") throw sdkError(503, "ServiceUnavailable");
            if (IfNoneMatch !== "*" || objects.has(objectId)) throw sdkError(412, "PreconditionFailed");
            objects.set(objectId, Buffer.from(Body));
            return {};
          }
          if (method === "GetObject") {
            if (!objects.has(objectId)) throw sdkError(404, "NoSuchKey");
            const body = mode === "corruption" && !Key.endsWith(".sha256")
              ? Buffer.from("corrupted")
              : objects.get(objectId);
            return { Body: {
              async transformToByteArray() { return new Uint8Array(body); },
            } };
          }
          throw new Error(`UNEXPECTED_COMMAND_${method}`);
        },
        destroy() {},
      };
    },
  };
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "cmm-r2-backup-"));
  const archivePath = join(root, "backup.tar.gpg");
  const checksumPath = join(root, "backup.tar.gpg.sha256");
  const archive = Buffer.from("encrypted synthetic backup\n");
  const digest = createHash("sha256").update(archive).digest("hex");
  await writeFile(archivePath, archive);
  await writeFile(checksumPath, `${digest}  backup.tar.gpg\n`);
  return { root, archivePath, checksumPath };
}

async function publish(fake, fixture, objectKey = "monthly/2026/11/run-1.tar.gpg") {
  return publishBackupToR2({
    ...credentials,
    ...fixture,
    endpoint: "https://account-id.eu.r2.cloudflarestorage.com",
    bucket: "cmm-private-backups",
    objectKey,
    clientFactory: fake.clientFactory,
  });
}

test("uploads archive and checksum, then verifies exact hashes through SDK commands", async () => {
  const fixture = await createFixture();
  try {
    const fake = createFakeClient();
    const result = await publish(fake, fixture);
    assert.match(result.archiveSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(fake.calls.map(({ method }) => method), ["HeadObject", "HeadObject", "PutObject", "PutObject", "GetObject", "GetObject"]);
    assert.equal(fake.calls.filter(({ method }) => method === "PutObject").every(({ IfNoneMatch }) => IfNoneMatch === "*"), true);
    assert.equal(fake.objects.size, 2);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("rejects an existing archive or checksum without overwriting it", async () => {
  const fixture = await createFixture();
  try {
    const fake = createFakeClient();
    fake.objects.set("cmm-private-backups/monthly/2026/11/run-1.tar.gpg", Buffer.from("existing"));
    await assert.rejects(publish(fake, fixture), /R2_OBJECT_COLLISION/);
    assert.equal((await readFile(fixture.archivePath)).toString(), "encrypted synthetic backup\n");
    assert.equal(fake.objects.get("cmm-private-backups/monthly/2026/11/run-1.tar.gpg").toString(), "existing");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fails closed on transfer failure and downloaded archive corruption", async (t) => {
  const fixture = await createFixture();
  try {
    await t.test("transfer failure", async () => {
      await assert.rejects(publish(createFakeClient("transfer-failure"), fixture), /R2_TRANSFER_FAILED/);
    });
    await t.test("archive corruption", async () => {
      await assert.rejects(publish(createFakeClient("corruption"), fixture), /R2_ARCHIVE_CORRUPTED/);
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("publishes normalized method, status, and code for SDK HEAD failures", async (t) => {
  const fixture = await createFixture();
  try {
    for (const [status, classification, code] of [[400, "R2_HEAD_FAILED", "HeadError"], [401, "R2_HEAD_FAILED", "HeadError"], [403, "R2_ACCESS_DENIED", "HeadError"]]) {
      await t.test(`HEAD ${status}`, async () => {
        await assert.rejects(
          publish(createFakeClient(`head-${status}`), fixture),
          new RegExp(`${classification} method=HEAD status=${status} code=${code}`),
        );
      });
    }
    await t.test("HEAD 404 remains the non-existent-object path", async () => {
      const fake = createFakeClient("head-404");
      await publish(fake, fixture);
      assert.equal(fake.objects.size, 2);
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
