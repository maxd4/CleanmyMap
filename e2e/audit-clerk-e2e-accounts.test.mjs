import assert from "node:assert/strict";
import test from "node:test";
import { auditClerkE2EAccounts } from "./audit-clerk-e2e-accounts.mjs";

test("the read-only audit paginates and reports strict E2E candidates without personal data", async () => {
  const calls = [];
  const client = {
    users: {
      getUserList: async ({ limit, offset }) => {
        calls.push({ limit, offset });
        if (offset === 0) return {
          data: Array.from({ length: 100 }, (_, index) => ({ id: `human-${index}`, publicMetadata: {}, emailAddresses: [] })),
          totalCount: 101,
        };
        return {
          data: [
            { id: "marked-temp", createdAt: 1, firstName: "private", publicMetadata: { cleanmymapE2E: true, cleanmymapOwner: "cleanmymap-playwright", cleanmymapLifecycle: "TEMPORARY" }, emailAddresses: [{ emailAddress: "cmm-e2e-old+clerk_test@example.com" }] },
            { id: "marked-persistent", createdAt: 2, emailAddresses: [], publicMetadata: { cleanmymapE2E: true, cleanmymapLifecycle: "PERSISTENT_DEVELOPMENT" } },
            { id: "legacy-alias", emailAddresses: [{ emailAddress: "cmm-e2e-legacy+clerk_test@example.com" }], publicMetadata: {} },
          ],
          totalCount: 103,
        };
      },
    },
  };

  const report = await auditClerkE2EAccounts(client);

  assert.deepEqual(calls, [{ limit: 100, offset: 0 }, { limit: 100, offset: 100 }]);
  assert.equal(report.readOnly, true);
  assert.equal(report.complete, true);
  assert.equal(report.scannedUsers, 103);
  assert.deepEqual(report.candidates.map(({ id, classification }) => ({ id, classification })), [
    { id: "marked-temp", classification: "TEMPORARY_MARKED" },
    { id: "marked-persistent", classification: "PERSISTENT_DEVELOPMENT_MARKED" },
    { id: "legacy-alias", classification: "LEGACY_TEST_ALIAS" },
  ]);
  assert.doesNotMatch(JSON.stringify(report), /private|@example\.com/);
});

test("the audit fails instead of presenting a truncated result after its page bound", async () => {
  const client = { users: { getUserList: async () => ({ data: Array.from({ length: 100 }, (_, index) => ({ id: String(index), publicMetadata: {} })), totalCount: 20_000 }) } };
  await assert.rejects(auditClerkE2EAccounts(client), /page bound/);
});
