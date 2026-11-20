export const E2E_CLERK_LIFECYCLE = {
  TEMPORARY: "TEMPORARY",
  PERSISTENT_DEVELOPMENT: "PERSISTENT_DEVELOPMENT",
} as const;

export const E2E_CLERK_OWNER = "cleanmymap-playwright";

const E2E_EMAIL_PATTERN = /^cmm-e2e-[0-9a-z-]+\+clerk_test@/i;

export type E2EClerkAccountLike = {
  id?: string;
  publicMetadata?: Record<string, unknown> | null;
  emailAddresses?: Array<{ emailAddress?: string | null }> | null;
};

function hasCanonicalE2EEmail(user: E2EClerkAccountLike): boolean {
  return (user.emailAddresses ?? []).some((entry) =>
    E2E_EMAIL_PATTERN.test(entry.emailAddress ?? ""),
  );
}

/** Clerk publicMetadata is server-written; unsafeMetadata and profile projections are not authority. */
export function isE2EClerkAccount(user: E2EClerkAccountLike | null | undefined): boolean {
  if (!user) return false;
  return user.publicMetadata?.cleanmymapE2E === true || hasCanonicalE2EEmail(user);
}

export type E2EClerkAccountClassification =
  | "TEMPORARY_MARKED"
  | "PERSISTENT_DEVELOPMENT_MARKED"
  | "MARKED_METADATA_INCOMPLETE"
  | "LEGACY_TEST_ALIAS";

/** Read-only audit classification. It never authorizes deletion or mutation. */
export function classifyE2EClerkAccount(
  user: E2EClerkAccountLike | null | undefined,
): E2EClerkAccountClassification | null {
  if (!user) return null;
  const metadata = user.publicMetadata ?? {};
  const hasAlias = hasCanonicalE2EEmail(user);
  if (metadata.cleanmymapE2E === true) {
    if (
      metadata.cleanmymapLifecycle === E2E_CLERK_LIFECYCLE.TEMPORARY &&
      metadata.cleanmymapOwner === E2E_CLERK_OWNER &&
      hasAlias
    ) {
      return "TEMPORARY_MARKED";
    }
    if (metadata.cleanmymapLifecycle === E2E_CLERK_LIFECYCLE.PERSISTENT_DEVELOPMENT) {
      return "PERSISTENT_DEVELOPMENT_MARKED";
    }
    return "MARKED_METADATA_INCOMPLETE";
  }
  return hasAlias ? "LEGACY_TEST_ALIAS" : null;
}
