import { createClerkClient } from "@clerk/backend";
import { readFile, unlink } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as teardown } from "@playwright/test";

const authDirectory = path.join(process.cwd(), "artifacts", "playwright", "clerk");
const authFile = path.join(authDirectory, "user.json");
const managedUserFile = path.join(authDirectory, "managed-user.json");

teardown("delete automatically managed Clerk user", async () => {
  const envFile = path.join(process.cwd(), "apps", "web", ".env.local");
  try {
    const contents = readFileSync(envFile, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^("|')(.*)\1$/, "$2");
    }
  } catch {
    // The Clerk secret is optional during best-effort teardown.
  }
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (secretKey) {
    try {
      const metadata = JSON.parse(await readFile(managedUserFile, "utf8")) as { userId?: string };
      if (metadata.userId) {
        await createClerkClient({ secretKey }).users.deleteUser(metadata.userId);
      }
    } catch {
      // Cleanup is best effort; the harness never deletes a configured user.
    }
  }
  await unlink(managedUserFile).catch(() => undefined);
  await unlink(authFile).catch(() => undefined);
});
