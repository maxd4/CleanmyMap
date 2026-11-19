type AccountSetupExternalAccount = {
  provider?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type AccountSetupIdentitySource = {
  firstName?: string | null;
  lastName?: string | null;
  externalAccounts?: readonly AccountSetupExternalAccount[] | null;
};

const SUPPORTED_NAME_PROVIDERS = new Set([
  "google",
  "oauth_google",
  "linkedin_oidc",
  "oauth_linkedin_oidc",
  "linkedin",
  "oauth_linkedin",
]);

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function findSupportedOAuthExternalAccounts(
  externalAccounts: readonly AccountSetupExternalAccount[] | null | undefined,
): AccountSetupExternalAccount[] {
  if (!externalAccounts?.length) {
    return [];
  }

  return externalAccounts.filter((account) => {
    const provider = account.provider?.trim().toLowerCase();
    return Boolean(provider && SUPPORTED_NAME_PROVIDERS.has(provider));
  });
}

function resolveFirstNonEmptyFromAccounts(
  accounts: readonly AccountSetupExternalAccount[],
  field: "firstName" | "lastName",
): string {
  for (const account of accounts) {
    const value = trimOrEmpty(account[field]);
    if (value) {
      return value;
    }
  }
  return "";
}

/** Resolve provider names without ever deriving a name from an email address. */
export function resolveAccountSetupIdentityNames({
  firstName,
  lastName,
  externalAccounts,
}: AccountSetupIdentitySource): { firstName: string; lastName: string } {
  const supportedAccounts = findSupportedOAuthExternalAccounts(externalAccounts);

  return {
    firstName:
      trimOrEmpty(firstName) ||
      resolveFirstNonEmptyFromAccounts(supportedAccounts, "firstName"),
    lastName:
      trimOrEmpty(lastName) ||
      resolveFirstNonEmptyFromAccounts(supportedAccounts, "lastName"),
  };
}

/** A manual field value, including an intentional empty string, always wins. */
export function resolveAccountSetupNameField(
  manualValue: string | null,
  providerValue: string,
): string {
  return manualValue ?? providerValue;
}
