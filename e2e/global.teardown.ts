import { createClerkClient } from "@clerk/backend";
import { readFile, unlink } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test as teardown } from "@playwright/test";

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

teardown("delete automatically managed Clerk user", async () => {
  const envFile = path.join(process.cwd(), "apps", "web", ".env.local");
  try {
    const contents = readFileSync(envFile, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const assignment = parseEnvAssignment(line);
      if (!assignment || process.env[assignment.key]) continue;
      const rawValue = assignment.value;
      process.env[assignment.key] = rawValue.length >= 2 && ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'")))
        ? rawValue.slice(1, -1)
        : rawValue;
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
