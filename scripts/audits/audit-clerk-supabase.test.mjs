import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { describe, it } from "node:test";
import os from "node:os";
import path from "node:path";

import {
  buildRowSummary,
  buildProfileSelect,
  detectProfileProjectionColumns,
  fetchAllRows,
  fetchClerkUsers,
  formatAuditSummaryLog,
  loadEnvFiles,
  main,
  parseArgs,
  parseDotEnv,
  resolveStoredActiveRole,
  resolveStoredRoleLabel,
  resolveEnvValue,
  toCsv,
} from "./audit-clerk-supabase.mjs";
import { sanitizeLogValue } from "../security/safe-log-value.mjs";

async function withTempDir(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "cleanmymap-clerk-audit-test-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function response(body, { ok = true, status = 200, statusText = "OK" } = {}) {
  return {
    ok,
    status,
    statusText,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

function queryResult(result) {
  return {
    order() {
      return Promise.resolve(result);
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
}

function createSupabaseDouble({ tables = {}, projection = {}, errors = {}, calls = [] } = {}) {
  const client = {
    from(table) {
      return {
        select(selection) {
          return {
            async limit() {
              const projectionColumn = selection.includes("role_projection_source")
                ? "role_projection_source"
                : "role_projection_synced_at";
              return { error: projection[projectionColumn] ?? null };
            },
            range(from, to) {
              calls.push({ table, selection, from, to });
              return queryResult({
                data: tables[table] ?? [],
                error: errors[table] ?? null,
              });
            },
          };
        },
      };
    },
    schema(schemaName) {
      calls.push({ schema: schemaName });
      return client;
    },
  };
  return client;
}

function createMainFixture() {
  const calls = [];
  const supabase = createSupabaseDouble({
    calls,
    projection: {
      role_projection_source: null,
      role_projection_synced_at: { code: "42703", message: "column does not exist" },
    },
    tables: {
      profiles: [
        { id: "user-1", role_label: "admin", active_role_label: "admin", display_name: "Admin User", role_projection_source: "clerk_public_metadata_role" },
        { id: "user-3", role_label: "benevole", active_role_label: "benevole", display_name: "Mismatch User" },
        { id: "orphan", role_label: "benevole", active_role_label: null },
      ],
      progression_profiles: [{ user_id: "legacy-activity", current_level: 1, potential_level: 2, xp_total: 10, xp_validated: 5, xp_pending: 5 }],
      progression_events: [{ id: "event-1", user_id: "legacy-activity" }, { id: "event-invalid", user_id: null }],
      checklist_progress: [{ user_id: "legacy-activity" }, { user_id: "user-1" }],
      funnel_events: [{ id: "funnel-1", user_id: "legacy-activity" }],
    },
  });
  const pages = [
    {
      data: [
        {
          id: "user-1",
          firstName: "Admin",
          lastName: "User",
          publicMetadata: { role: "admin", activeRole: "admin" },
          primaryEmailAddress: { emailAddress: "admin-primary" },
        },
        {
          id: "user-2",
          firstName: "Missing",
          lastName: "Profile",
          publicMetadata: { role: "volunteer" },
        },
      ],
      total_count: 3,
    },
    {
      data: [{
        id: "user-3",
        firstName: "Mismatch",
        lastName: "User",
        publicMetadata: { role: "admin" },
        privateMetadata: { role: "admin" },
      }],
      total_count: 3,
    },
  ];
  return {
    calls,
    supabase,
    createSupabaseClient(url, key, options) {
      calls.push({ url, key, options });
      return supabase;
    },
    fetchImpl: async () => response(pages.shift()),
  };
}

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

  it("bounds and neutralizes external diagnostic values at the output boundary", () => {
    const externalPath = "artifacts/diagnostic\n\u001b[31mforged";
    const logLine = `JSON: ${sanitizeLogValue(externalPath)}`;

    assert.ok(logLine.length < 256);
    assert.doesNotMatch(logLine, /[\r\n\u0000-\u001f\u007f-\u009f]/);
    assert.match(logLine, /\\u000a/);
  });
});

describe("audit-clerk-supabase parsing, pagination and safe serialization", () => {
  it("parses CLI and dotenv values with runtime and file precedence", async () => {
    assert.deepEqual(parseArgs(["node", "audit", "--limit=25", "--out=tmp/report", "--unknown"]), {
      limit: 25,
      out: "tmp/report",
    });
    assert.deepEqual(parseArgs(["node", "audit"]), {
      limit: 500,
      out: path.join("artifacts", "audits", "clerk-supabase-audit"),
    });
    assert.deepEqual(parseDotEnv("# comment\n EMPTY=   \nCLERK_SECRET_KEY = 'file-key'\nQUOTED=\"value=with=equals\"\ninvalid\n"), {
      EMPTY: "",
      CLERK_SECRET_KEY: "file-key",
      QUOTED: "value=with=equals",
    });
    assert.equal(resolveEnvValue("KEY", { KEY: " from-file " }, { KEY: " runtime " }), "runtime");
    assert.equal(resolveEnvValue("KEY", { KEY: " from-file " }, {}), "from-file");
    assert.equal(resolveEnvValue("KEY", { KEY: "   " }, {}), null);
    await withTempDir(async (directory) => {
      const first = path.join(directory, "first.env");
      const second = path.join(directory, "second.env");
      await writeFile(first, "CLERK_SECRET_KEY=first\nEMPTY=\n");
      await writeFile(second, "CLERK_SECRET_KEY=second\nSUPABASE_SERVICE_ROLE_KEY=second-service\n");
      assert.deepEqual(await loadEnvFiles([first, path.join(directory, "missing.env"), second]), {
        CLERK_SECRET_KEY: "first",
        SUPABASE_SERVICE_ROLE_KEY: "second-service",
      });
    });
  });

  it("paginates Clerk responses without contacting the real API", async () => {
    const calls = [];
    const pages = [
      {
        data: [
          {
            id: "user-a",
            username: "alice",
            firstName: "Alice",
            lastName: "Audit",
            primaryEmailAddress: {
              emailAddress: "alice-primary",
              verification: { status: "verified" },
            },
            publicMetadata: {
              role: "admin",
              activeRole: "coordinator",
              badges: ["First", " first ", 3],
            },
            privateMetadata: { badges: ["Second"] },
            unsafeMetadata: {},
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: 0,
            lastSignInAt: "not-a-date",
            imageUrl: "https://example.test/alice.png",
            externalId: "external-a",
          },
          {
            id: "user-b",
            primary_email_address: { email_address: "bob-primary" },
            primary_email_address_id: "email-b",
            email_addresses: [{
              id: "email-b",
              email_address: "bob-primary",
              verification: { status: "verified" },
            }],
            public_metadata: { role: "owner", activeProfile: "company" },
            private_metadata: { role: "admin" },
            unsafe_metadata: { profile: "imu" },
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-02T00:00:00Z",
            last_sign_in_at: null,
            image_url: "https://example.test/bob.png",
            external_id: "external-b",
          },
        ],
        total_count: 3,
      },
      {
        users: [{
          id: "user-c",
          emailAddresses: [{ email_address: "carol-primary" }],
          public_metadata: { role: "volunteer", badges: "not-an-array" },
          private_metadata: {},
          unsafe_metadata: {},
          created_at: {},
        }],
        totalCount: 3,
      },
    ];
    const result = await fetchClerkUsers("synthetic-clerk-key", 2, async (url, options) => {
      calls.push({ url: String(url), options });
      return response(pages.shift());
    });

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /limit=2&offset=0/);
    assert.match(calls[1].url, /limit=2&offset=2/);
    assert.equal(calls[0].options.headers.Authorization, "Bearer synthetic-clerk-key");
    assert.equal(result.totalCount, 3);
    assert.equal(result.users.length, 3);
    assert.equal(result.users[0].primaryEmail, "alice-primary");
    assert.equal(result.users[0].primaryEmailVerified, true);
    assert.deepEqual(result.users[0].metadataBadgeIds, ["first", "second"]);
    assert.deepEqual(result.users[1].legacyPrivilegedMetadata, ["admin", "max"]);
    assert.equal(result.users[1].metadataActiveRole, "entreprise");
    assert.equal(result.users[2].primaryEmail, "carol-primary");
    assert.equal(result.users[2].createdAt, "[object Object]");
  });

  it("handles Clerk arrays, malformed payloads and refused responses deterministically", async () => {
    const arrayResult = await fetchClerkUsers("key", 10, async () => response([{ id: "array-user" }]));
    assert.deepEqual(arrayResult.users.map((user) => user.id), ["array-user"]);

    await assert.rejects(
      () => fetchClerkUsers("key", 10, async () => response({ unexpected: true })),
      /Clerk API response malformed/,
    );

    await assert.rejects(
      () => fetchClerkUsers("key", 10, async () => response("upstream refused", {
        ok: false,
        status: 403,
        statusText: "Forbidden",
      })),
      /Clerk API 403 Forbidden: upstream refused/,
    );
  });

  it("paginates Supabase rows, honors schema and reports query errors", async () => {
    const ranges = [];
    const client = {
      schema(name) {
        assert.equal(name, "analytics");
        return this;
      },
      from() {
        return {
          select() {
            return {
              range(from, to) {
                ranges.push([from, to]);
                const data = from === 0
                  ? Array.from({ length: 500 }, (_, index) => ({ id: `row-${index}` }))
                  : [{ id: "row-500" }];
                return queryResult({ data, error: null });
              },
            };
          },
        };
      },
    };
    const rows = await fetchAllRows(client, {
      schema: "analytics",
      table: "events",
      select: "id",
      orderColumn: "created_at",
    });
    assert.equal(rows.length, 501);
    assert.deepEqual(ranges, [[0, 499], [500, 999]]);

    await assert.rejects(
      () => fetchAllRows(createSupabaseDouble({ errors: { events: { message: "permission denied" } } }), {
        table: "events",
        select: "id",
      }),
      /public\.events fetch failed: permission denied/,
    );
  });
});

describe("audit-clerk-supabase projection and reconciliation", () => {
  it("detects present, absent and failed optional projections", async () => {
    const partial = await detectProfileProjectionColumns(createSupabaseDouble({
      projection: {
        role_projection_source: null,
        role_projection_synced_at: { code: "PGRST204", message: "column does not exist" },
      },
    }));
    assert.deepEqual(partial, {
      available: ["role_projection_source"],
      status: {
        role_projection_source: "present",
        role_projection_synced_at: "absent",
      },
    });
    assert.match(buildProfileSelect(partial.available), /role_projection_source/);
    assert.doesNotMatch(buildProfileSelect(partial.available), /role_projection_synced_at/);

    await assert.rejects(
      () => detectProfileProjectionColumns(createSupabaseDouble({
        projection: {
          role_projection_source: { code: "42501", message: "permission denied" },
        },
      })),
      /profiles\.role_projection_source capability probe failed: permission denied/,
    );
  });

  it("classifies complete, missing, orphan, mismatch, legacy and empty identities", () => {
    const clerk = {
      id: "user-1",
      metadataRole: "admin",
      metadataActiveRole: "admin",
      primaryEmail: "user-primary",
      firstName: "User",
      lastName: "One",
      username: "user-one",
      metadataBadgeIds: ["badge"],
      legacyPrivilegedMetadata: [],
    };
    const context = { imuOwnerUserId: "owner-user" };
    const ok = buildRowSummary({
      id: "user-1",
      clerkUser: clerk,
      profileRow: { role_label: "admin", active_role_label: "admin", display_name: "User One" },
      progressionProfile: { current_level: 2 },
      progressionEventsCount: 2,
      checklistCount: 1,
      funnelCount: 1,
      context,
    });
    assert.equal(ok.status, "ok");
    assert.equal(ok.role_match, true);
    assert.equal(ok.active_role_match, true);
    assert.deepEqual(ok.derived_badges, ["role_admin", "profile_admin"]);

    assert.equal(buildRowSummary({ id: "missing", clerkUser: clerk, profileRow: null, context }).status, "missing_profile");
    assert.equal(buildRowSummary({ id: "orphan", clerkUser: null, profileRow: { role_label: "benevole" }, context }).status, "orphan_profile");
    assert.equal(buildRowSummary({
      id: "mismatch",
      clerkUser: { ...clerk, metadataRole: "admin", metadataActiveRole: "admin" },
      profileRow: { role_label: "benevole", active_role_label: "scientifique" },
      context,
    }).status, "role_mismatch");
    assert.equal(buildRowSummary({
      id: "legacy",
      clerkUser: null,
      profileRow: null,
      progressionEventsCount: 1,
      checklistCount: 0,
      funnelCount: 0,
      context,
    }).status, "legacy_activity_only");
    assert.equal(buildRowSummary({ id: "empty", clerkUser: null, profileRow: null, context }).status, "empty");
  });

  it("keeps missing values distinct from zero and escapes CSV fields", () => {
    const csv = toCsv([{
      id: "user-1",
      status: "ok",
      clerk_present: true,
      supabase_profile_present: true,
      clerk_email: "quoted-primary",
      clerk_username: "line\nuser",
      clerk_display_name: "Name",
      clerk_metadata_role: "admin",
      legacy_privileged_metadata: ["max"],
      clerk_active_role: "admin",
      clerk_metadata_badges: [],
      derived_badges: ["role_admin"],
      expected_app_profile: "admin",
      expected_role_label: "admin",
      supabase_role_label: "admin",
      role_match: true,
      expected_active_role: "admin",
      supabase_active_role_label: "admin",
      active_role_match: true,
      supabase_role_projection_source: "",
      supabase_role_projection_synced_at: "",
      profile_display_name: "",
      profile_handle: "",
      profile_arrondissement: "",
      profile_updated_at: "",
      progression_current_level: "",
      progression_potential_level: "",
      progression_xp_total: 0,
      progression_xp_validated: "",
      progression_xp_pending: "",
      progression_events_count: 0,
      checklist_progress_count: 0,
      funnel_events_count: 0,
      clerk_created_at: "",
      clerk_updated_at: "",
      clerk_last_sign_in_at: "",
    }]);
    assert.match(csv, /"quoted-primary"/);
    assert.match(csv, /"line\nuser"/);
    assert.match(csv, /"0","","","0","0","0",""/);
  });
});

describe("audit-clerk-supabase orchestration", () => {
  it("fails closed before any network or Supabase client call when credentials are absent", async () => {
    let networkCalls = 0;
    let clientCalls = 0;
    await withTempDir(async (directory) => {
      await assert.rejects(
        () => main({
          argv: ["node", "audit", "--limit=0"],
          env: {},
          envFileCandidates: [path.join(directory, "missing.env")],
          fetchImpl: async () => {
            networkCalls += 1;
            return response([]);
          },
          createSupabaseClient: () => {
            clientCalls += 1;
            throw new Error("must not create client");
          },
        }),
        /Invalid --limit value: 0/,
      );
      await assert.rejects(
        () => main({
          argv: ["node", "audit"],
          env: {},
          envFileCandidates: [path.join(directory, "missing.env")],
          fetchImpl: async () => {
            networkCalls += 1;
            return response([]);
          },
          createSupabaseClient: () => {
            clientCalls += 1;
            throw new Error("must not create client");
          },
        }),
        /Missing CLERK_SECRET_KEY/,
      );
      await assert.rejects(
        () => main({
          argv: ["node", "audit"],
          env: { CLERK_SECRET_KEY: "synthetic-key" },
          envFileCandidates: [],
          fetchImpl: async () => {
            networkCalls += 1;
            return response([]);
          },
          createSupabaseClient: () => {
            clientCalls += 1;
            throw new Error("must not create client");
          },
        }),
        /Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/,
      );
    });
    assert.equal(networkCalls, 0);
    assert.equal(clientCalls, 0);
  });

  it("produces coherent JSON and CSV reports from synthetic Clerk and Supabase identities", async () => {
    await withTempDir(async (directory) => {
      const fixture = createMainFixture();
      const logs = [];
      const result = await main({
        argv: ["node", "audit", "--limit=2", "--out=artifacts/synthetic-audit"],
        env: {
          CLERK_SECRET_KEY: "synthetic-clerk-key",
          NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
          CLERK_IMU_OWNER_USER_ID: "owner-user",
        },
        envFileCandidates: [],
        createSupabaseClient: fixture.createSupabaseClient,
        fetchImpl: fixture.fetchImpl,
        outputCwd: directory,
        now: () => "2026-10-20T12:00:00.000Z",
        log: (line) => logs.push(line),
      });

      const json = JSON.parse(await readFile(`${result.outputBase}.json`, "utf8"));
      const csv = await readFile(`${result.outputBase}.csv`, "utf8");
      assert.equal(json.summary.generatedAt, "2026-10-20T12:00:00.000Z");
      assert.deepEqual(json.summary.counts, {
        unionUsers: 5,
        missingProfiles: 1,
        orphanProfiles: 1,
        roleMismatches: 1,
        legacyActivityOnly: 1,
        legacyPrivilegedMetadata: 1,
        imuOwnerConfigured: true,
      });
      assert.equal(json.summary.supabase.profileProjectionColumns.role_projection_source, "present");
      assert.equal(json.summary.supabase.profileProjectionColumns.role_projection_synced_at, "absent");
      assert.equal(json.findings.missingProfiles[0].id, "user-2");
      assert.equal(json.findings.orphanProfiles[0].id, "orphan");
      assert.equal(json.findings.roleMismatches[0].id, "user-3");
      assert.equal(json.findings.legacyActivityOnly[0].id, "legacy-activity");
      assert.match(csv, /id,status,clerk_present/);
      assert.match(csv, /"user-2","missing_profile"/);
      assert.match(csv, /"legacy-activity","legacy_activity_only"/);
      assert.equal(fixture.calls.filter((call) => call.url).length, 1);
      assert.equal(fixture.calls.filter((call) => call.table === "profiles").length > 0, true);
      assert.equal(logs.length, 3);
      assert.doesNotMatch(logs.join("\n"), /synthetic-clerk-key|synthetic-service-role-key/);
      assert.doesNotMatch(logs.join("\n"), /privateMetadata|unsafeMetadata/);
    });
  });

  it("does not announce partial success when output writing fails", async () => {
    const fixture = createMainFixture();
    const logs = [];
    await assert.rejects(
      () => main({
        argv: ["node", "audit", "--out=unwritable/audit"],
        env: {
          CLERK_SECRET_KEY: "synthetic-key",
          NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.test",
          SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
        },
        envFileCandidates: [],
        createSupabaseClient: fixture.createSupabaseClient,
        fetchImpl: fixture.fetchImpl,
        outputCwd: ".",
        mkdirImpl: async () => undefined,
        writeFileImpl: async () => {
          const error = new Error("permission denied");
          error.code = "EACCES";
          throw error;
        },
        log: (line) => logs.push(line),
      }),
      /permission denied/,
    );
    assert.deepEqual(logs, []);
  });
});
