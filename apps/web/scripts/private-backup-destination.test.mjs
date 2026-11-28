import assert from "node:assert/strict";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validatePrivateBackupDestination } from "./private-backup-destination.mjs";

test("private backup destinations resolve physically and reject repository paths", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "cmm-private-backup-"));
  try {
    const repo = path.join(temp, "repo");
    const destination = path.join(temp, "outside");
    await Promise.all([mkdir(repo), mkdir(destination)]);
    await writeFile(path.join(destination, ".cmm-private-backup-destination"), "CLEANMYMAP PRIVATE BACKUP DESTINATION\n");
    assert.equal(await validatePrivateBackupDestination(destination, repo), await realpath(destination));
    await assert.rejects(validatePrivateBackupDestination(repo, repo), /outside the repository/);
    await assert.rejects(validatePrivateBackupDestination(path.join(temp, "missing"), repo));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
