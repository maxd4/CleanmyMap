import { randomUUID } from "node:crypto";

export const CLERK_LIFECYCLE = Object.freeze({
  TEMPORARY: "TEMPORARY",
  PERSISTENT_DEVELOPMENT: "PERSISTENT_DEVELOPMENT",
});

export const TEMPORARY_OWNER = "cleanmymap-playwright";
const TEMPORARY_EMAIL_PATTERN = /^cmm-e2e-[0-9a-z-]+\+clerk_test@/i;

export function resolveClerkLifecycle({ configuredEmail, requestedLifecycle } = {}) {
  const email = configuredEmail?.trim() ?? "";
  const requested = requestedLifecycle?.trim() || "";

  if (requested && !Object.values(CLERK_LIFECYCLE).includes(requested)) {
    throw new Error("CMM_E2E_CLERK_LIFECYCLE must be TEMPORARY or PERSISTENT_DEVELOPMENT.");
  }
  if (requested === CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT && !email) {
    throw new Error("PERSISTENT_DEVELOPMENT requires the existing E2E_CLERK_USER_EMAIL contract.");
  }
  if (requested === CLERK_LIFECYCLE.TEMPORARY && email) {
    throw new Error("TEMPORARY must not reuse the persistent E2E_CLERK_USER_EMAIL contract.");
  }

  return requested || (email ? CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT : CLERK_LIFECYCLE.TEMPORARY);
}

export function buildTemporaryEmail(runId = Date.now().toString(36)) {
  return `cmm-e2e-${runId}+clerk_test@example.com`;
}

export function buildTemporaryRunId({ now = Date.now(), entropy = randomUUID() } = {}) {
  return `${now.toString(36)}-${entropy}`;
}

export function createTemporaryMetadata({ userId, runId }) {
  if (!userId || !runId) throw new Error("Temporary Clerk metadata requires a user id and run id.");
  return {
    version: 1,
    owner: TEMPORARY_OWNER,
    lifecycle: CLERK_LIFECYCLE.TEMPORARY,
    userId,
    runId,
  };
}

export function parseManagedUserMetadata(raw) {
  try {
    const candidate = JSON.parse(raw);
    if (
      candidate?.version !== 1 ||
      candidate.owner !== TEMPORARY_OWNER ||
      candidate.lifecycle !== CLERK_LIFECYCLE.TEMPORARY ||
      typeof candidate.userId !== "string" ||
      candidate.userId.length === 0 ||
      typeof candidate.runId !== "string" ||
      candidate.runId.length === 0
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function isOwnedTemporaryUser(metadata, user) {
  if (!metadata || !user) return false;
  if (metadata.userId !== user.id || metadata.lifecycle !== CLERK_LIFECYCLE.TEMPORARY) return false;

  const publicMetadata = user.publicMetadata ?? {};
  const isHarnessUser =
    publicMetadata.cleanmymapE2E === true &&
    publicMetadata.cleanmymapOwner === TEMPORARY_OWNER &&
    publicMetadata.cleanmymapLifecycle === CLERK_LIFECYCLE.TEMPORARY;
  const hasTemporaryEmail = (user.emailAddresses ?? []).some((entry) =>
    TEMPORARY_EMAIL_PATTERN.test(entry.emailAddress ?? ""),
  );
  return isHarnessUser && hasTemporaryEmail;
}

export function assertClerkDevelopmentEnvironment(env = process.env) {
  const secretKey = env.CLERK_SECRET_KEY?.trim() ?? "";
  const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  if (!secretKey || !publishableKey) {
    throw new Error("Clerk Development credentials are required for the official Playwright harness.");
  }
  if (!secretKey.startsWith("sk_test_") || !publishableKey.startsWith("pk_test_")) {
    throw new Error("Only Clerk Development credentials are accepted by the official Playwright harness.");
  }
  if (/\r|\n/.test(secretKey) || /\r|\n/.test(publishableKey)) {
    throw new Error("Clerk credentials must be single-line values.");
  }
}
