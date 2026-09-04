import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  parseAdminUserIds,
  resolveStoredRoleLabel,
} from "./audit-clerk-supabase.mjs";

describe("audit-clerk-supabase role contract", () => {
  it("uses only the configured owner identity for max", () => {
    const adminIds = parseAdminUserIds("secondary");

    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "owner",
      email: "owner@example.test",
      primaryEmailVerified: true,
      adminUserIds: adminIds,
      ownerUserId: "owner",
      ownerEmail: "owner@example.test",
    }), "max");
  });

  it("rejects metadata, creator email and Supabase-shaped identity as IMU", () => {
    const context = {
      userId: "other",
      email: "creator@example.test",
      primaryEmailVerified: true,
      adminUserIds: parseAdminUserIds("secondary"),
      ownerUserId: "owner",
      ownerEmail: "owner@example.test",
    };

    assert.equal(resolveStoredRoleLabel({ ...context, metadataRole: "max" }), "benevole");
    assert.equal(resolveStoredRoleLabel({ ...context, metadataRole: "max", email: "owner@example.test" }), "benevole");
  });

  it("does not let an admin allowlist grant a role", () => {
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "secondary",
      email: null,
      primaryEmailVerified: false,
      adminUserIds: parseAdminUserIds("secondary"),
      ownerUserId: "owner",
      ownerEmail: "owner@example.test",
    }), "benevole");
  });
});
