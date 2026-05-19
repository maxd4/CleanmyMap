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

    const payload = (await response.json().catch(() => null)) as
      | CurrentAccountIdentityResponse
      | null;

    if (!payload?.userId || !payload.displayName) {
      return null;
    }

    const username = payload.username?.trim() || payload.handle?.trim() || payload.userId;

    return {
      userId: payload.userId,
      displayName: payload.displayName,
      displayNameMode: normalizeDisplayNameMode(payload.displayNameMode),
      handle: payload.handle?.trim() || username,
      username,
      firstName: payload.firstName?.trim() || null,
      email: payload.email?.trim() || null,
    };
  } catch {
    return null;
  }
}
