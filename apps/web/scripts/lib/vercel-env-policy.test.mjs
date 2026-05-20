import assert from "node:assert/strict";
import {
  filterSyncableEnvEntries,
  isSensitiveEnvKey,
} from "./vercel-env-policy.mjs";

assert.equal(isSensitiveEnvKey("NEXT_PUBLIC_SUPABASE_URL"), false);
assert.equal(isSensitiveEnvKey("SUPABASE_SERVICE_ROLE_KEY"), true);
assert.equal(isSensitiveEnvKey("RESEND_TEST_TOKEN"), true);
assert.equal(isSensitiveEnvKey("CONTACT_EMAIL"), false);

const entries = [
  ["NEXT_PUBLIC_APP_URL", "https://cleanmymap.fr"],
  ["SUPABASE_SERVICE_ROLE_KEY", "super-secret"],
  ["CONTACT_EMAIL", "contact@cleanmymap.fr"],
  ["RESEND_TEST_TOKEN", "token-value"],
];

assert.deepEqual(filterSyncableEnvEntries(entries), [
  ["NEXT_PUBLIC_APP_URL", "https://cleanmymap.fr"],
  ["CONTACT_EMAIL", "contact@cleanmymap.fr"],
]);

assert.deepEqual(filterSyncableEnvEntries(entries, { includeSecrets: true }), entries);

console.log("vercel-env-policy validation passed");
