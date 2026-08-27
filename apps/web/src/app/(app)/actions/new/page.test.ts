import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  isFeatureEnabled: vi.fn(() => true),
  isAdminLikeProfile: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: mocks.isFeatureEnabled,
}));

vi.mock("@/lib/profiles", () => ({
  isAdminLikeProfile: mocks.isAdminLikeProfile,
}));

vi.mock("@/components/actions/action-declaration-entry-flow", () => ({
  ActionDeclarationEntryFlow: (props: Record<string, unknown>) =>
    React.createElement("div", {
      "data-testid": "entry-flow",
      "data-authenticated": String(props.isAuthenticated),
      "data-auto-approved": String(props.isAutoApprovedSubmission),
      "data-action-id": String(props.initialActionId ?? ""),
      "data-event-id": String(props.linkedEventId ?? ""),
    }),
}));

import NewActionPage from "./page";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("action creation entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSafeAuthSession.mockResolvedValue({
      userId: null,
      clerkReachable: true,
      state: "anonymous",
    });
    mocks.getCurrentUserIdentity.mockResolvedValue(null);
    mocks.isAdminLikeProfile.mockReturnValue(false);
  });

  it("does not expose the former clean-place mode", () => {
    expect(source).not.toContain('params?.["mode"]');
    expect(source).not.toContain("mode=propre");
    expect(source).not.toContain('initialRecordType={initialRecordType}');
  });

  it("shows the existing auth state instead of an editable form for anonymous users", async () => {
    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({
          fromEventId: "event-42",
          actionId: "action-7",
        }),
      }),
    );

    expect(html).not.toContain("<form");
    expect(html).toContain("Connexion requise pour déclarer une action");
    expect(html).toContain("Se connecter");
    expect(html).toContain(
      "redirect_url=%2Factions%2Fnew%3FfromEventId%3Devent-42%26actionId%3Daction-7",
    );
  });

  it("passes auth, pre-action context and action hydration through for an authenticated admin", async () => {
    mocks.getSafeAuthSession.mockResolvedValue({
      userId: "user-1",
      clerkReachable: true,
      state: "authenticated",
    });
    mocks.getCurrentUserIdentity.mockResolvedValue({
      role: "admin",
      actorNameOptions: ["Admin test"],
      displayName: "Admin test",
      username: "admin-test",
    });
    mocks.isAdminLikeProfile.mockReturnValue(true);

    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({
          fromEventId: "event-42",
          actionId: "action-7",
        }),
      }),
    );

    expect(html).toContain('data-authenticated="true"');
    expect(html).toContain('data-auto-approved="true"');
    expect(html).toContain('data-action-id="action-7"');
    expect(html).toContain('data-event-id="event-42"');
    expect(html).not.toContain("public-preview");
    expect(html).not.toContain("Aperçu public");
  });

  it("does not block the authenticated complete form by viewport", () => {
    const formSource = readFileSync(
      new URL(
        "../../../../components/actions/action-declaration-form/action-declaration-form.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(formSource).toContain("const isCompletionBlocked = !props.isAuthenticated");
    expect(formSource).not.toContain("isMobile");
    expect(formSource).not.toContain("Saisie mobile indisponible");
    expect(formSource).not.toContain("Aperçu mobile");
  });
});
