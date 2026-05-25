#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_OUTPUT_BASE = join("artifacts", "clerk-supabase-audit");
const CLERK_API_BASE = "https://api.clerk.com/v1";
const ENV_FILE_CANDIDATES = [
  join(process.cwd(), "apps", "web", ".env.local"),
  join(process.cwd(), "apps", "web", ".env.vercel.local"),
  join(process.cwd(), "apps", "web", ".env.production.local"),
  join(process.cwd(), ".env.local"),
];

const ROLE_ALIASES = new Map(
  Object.entries({
    admin: "admin",
    administrator: "admin",
    max: "max",
    imu: "max",
    owner: "max",
    superadmin: "max",
    benevole: "benevole",
    volunteer: "benevole",
    user: "benevole",
    member: "benevole",
    coordinateur: "coordinateur",
    coordinator: "coordinateur",
    coordonnateur: "coordinateur",
    scientifique: "scientifique",
    scientist: "scientifique",
    data: "scientifique",
    analyste: "scientifique",
    analyst: "scientifique",
    statisticien: "scientifique",
    statistician: "scientifique",
    elu: "elu",
    elue: "elu",
    decideur: "elu",
    "décideur": "elu",
    elected: "elu",
    mayor: "elu",
  }),
);

function parseArgs(argv) {
  const options = {
    limit: DEFAULT_PAGE_SIZE,
    out: DEFAULT_OUTPUT_BASE,
  };

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length));
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    }
  }

  return options;
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

