import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_LIMIT = 100;
const DEFAULT_OUTPUT_BASE = path.join("artifacts", "clerk-users");
const CLERK_API_BASE = "https://api.clerk.com/v1";
const ENV_FILE_CANDIDATES = [
  path.join(process.cwd(), "apps", "web", ".env.local"),
  path.join(process.cwd(), "apps", "web", ".env.vercel.local"),
  path.join(process.cwd(), "apps", "web", ".env.production.local"),
  path.join(process.cwd(), ".env.local"),
];

function getArg(name, fallback = null) {
  const flag = `--${name}`;
  const exact = process.argv.find((arg) => arg === flag);
  if (exact) return true;

  const prefixed = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (prefixed) return prefixed.slice(flag.length + 1);

  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return process.argv[index + 1];
  }

  return fallback;
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
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

function resolveEnvValue(key, envFiles) {
  const runtime = process.env[key];
  if (typeof runtime === "string" && runtime.trim().length > 0) {
    return runtime.trim();
  }
  const fileValue = envFiles[key];
  if (typeof fileValue === "string" && fileValue.trim().length > 0) {
    return fileValue.trim();
  }
  return null;
}

function asIso(value) {
  if (value == null || value === "") return "";
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
  if (value == null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
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

function normaliseUser(user) {
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
    emailAddresses: user.emailAddresses ?? user.email_addresses ?? [],
    raw: user,
  };
}

function toCsv(rows) {
  const header = [
    "id",
    "primaryEmail",
    "username",
    "firstName",
    "lastName",
    "createdAt",
    "updatedAt",
    "lastSignInAt",
    "publicMetadata",
    "privateMetadata",
    "unsafeMetadata",
    "emailAddresses",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.primaryEmail,
        row.username,
        row.firstName,
        row.lastName,
        row.createdAt,
        row.updatedAt,
        row.lastSignInAt,
        row.publicMetadata,
        row.privateMetadata,
        row.unsafeMetadata,
        row.emailAddresses,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

async function fetchPage({ secretKey, limit, offset }) {
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

  return response.json();
}

async function main() {
  const envFiles = await loadEnvFiles();
  const secretKey = resolveEnvValue("CLERK_SECRET_KEY", envFiles) ?? getArg("secret-key");
  if (!secretKey) {
    throw new Error(
      "Missing CLERK_SECRET_KEY. Set it in the environment or pass --secret-key=<your_secret_key>.",
    );
  }

  const limit = Number(getArg("limit", DEFAULT_LIMIT));
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`Invalid --limit value: ${String(limit)}`);
  }

  const outputBase = String(getArg("out", DEFAULT_OUTPUT_BASE));
  const outputDir = path.dirname(outputBase);
  await mkdir(outputDir, { recursive: true });

  const users = [];
  let offset = 0;
  let totalCount = null;

  while (true) {
    const page = await fetchPage({ secretKey, limit, offset });
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

    users.push(...data.map(normaliseUser));

    if (data.length < limit) break;
    offset += limit;
  }

  const jsonPath = `${outputBase}.json`;
  const csvPath = `${outputBase}.csv`;
  await writeFile(jsonPath, JSON.stringify({ totalCount, count: users.length, users }, null, 2), "utf8");
  await writeFile(csvPath, toCsv(users), "utf8");

  console.log(`Exported ${users.length} Clerk users.`);
  if (typeof totalCount === "number") {
    console.log(`Clerk totalCount: ${totalCount}`);
  }
  console.log(`JSON: ${path.resolve(jsonPath)}`);
  console.log(`CSV:  ${path.resolve(csvPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
