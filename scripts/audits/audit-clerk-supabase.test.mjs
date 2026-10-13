import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { resolveStoredRoleLabel } from "./audit-clerk-supabase.mjs";

describe("audit-clerk-supabase canonical role contract", () => {
  it("requires canonical max metadata and the exact owner id", () => {
    assert.equal(resolveStoredRoleLabel({
      metadataRole: "max",
      userId: "owner-user",
      imuOwnerUserId: "owner-user",
    }), "max");
    assert.equal(resolveStoredRoleLabel({
      metadataRole: "max",
      userId: "other-user",
      imuOwnerUserId: "owner-user",
    }), "benevole");
    assert.equal(resolveStoredRoleLabel({
      metadataRole: "max",
      userId: "owner-user",
      imuOwnerUserId: null,
    }), "benevole");
  });

  it("does not attribute admin or max from old allowlist-shaped inputs", () => {
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "admin-user",
      imuOwnerUserId: "owner-user",
    }), "benevole");
    assert.equal(resolveStoredRoleLabel({
      metadataRole: "admin",
      userId: "admin-user",
      imuOwnerUserId: "owner-user",
    }), "admin");
    assert.equal(resolveStoredRoleLabel({
      metadataRole: "imu",
      userId: "owner-user",
      imuOwnerUserId: "owner-user",
    }), "benevole");
  });
});