async function loadEnvFiles() {
  const merged = {};
  for (const filePath of ENV_FILE_CANDIDATES) {
    if (!existsSync(filePath)) {
      continue;
    }
    const text = await readFile(filePath, "utf8");
    const parsed = parseDotEnv(text);
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        continue;
      }
      if (!(key in merged)) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

function resolveEnvValue(key, fileEnv) {
  const runtime = process.env[key];
  if (typeof runtime === "string" && runtime.trim().length > 0) {
    return runtime.trim();
  }

  const fileValue = fileEnv[key];
  if (typeof fileValue === "string" && fileValue.trim().length > 0) {
    return fileValue.trim();
  }

  return null;
}

function normalizeEmail(value) {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRole(input) {
  const normalized = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!normalized) {
    return null;
  }
  return ROLE_ALIASES.get(normalized) ?? null;
}

function extractRole(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const value = metadata.role ?? metadata.profile;
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function extractBadgeIds(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const badges = metadata.badges;
  if (!Array.isArray(badges)) {
    return [];
  }

  return badges
    .filter((value) => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function getPrimaryEmail(user) {
  return (
    user?.primaryEmailAddress?.emailAddress ??
    user?.primary_email_address?.email_address ??
    user?.emailAddresses?.[0]?.emailAddress ??
    user?.emailAddresses?.[0]?.email_address ??
    user?.email_addresses?.[0]?.email_address ??
    user?.email_address ??
    ""
  );
}

function asIso(value) {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  }
  return String(value);
}

function csvEscape(value) {
  if (value == null) {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function parseUserIds(raw) {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function parseMaxUserIds(raw, fallbackRaw) {
  const parsed = parseUserIds(raw);
  if (parsed.size > 0) {
    return parsed;
  }
  return parseUserIds(fallbackRaw);
}

function isCreatorInboxEmail(value, creatorInboxEmail) {
  return normalizeEmail(value) === normalizeEmail(creatorInboxEmail);
}

function resolveAppProfile({ metadataRole, isAdmin, isMax }) {
  if (isMax) {
    return "max";
  }
  if (isAdmin) {
    return "admin";
  }
  return normalizeRole(metadataRole) ?? "benevole";
}

function resolveStoredRoleLabel({
  metadataRole,
  userId,
  email,
  adminUserIds,
  maxUserIds,
  creatorInboxEmail,
}) {
  const isMaxByAllowlist =
    isCreatorInboxEmail(email, creatorInboxEmail) ||
    maxUserIds.has(userId) ||
    (maxUserIds.size === 0 && adminUserIds.has(userId));

  const isMaxByMetadata = normalizeRole(metadataRole) === "max";
  const isMax = isMaxByAllowlist || isMaxByMetadata;
  if (isMax) {
    return "imu";
  }

  if (metadataRole === "admin") {
    return "admin";
  }

  return normalizeRole(metadataRole) ?? "benevole";
}

function collectUserIdsFromRows(rows, key) {
  const ids = new Set();
  for (const row of rows) {
    const value = row?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      ids.add(value.trim());
    }
  }
  return ids;
}

function countRowsByUserId(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const userId = row?.[key];
    if (typeof userId !== "string" || userId.trim().length === 0) {
      continue;
    }
    const normalized = userId.trim();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return counts;
}

function mergeSets(...sets) {
  const output = new Set();
  for (const set of sets) {
    for (const value of set) {
      output.add(value);
    }
  }
  return output;
}

async function fetchClerkUsers(secretKey, limit) {
  const users = [];
  let offset = 0;
  let totalCount = null;

  while (true) {
    const url = new URL(`${CLERK_API_BASE}/users`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Clerk API ${response.status} ${response.statusText}: ${body}`);
    }

    const page = await response.json();
    const data = Array.isArray(page)
      ? page
      : Array.isArray(page?.data)
        ? page.data
        : Array.isArray(page?.users)
          ? page.users
          : [];

    if (typeof page?.total_count === "number") {
      totalCount = page.total_count;
    } else if (typeof page?.totalCount === "number") {
      totalCount = page.totalCount;
    }

    users.push(
      ...data.map((user) => {
        const publicMetadata = user.publicMetadata ?? user.public_metadata ?? {};
        const privateMetadata = user.privateMetadata ?? user.private_metadata ?? {};
        const unsafeMetadata = user.unsafeMetadata ?? user.unsafe_metadata ?? {};
        return {
          id: user.id ?? "",
          username: user.username ?? "",
          firstName: user.firstName ?? user.first_name ?? "",
          lastName: user.lastName ?? user.last_name ?? "",
          primaryEmail: getPrimaryEmail(user),
          createdAt: asIso(user.createdAt ?? user.created_at),
          updatedAt: asIso(user.updatedAt ?? user.updated_at),
          lastSignInAt: asIso(user.lastSignInAt ?? user.last_sign_in_at),
          publicMetadata,
          privateMetadata,
          unsafeMetadata,
          metadataRole:
            extractRole(publicMetadata) ?? extractRole(privateMetadata),
          metadataBadgeIds: Array.from(
            new Set([
              ...extractBadgeIds(publicMetadata),
              ...extractBadgeIds(privateMetadata),
            ]),
          ),
          avatarUrl: user.imageUrl ?? user.image_url ?? user.profile_image_url ?? "",
          externalId: user.externalId ?? user.external_id ?? "",
        };
      }),
    );

    if (data.length < limit) {
      break;
    }
    offset += limit;
  }

  return { users, totalCount };
}

async function fetchAllRows(supabase, { schema = "public", table, select, orderColumn }) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + DEFAULT_PAGE_SIZE - 1;
    const client = schema === "public" ? supabase : supabase.schema(schema);
    let query = client.from(table).select(select).range(from, to);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`${schema}.${table} fetch failed: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < DEFAULT_PAGE_SIZE) {
      break;
    }
    from += DEFAULT_PAGE_SIZE;
  }

  return rows;
}

function buildRowSummary({
  id,
  clerkUser,
  profileRow,
  progressionProfile,
  progressionEventsCount,
  checklistCount,
  funnelCount,
  context,
}) {
  const metadataRole = clerkUser?.metadataRole ?? null;
  const expectedStoredRoleLabel = clerkUser
    ? resolveStoredRoleLabel({
        metadataRole,
        userId: id,
        email: clerkUser.primaryEmail,
        adminUserIds: context.adminUserIds,
        maxUserIds: context.maxUserIds,
        creatorInboxEmail: context.creatorInboxEmail,
      })
    : null;
  const expectedAppProfile = expectedStoredRoleLabel
    ? expectedStoredRoleLabel === "imu"
      ? "max"
      : expectedStoredRoleLabel
    : clerkUser
      ? resolveAppProfile({
          metadataRole,
          isAdmin: metadataRole === "admin",
          isMax:
            normalizeRole(metadataRole) === "max" ||
            isCreatorInboxEmail(clerkUser.primaryEmail, context.creatorInboxEmail) ||
            context.maxUserIds.has(id) ||
            (context.maxUserIds.size === 0 && context.adminUserIds.has(id)),
        })
      : null;

  const roleMatch =
    Boolean(clerkUser && profileRow) &&
    expectedStoredRoleLabel === (profileRow?.role_label ?? null);

  const derivedBadgeIds = expectedAppProfile
    ? [`role_${expectedAppProfile}`, `profile_${expectedAppProfile}`]
    : [];

  const metadataBadgeIds = clerkUser?.metadataBadgeIds ?? [];

  let status = "ok";
  if (clerkUser && !profileRow) {
    status = "missing_profile";
  } else if (!clerkUser && profileRow) {
    status = "orphan_profile";
  } else if (clerkUser && profileRow && !roleMatch) {
    status = "role_mismatch";
  } else if (!clerkUser && !profileRow) {
    status = progressionEventsCount > 0 || checklistCount > 0 || funnelCount > 0
      ? "legacy_activity_only"
      : "empty";
  }

  return {
    id,
    status,
    clerk_present: Boolean(clerkUser),
    supabase_profile_present: Boolean(profileRow),
    clerk_email: clerkUser?.primaryEmail ?? "",
    clerk_username: clerkUser?.username ?? "",
    clerk_display_name:
      clerkUser && `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
    clerk_metadata_role: metadataRole ?? "",
    clerk_metadata_badges: metadataBadgeIds,
    derived_badges: derivedBadgeIds,
    expected_app_profile: expectedAppProfile ?? "",
    expected_role_label: expectedStoredRoleLabel ?? "",
    supabase_role_label: profileRow?.role_label ?? "",
    role_match: clerkUser && profileRow ? roleMatch : "",
    profile_display_name: profileRow?.display_name ?? "",
    profile_handle: profileRow?.handle ?? "",
    profile_arrondissement: profileRow?.paris_arrondissement ?? "",
    profile_updated_at: profileRow?.updated_at ?? "",
    progression_current_level: progressionProfile?.current_level ?? "",
    progression_potential_level: progressionProfile?.potential_level ?? "",
    progression_xp_total: progressionProfile?.xp_total ?? "",
    progression_xp_validated: progressionProfile?.xp_validated ?? "",
    progression_xp_pending: progressionProfile?.xp_pending ?? "",
    progression_events_count: progressionEventsCount,
    checklist_progress_count: checklistCount,
    funnel_events_count: funnelCount,
    clerk_created_at: clerkUser?.createdAt ?? "",
    clerk_updated_at: clerkUser?.updatedAt ?? "",
    clerk_last_sign_in_at: clerkUser?.lastSignInAt ?? "",
  };
}

function toCsv(rows) {
  const header = [
    "id",
    "status",
    "clerk_present",
    "supabase_profile_present",
    "clerk_email",
    "clerk_username",
    "clerk_display_name",
    "clerk_metadata_role",
    "clerk_metadata_badges",
    "derived_badges",
    "expected_app_profile",
    "expected_role_label",
    "supabase_role_label",
    "role_match",
    "profile_display_name",
    "profile_handle",
    "profile_arrondissement",
    "profile_updated_at",
    "progression_current_level",
    "progression_potential_level",
    "progression_xp_total",
    "progression_xp_validated",
    "progression_xp_pending",
    "progression_events_count",
    "checklist_progress_count",
    "funnel_events_count",
    "clerk_created_at",
    "clerk_updated_at",
    "clerk_last_sign_in_at",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      header
        .map((key) => csvEscape(Array.isArray(row[key]) ? row[key].join("|") : row[key]))
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error(`Invalid --limit value: ${String(args.limit)}`);
  }

  const envFiles = await loadEnvFiles();
  const clerkSecretKey = resolveEnvValue("CLERK_SECRET_KEY", envFiles);
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", envFiles);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", envFiles);
  const adminUserIds = parseUserIds(resolveEnvValue("CLERK_ADMIN_USER_IDS", envFiles));
  const maxUserIds = parseMaxUserIds(
    resolveEnvValue("CLERK_MAX_USER_IDS", envFiles),
    resolveEnvValue("CLERK_ADMIN_USER_IDS", envFiles),
  );
  const creatorInboxEmail = resolveEnvValue("CREATOR_INBOX_EMAIL", envFiles);

  if (!clerkSecretKey) {
    throw new Error("Missing CLERK_SECRET_KEY.");
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [clerkResult, profiles, progressionProfiles, progressionEvents, checklistProgress, funnelEvents] =
    await Promise.all([
      fetchClerkUsers(clerkSecretKey, args.limit),
      fetchAllRows(supabase, {
        schema: "public",
        table: "profiles",
        select: "id, display_name, role_label, handle, paris_arrondissement, avatar_url, created_at, updated_at",
        orderColumn: "updated_at",
      }),
      fetchAllRows(supabase, {
        schema: "public",
        table: "progression_profiles",
        select: "user_id, current_level, potential_level, xp_total, xp_validated, xp_pending, updated_at",
        orderColumn: "updated_at",
      }),
      fetchAllRows(supabase, {
        schema: "public",
        table: "progression_events",
        select: "id, user_id, event_type, status_phase, xp_awarded, created_at",
        orderColumn: "created_at",
      }),
      fetchAllRows(supabase, {
        schema: "public",
        table: "checklist_progress",
        select: "user_id, updated_at",
        orderColumn: "updated_at",
      }),
      fetchAllRows(supabase, {
        schema: "public",
        table: "funnel_events",
        select: "id, user_id, step, mode, at",
        orderColumn: "at",
      }),
    ]);

  const clerkUsersById = new Map(clerkResult.users.map((user) => [user.id, user]));
  const profilesById = new Map(profiles.map((row) => [row.id, row]));
  const progressionProfilesByUserId = new Map(
    progressionProfiles.map((row) => [row.user_id, row]),
  );
  const progressionEventsCounts = countRowsByUserId(progressionEvents, "user_id");
  const checklistCounts = countRowsByUserId(checklistProgress, "user_id");
  const funnelCounts = countRowsByUserId(funnelEvents, "user_id");

  const allIds = mergeSets(
    new Set(clerkUsersById.keys()),
    new Set(profilesById.keys()),
    new Set(progressionProfilesByUserId.keys()),
    collectUserIdsFromRows(progressionEvents, "user_id"),
    collectUserIdsFromRows(checklistProgress, "user_id"),
    collectUserIdsFromRows(funnelEvents, "user_id"),
  );

  const rows = Array.from(allIds)
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((id) =>
      buildRowSummary({
        id,
        clerkUser: clerkUsersById.get(id) ?? null,
        profileRow: profilesById.get(id) ?? null,
        progressionProfile: progressionProfilesByUserId.get(id) ?? null,
        progressionEventsCount: progressionEventsCounts.get(id) ?? 0,
        checklistCount: checklistCounts.get(id) ?? 0,
        funnelCount: funnelCounts.get(id) ?? 0,
        context: {
          adminUserIds,
          maxUserIds,
          creatorInboxEmail,
        },
      }),
    );

  const findings = {
    missingProfiles: rows.filter((row) => row.status === "missing_profile"),
    orphanProfiles: rows.filter((row) => row.status === "orphan_profile"),
    roleMismatches: rows.filter((row) => row.status === "role_mismatch"),
    legacyActivityOnly: rows.filter((row) => row.status === "legacy_activity_only"),
    empty: rows.filter((row) => row.status === "empty"),
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    clerk: {
      totalCount: clerkResult.totalCount,
      count: clerkResult.users.length,
    },
    supabase: {
      profiles: profiles.length,
      progressionProfiles: progressionProfiles.length,
      progressionEvents: progressionEvents.length,
      checklistProgress: checklistProgress.length,
      funnelEvents: funnelEvents.length,
    },
    counts: {
      unionUsers: rows.length,
      missingProfiles: findings.missingProfiles.length,
      orphanProfiles: findings.orphanProfiles.length,
      roleMismatches: findings.roleMismatches.length,
      legacyActivityOnly: findings.legacyActivityOnly.length,
    },
  };

  const outputBase = resolve(process.cwd(), args.out);
  await mkdir(dirname(outputBase), { recursive: true });

  const report = {
    summary,
    findings,
    users: rows,
  };

  await writeFile(
    `${outputBase}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(`${outputBase}.csv`, toCsv(rows), "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.log(`JSON: ${resolve(`${outputBase}.json`)}`);
  console.log(`CSV:  ${resolve(`${outputBase}.csv`)}`);
}

main().catch((error) => {
  console.error(
    "clerk-supabase-audit failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
