import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  isExclusiveMaxUserId,
  parseAdminUserIds,
  parseMaxUserIds,
  resolveStoredRoleLabel,
} from "./audit-clerk-supabase.mjs";

describe("audit-clerk-supabase role contract", () => {
  it("keeps the max allowlist independent from the admin allowlist", () => {
    const adminIds = parseAdminUserIds("secondary");
    const maxIds = parseMaxUserIds("");

    assert.equal(isExclusiveMaxUserId("secondary", maxIds, adminIds), false);
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "secondary",
      email: null,
      adminUserIds: adminIds,
      maxUserIds: maxIds,
      creatorInboxEmail: null,
    }), "admin");
  });

  it("does not let an active profile influence the stored role audit", () => {
    const context = {
      userId: "principal",
      email: null,
      adminUserIds: parseAdminUserIds("secondary"),
      maxUserIds: parseMaxUserIds("principal"),
      creatorInboxEmail: null,
    };

    assert.equal(resolveStoredRoleLabel({ ...context, metadataRole: "max", activeProfile: "benevole" }), "max");
    assert.equal(resolveStoredRoleLabel({ ...context, userId: "secondary", metadataRole: "admin", activeProfile: "max" }), "admin");
  });

  it("fails closed to admin when allowlists intersect", () => {
    const adminIds = parseAdminUserIds("secondary, principal");
    const maxIds = parseMaxUserIds("principal");

    assert.equal(isExclusiveMaxUserId("principal", maxIds, adminIds), false);
    assert.equal(resolveStoredRoleLabel({
      metadataRole: null,
      userId: "principal",
      email: null,
      adminUserIds: adminIds,
      maxUserIds: maxIds,
      creatorInboxEmail: null,
    }), "admin");
  });
});
