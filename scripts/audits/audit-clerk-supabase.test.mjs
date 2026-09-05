import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  parseAdminUserIds,
  resolveStoredRoleLabel,
} from "./audit-clerk-supabase.mjs";

describe("audit-clerk-supabase role contract", () => {
  it("uses only the configured max user id for max", () => {
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "max-user",
      adminUserIds: parseAdminUserIds("admin-user"),
      maxUserIds: parseAdminUserIds("max-user"),
    }), "max");
  });

  it("accepts canonical max metadata but ignores email-shaped identity", () => {
    const context = {
      userId: "other",
      adminUserIds: parseAdminUserIds("secondary"),
      maxUserIds: parseAdminUserIds("max-user"),
    };

    assert.equal(resolveStoredRoleLabel({ ...context, metadataRole: null }), "benevole");
    assert.equal(resolveStoredRoleLabel({ ...context, metadataRole: "max" }), "max");
  });

  it("uses the configured admin user id for admin", () => {
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "admin-user",
      adminUserIds: parseAdminUserIds("admin-user"),
      maxUserIds: parseAdminUserIds("max-user"),
    }), "admin");
  });
});
