import assert from "node:assert/strict";
import path from "node:path";
import { normaliseUser, resolveOutputBasePath, toCsv } from "./export-clerk-users.mjs";

const user = normaliseUser({
  id: "user_123",
  username: "maxence",
  firstName: "Maxence",
  lastName: "Dupont",
  createdAt: "2026-05-24T12:34:56Z",
  updatedAt: "2026-05-25T12:34:56Z",
  lastSignInAt: "2026-05-26T12:34:56Z",
  publicMetadata: { role: "admin" },
  privateMetadata: { token: "secret" },
  unsafeMetadata: { latitude: 48.8566, longitude: 2.3522 },
  emailAddresses: [{ emailAddress: "maxence@example.com" }],
});

assert.deepEqual(user, {
  id: "user_123",
  username: "maxence",
  firstName: "Maxence",
  lastName: "Dupont",
  primaryEmail: "maxence@example.com",
  createdAt: "2026-05-24T12:34:56.000Z",
  updatedAt: "2026-05-25T12:34:56.000Z",
  lastSignInAt: "2026-05-26T12:34:56.000Z",
  publicMetadata: { role: "admin" },
});

assert.deepEqual(
  resolveOutputBasePath("artifacts/clerk-users"),
  path.resolve("artifacts/clerk-users"),
);

assert.throws(
  () => resolveOutputBasePath("../outside"),
  /within the current workspace/,
);

const csv = toCsv([user]);
assert.match(csv, /publicMetadata/);
assert.doesNotMatch(csv, /privateMetadata|unsafeMetadata|emailAddresses/);

console.log("export-clerk-users validation passed");
