import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

setup.describe.configure({ mode: "serial" });

const authDirectory = path.join(process.cwd(), "artifacts", "playwright", "clerk");
const authFile = path.join(authDirectory, "user.json");
const managedUserFile = path.join(authDirectory, "managed-user.json");

function loadWebEnvironment(): void {
  const envFile = path.join(process.cwd(), "apps", "web", ".env.local");
  let contents: string;
  try {
    contents = readFileSync(envFile, "utf8");
  } catch {
    throw new Error("apps/web/.env.local is required for the official Clerk E2E harness.");
  }
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const rawValue = match[2];
    process.env[match[1]] = rawValue.replace(/^("|')(.*)\1$/, "$2");
  }
}

async function deleteManagedUserIfPresent(client: ReturnType<typeof createClerkClient>): Promise<void> {
  try {
    const raw = await readFile(managedUserFile, "utf8");
    const metadata = JSON.parse(raw) as { userId?: string };
    if (metadata.userId) {
      await client.users.deleteUser(metadata.userId);
    }
  } catch {
    // A stale file or already deleted Clerk user must not block a fresh setup.
  } finally {
    await unlink(managedUserFile).catch(() => undefined);
    await unlink(authFile).catch(() => undefined);
  }
}

setup("global setup", async () => {
  loadWebEnvironment();
  await clerkSetup({ dotenv: false });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for the official Clerk Playwright harness.");
  }

  const client = createClerkClient({ secretKey });
  await mkdir(authDirectory, { recursive: true });
  await deleteManagedUserIfPresent(client);

  const configuredEmail = process.env.E2E_CLERK_USER_EMAIL?.trim();
  const email = configuredEmail || `cmm-e2e-${Date.now()}+clerk_test@example.com`;
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
        profileSetupCompleted: true,
        profileSetupVersion: 2,
      },
    });
    userId = user.id;
    if (!configuredEmail) {
      await writeFile(managedUserFile, JSON.stringify({ userId }), "utf8");
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
  await page.goto("/actions/new");
  await page.getByRole("heading", { name: "Choisissez votre parcours" }).waitFor();
  await page.context().storageState({ path: authFileForTests });
});
