import { normalizeDisplayNameMode, type DisplayNameMode } from "@/lib/profiles";

export type CurrentAccountIdentity = {
  userId: string;
  displayName: string;
  displayNameMode: DisplayNameMode;
  handle: string;
  username: string;
  firstName: string | null;
  email: string | null;
};

type CurrentAccountIdentityResponse = Partial<CurrentAccountIdentity> & {
  error?: string;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function hasRequiredIdentityFields(
  payload: CurrentAccountIdentityResponse | null,
): payload is CurrentAccountIdentityResponse & { userId: string; displayName: string } {
  return Boolean(payload?.userId && payload.displayName);
}

function buildCurrentAccountIdentity(
  payload: CurrentAccountIdentityResponse & { userId: string; displayName: string },
): CurrentAccountIdentity {
  const username = trimOrNull(payload.username) ?? trimOrNull(payload.handle) ?? payload.userId;
  return {
    userId: payload.userId,
    displayName: payload.displayName,
    displayNameMode: normalizeDisplayNameMode(payload.displayNameMode),
    handle: trimOrNull(payload.handle) ?? username,
    username,
    firstName: trimOrNull(payload.firstName),
    email: trimOrNull(payload.email),
  };
}

function parseCurrentAccountIdentityPayload(
  payload: CurrentAccountIdentityResponse | null,
): CurrentAccountIdentity | null {
  if (!hasRequiredIdentityFields(payload)) {
    return null;
  }

  return buildCurrentAccountIdentity(payload);
}

export async function fetchCurrentAccountIdentity(): Promise<CurrentAccountIdentity | null> {
  try {
    const response = await fetch("/api/users/profile/display-name-mode", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as CurrentAccountIdentityResponse | null;
    return parseCurrentAccountIdentityPayload(payload);
  } catch {
    return null;
  }
}
