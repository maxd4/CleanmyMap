import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertClerkDevelopmentEnvironment,
  buildTemporaryEmail,
  CLERK_LIFECYCLE,
  createTemporaryMetadata,
  isOwnedTemporaryUser,
  parseManagedUserMetadata,
  resolveClerkLifecycle,
  TEMPORARY_OWNER,
} from "./clerk-lifecycle.mjs";

setup.describe.configure({ mode: "serial" });

const authDirectory = path.join(process.cwd(), "artifacts", "playwright", "clerk");
const authFile = path.join(authDirectory, "user.json");
const managedUserFile = path.join(authDirectory, "managed-user.json");

function parseEnvAssignment(line: string): { key: string; value: string } | null {
  let candidate = line.trimStart();
  if (candidate.startsWith("export ")) candidate = candidate.slice("export ".length);
  const separator = candidate.indexOf("=");
  if (separator <= 0) return null;
  const key = candidate.slice(0, separator).trim();
  if (!key || [...key].some((character, index) => !(index === 0 ? /[A-Za-z_]/ : /[A-Za-z0-9_]/).test(character))) return null;
  return { key, value: candidate.slice(separator + 1).trim() };
}

function loadWebEnvironment(): void {
  const envFile = path.join(process.cwd(), "apps", "web", ".env.local");
  let contents: string;
  try {
    contents = readFileSync(envFile, "utf8");
  } catch {
    throw new Error("apps/web/.env.local is required for the official Clerk E2E harness.");
  }
  for (const line of contents.split(/\r?\n/)) {
    const assignment = parseEnvAssignment(line);
    if (!assignment || process.env[assignment.key]) continue;
    const rawValue = assignment.value;
    process.env[assignment.key] = rawValue.length >= 2 && ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'")))
      ? rawValue.slice(1, -1)
      : rawValue;
  }
}

async function deleteManagedTemporaryUserIfPresent(client: ReturnType<typeof createClerkClient>): Promise<void> {
  try {
    const raw = await readFile(managedUserFile, "utf8");
    const metadata = parseManagedUserMetadata(raw);
    if (metadata) {
      const user = await client.users.getUser(metadata.userId).catch(() => null);
      if (isOwnedTemporaryUser(metadata, user)) {
        await client.users.deleteUser(metadata.userId);
      }
    }
  } catch {
    // A stale marker or already deleted temporary user must not block a fresh setup.
  } finally {
    await unlink(managedUserFile).catch(() => undefined);
    await unlink(authFile).catch(() => undefined);
  }
}

setup("global setup", async () => {
  loadWebEnvironment();
  assertClerkDevelopmentEnvironment();
  await clerkSetup({ dotenv: false });

  const secretKey = process.env.CLERK_SECRET_KEY!;

  const client = createClerkClient({ secretKey });
  await mkdir(authDirectory, { recursive: true });
  await deleteManagedTemporaryUserIfPresent(client);

  const configuredEmail = process.env.E2E_CLERK_USER_EMAIL?.trim();
  const lifecycle = resolveClerkLifecycle({ configuredEmail });
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const email = configuredEmail || buildTemporaryEmail(runId);
  let userId: string;

  const existing = await client.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) {
    userId = existing.data[0].id;
  } else {
    const user = await client.users.createUser({
      emailAddress: [email],
      firstName: "CleanMyMap",
      lastName: "E2E",
      skipPasswordRequirement: true,
      publicMetadata: {
        cleanmymapE2E: true,
        ...(lifecycle === CLERK_LIFECYCLE.TEMPORARY ? { cleanmymapOwner: TEMPORARY_OWNER } : {}),
        cleanmymapLifecycle: lifecycle,
        profileSetupCompleted: true,
        profileSetupVersion: 2,
      },
    });
    userId = user.id;
    if (lifecycle === CLERK_LIFECYCLE.TEMPORARY) {
      await writeFile(
        managedUserFile,
        JSON.stringify(createTemporaryMetadata({ userId, runId })),
        { encoding: "utf8", mode: 0o600 },
      );
    }
  }
  process.env.E2E_CLERK_USER_EMAIL = email;
  process.env.E2E_CLERK_USER_ID = userId;
});

const authFileForTests = authFile;

setup("authenticate and save official Clerk state", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });
  await page.goto("/sections/route");
  await page.getByRole("heading", { name: "Où agir", exact: true }).first().waitFor();
  await page.context().storageState({ path: authFileForTests });
});
