import { describe, expect, it } from "vitest";
import {
  resolveIdentityActorNameOptions,
  resolveIdentityDisplayName,
  resolveIdentityHandle,
  resolveIdentityNameParts,
} from "./authz-identity-names";

function clerkUser(overrides: Record<string, unknown> = {}) {
  return {
    firstName: null,
    lastName: null,
    username: null,
    primaryEmailAddress: null,
    primaryPhoneNumber: null,
    ...overrides,
  } as never;
}

function storedProfile(overrides: Record<string, unknown> = {}) {
  return {
    display_name: null,
    display_name_mode: null,
    handle: null,
    ...overrides,
  } as never;
}

describe("identity username and application handle semantics", () => {
  it("keeps a present Clerk username unchanged", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({ username: "historical_pseudo" }),
    );

    expect(parts.username).toBe("historical_pseudo");
    expect(resolveIdentityHandle(parts.username, "user_present", null)).toBe(
      "historical_pseudo",
    );
  });

  it("does not expose an email as username when Clerk username is absent", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({ primaryEmailAddress: { emailAddress: "private@example.org" } }),
    );
    const handle = resolveIdentityHandle(parts.username, "user_email_only", null);

    expect(parts.username).toBeNull();
    expect(handle).toBe("user_l_only");
    expect(handle).not.toContain("private@example.org");
    expect(resolveIdentityActorNameOptions("", parts.username, handle)).toEqual([
      handle,
    ]);
  });

  it("does not expose a phone number as username when Clerk username is absent", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({ primaryPhoneNumber: { phoneNumber: "+33612345678" } }),
    );

    expect(parts.username).toBeNull();
    expect(
      resolveIdentityDisplayName(
        "",
        "",
        parts.username,
        resolveIdentityHandle(parts.username, "user_phone_only", null),
        "user_phone_only",
        "full_name",
        null,
      ),
    ).not.toContain("+33612345678");
  });

  it("uses full_name without requiring a Clerk username", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({ firstName: "Ada", lastName: "Lovelace" }),
    );
    const handle = resolveIdentityHandle(parts.username, "user_full_name", null);

    expect(parts.username).toBeNull();
    expect(
      resolveIdentityDisplayName(
        parts.firstName,
        parts.lastName,
        parts.username,
        handle,
        "user_full_name",
        "full_name",
        null,
      ),
    ).toBe("Ada Lovelace");
  });

  it("keeps legacy pseudo mode safe without a username", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({
        primaryEmailAddress: { emailAddress: "private@example.org" },
        primaryPhoneNumber: { phoneNumber: "+33612345678" },
      }),
    );
    const handle = resolveIdentityHandle(parts.username, "user_legacy_pseudo", storedProfile({
      display_name_mode: "pseudo",
    }));

    expect(parts.username).toBeNull();
    expect(
      resolveIdentityDisplayName(
        parts.firstName,
        parts.lastName,
        parts.username,
        handle,
        "user_legacy_pseudo",
        "pseudo",
        storedProfile({ display_name_mode: "pseudo" }),
      ),
    ).toBe(handle);
    expect(handle).not.toContain("@");
    expect(handle).not.toContain("+");
  });

  it("preserves historical application handles", () => {
    const parts = resolveIdentityNameParts(
      clerkUser({ username: "old_clerk_username" }),
    );
    const handle = resolveIdentityHandle(
      parts.username,
      "user_historical",
      storedProfile({ handle: "legacy_handle" }),
    );

    expect(parts.username).toBe("old_clerk_username");
    expect(handle).toBe("legacy_handle");
  });
});
