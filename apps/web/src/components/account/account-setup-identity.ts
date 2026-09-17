export type AccountSetupExternalAccount = {
  provider?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type AccountSetupIdentitySource = {
  firstName?: string | null;
  lastName?: string | null;
  externalAccounts?: readonly AccountSetupExternalAccount[] | null;
};

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function findGoogleExternalAccount(
  externalAccounts: readonly AccountSetupExternalAccount[] | null | undefined,
): AccountSetupExternalAccount | undefined {
  return externalAccounts?.find((account) => {
    const provider = account.provider?.trim().toLowerCase();
    return provider === "google" || provider === "oauth_google";
  });
}

/** Resolve provider names without ever deriving a name from an email address. */
export function resolveAccountSetupIdentityNames({
  firstName,
  lastName,
  externalAccounts,
}: AccountSetupIdentitySource): { firstName: string; lastName: string } {
  const googleAccount = findGoogleExternalAccount(externalAccounts);

  return {
    firstName: trimOrEmpty(firstName) || trimOrEmpty(googleAccount?.firstName),
    lastName: trimOrEmpty(lastName) || trimOrEmpty(googleAccount?.lastName),
  };
}

/** A manual field value, including an intentional empty string, always wins. */
export function resolveAccountSetupNameField(
  manualValue: string | null,
  providerValue: string,
): string {
  return manualValue ?? providerValue;
}
