import { createClerkClient } from "@clerk/backend";
import { pathToFileURL } from "node:url";
import { classifyE2EClerkAccount } from "../apps/web/src/lib/auth/e2e-account.ts";
import { assertClerkDevelopmentEnvironment } from "./clerk-lifecycle.mjs";

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export async function auditClerkE2EAccounts(client) {
  const candidates = [];
  let offset = 0;
  let scannedUsers = 0;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const page = await client.users.getUserList({ limit: PAGE_SIZE, offset });
    const users = page.data ?? [];
    scannedUsers += users.length;
    for (const user of users) {
      const classification = classifyE2EClerkAccount(user);
      if (classification) {
        candidates.push({
          id: user.id,
          classification,
          lifecycle: typeof user.publicMetadata?.cleanmymapLifecycle === "string"
            ? user.publicMetadata.cleanmymapLifecycle
            : null,
          createdAt: typeof user.createdAt === "number" ? new Date(user.createdAt).toISOString() : null,
        });
      }
    }

    offset += users.length;
    if (users.length < PAGE_SIZE || offset >= (page.totalCount ?? offset)) {
      return { readOnly: true, complete: true, scannedUsers, candidates };
    }
  }

  throw new Error("Clerk E2E account audit reached its page bound before a complete scan.");
}

async function main() {
  if (process.env.VERCEL_ENV?.trim().toLowerCase() === "production") {
    throw new Error("The E2E account audit refuses Vercel Production.");
  }
  assertClerkDevelopmentEnvironment();
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const report = await auditClerkE2EAccounts(client);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Clerk E2E audit failed."}\n`);
    process.exitCode = 1;
  });
}
