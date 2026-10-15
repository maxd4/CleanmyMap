import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  buildProfileSelect,
  detectProfileProjectionColumns,
  formatAuditSummaryLog,
  resolveStoredActiveRole,
  resolveStoredRoleLabel,
} from "./audit-clerk-supabase.mjs";

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

  it("keeps active role compatibility separate from granted role attribution", () => {
    assert.equal(resolveStoredActiveRole({
      metadataActiveRole: "admin",
      storedRole: "elu",
    }), "elu");
    assert.equal(resolveStoredActiveRole({
      metadataActiveRole: "admin",
      storedRole: "admin",
    }), "admin");
    assert.equal(resolveStoredActiveRole({
      metadataActiveRole: "activeProfileLegacyAdmin",
      storedRole: "admin",
    }), "admin");
  });

  it("audits a pre-migration profiles schema without selecting absent projection columns", async () => {
    const client = {
      from() {
        return {
          select(selection) {
            return {
              async limit() {
                return selection.includes("role_projection_source")
                  ? { error: { code: "42703", message: "column does not exist" } }
                  : { error: { code: "42703", message: "column does not exist" } };
              },
            };
          },
        };
      },
    };

    const result = await detectProfileProjectionColumns(client);
    assert.deepEqual(result.status, {
      role_projection_source: "absent",
      role_projection_synced_at: "absent",
    });
    assert.equal(buildProfileSelect(result.available).includes("role_projection_source"), false);
    assert.equal(buildProfileSelect(result.available).includes("role_projection_synced_at"), false);
  });

  it("keeps projection columns in the audit after the migration is applied", () => {
    const select = buildProfileSelect();
    assert.match(select, /role_projection_source/);
    assert.match(select, /role_projection_synced_at/);
  });

  it("projects only generated counters and safe statuses into the audit log", () => {
    const logLine = formatAuditSummaryLog({
      generatedAt: "2026-10-15T16:00:00Z\nforged-entry",
      clerk: { totalCount: "42\nforged-entry", count: 2 },
      supabase: {
        profiles: 3,
        profileProjectionColumns: {
          role_projection_source: "present",
          role_projection_synced_at: "forged\nstatus",
          injected: "present",
        },
        progressionProfiles: 4,
        progressionEvents: 5,
        checklistProgress: 6,
        funnelEvents: 7,
      },
      counts: {
        unionUsers: 8,
        missingProfiles: 1,
        orphanProfiles: 0,
        roleMismatches: 0,
        legacyActivityOnly: 0,
        legacyPrivilegedMetadata: 0,
        imuOwnerConfigured: true,
      },
    });

    assert.doesNotMatch(logLine, /forged|\n|\r/);
    assert.match(logLine, /"totalCount":null/);
    assert.match(logLine, /"role_projection_source":"present"/);
    assert.doesNotMatch(logLine, /injected|role_projection_synced_at/);
  });
});
