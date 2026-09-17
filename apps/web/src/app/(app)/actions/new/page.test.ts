import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSafeAuthSession: vi.fn(),
  getLocalDevAuthState: vi.fn(() => ({ active: false, role: null })),
  getCurrentUserIdentity: vi.fn(),
  isFeatureEnabled: vi.fn(() => true),
  getSupabaseServerClient: vi.fn(() => ({})),
  loadActionById: vi.fn(),
}));

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: mocks.getSafeAuthSession,
}));

vi.mock("@/lib/auth/local-dev-auth-state.server", () => ({
  getLocalDevAuthState: mocks.getLocalDevAuthState,
}));

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: mocks.getCurrentUserIdentity,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: mocks.isFeatureEnabled,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/actions/store", () => ({
  loadActionById: mocks.loadActionById,
}));

vi.mock("@/components/actions/action-creation-shell", () => ({
  ActionCreationShell: (props: Record<string, unknown>) =>
    React.createElement("div", {
      "data-testid": "action-creation-shell",
      "data-authenticated": String(props.isAuthenticated),
      "data-action-id": String(props.initialActionId ?? ""),
      "data-event-id": String(props.linkedEventId ?? ""),
      "data-initial-tab": String(props.initialTab ?? ""),
      "data-initial-panel": String(props.initialPanel ?? ""),
      "data-sign-in-href": String(props.signInHref ?? ""),
      "data-sign-up-href": String(props.signUpHref ?? ""),
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
    mocks.loadActionById.mockResolvedValue({ action_phase: "post_action_draft" });
  });

  it("does not expose the former clean-place mode", () => {
    expect(source).not.toContain('params?.["mode"]');
    expect(source).not.toContain("mode=propre");
    expect(source).not.toContain('initialRecordType={initialRecordType}');
  });

  it("keeps the action metadata in French", () => {
    expect(source).not.toContain("累计");
    expect(source).toContain("estimations d’impact");
  });

  it("passes the anonymous auth state and return context to the direct action forms", async () => {
    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({
          fromEventId: "event-42",
          actionId: "action-7",
        }),
      }),
    );

    expect(html).not.toContain("<form");
    expect(html).toContain('data-authenticated="false"');
    expect(html).toContain('data-action-id="action-7"');
    expect(html).toContain('data-event-id="event-42"');
    expect(html).toContain('data-initial-panel="pre-formulaire"');
    expect(html).toContain('data-initial-tab="after"');
    expect(html).toContain(
      'data-sign-in-href="/sign-in?redirect_url=%2Factions%2Fnew%3Ftab%3Dafter%26fromEventId%3Devent-42%26actionId%3Daction-7"',
    );
    expect(html).toContain(
      'data-sign-up-href="/sign-up?redirect_url=%2Factions%2Fnew%3Ftab%3Dafter%26fromEventId%3Devent-42%26actionId%3Daction-7"',
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

    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({
          fromEventId: "event-42",
          actionId: "action-7",
        }),
      }),
    );

    expect(html).toContain('data-authenticated="true"');
    expect(html).toContain('data-action-id="action-7"');
    expect(html).toContain('data-event-id="event-42"');
    expect(html).toContain('data-initial-panel="pre-formulaire"');
    expect(html).toContain('data-initial-tab="after"');
    expect(html).not.toContain("public-preview");
    expect(html).not.toContain("Aperçu public");
  });

  it("keeps the planner entry path and linked event in the canonical auth return", async () => {
    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({ from: "planner", fromEventId: "event-42" }),
      }),
    );

    expect(html).toContain('data-initial-tab="before"');
    expect(html).toContain('data-initial-panel="pre-formulaire"');
    expect(html).toContain(
      'data-sign-in-href="/sign-in?redirect_url=%2Factions%2Fnew%3FfromEventId%3Devent-42%26from%3Dplanner"',
    );
  });

  it("keeps a published pre-action on the before-action path when it is resumed", async () => {
    mocks.loadActionById.mockResolvedValue({ action_phase: "pre_action" });
    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({ from: "before", actionId: "action-42" }),
      }),
    );

    expect(html).toContain('data-initial-tab="before"');
    expect(html).toContain('data-initial-panel="pre-formulaire"');
    expect(html).toContain('data-action-id="action-42"');
  });

  it("resumes a persisted pre-action on the Pré-formulaire tab", async () => {
    mocks.loadActionById.mockResolvedValue({ action_phase: "pre_action" });

    const html = renderToStaticMarkup(
      await NewActionPage({
        searchParams: Promise.resolve({ actionId: "pre-action-42" }),
      }),
    );

    expect(html).toContain('data-initial-tab="before"');
    expect(html).toContain('data-action-id="pre-action-42"');
  });

  it("does not block the authenticated complete form by viewport", () => {
    const formSource = readFileSync(
      new URL(
        "../../../../components/actions/action-declaration/form/action-declaration-form.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(formSource).toContain("const isCompletionBlocked = !props.isAuthenticated");
    expect(formSource).not.toContain("isMobile");
    expect(formSource).not.toContain("Saisie mobile indisponible");
    expect(formSource).not.toContain("Aperçu mobile");
  });

  it("keeps the action entry focused on terrain results", () => {
    const formSource = readFileSync(
      new URL(
        "../../../../components/actions/action-declaration/form/action-declaration-form.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const identitySource = readFileSync(
      new URL(
        "../../../../components/actions/action-declaration/steps/ActionStepIdentity.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(formSource).toContain("Déclarer les résultats terrain");
    expect(formSource).toContain("Préparation existante reprise");
    expect(formSource).not.toContain("Formulaire continu");
    expect(formSource).not.toContain("4 rubriques");
    expect(formSource).not.toContain("Pré-action");
    expect(formSource).not.toContain("loadedActionPhase ??");
    expect(identitySource).not.toContain("Type d&apos;action");
    expect(identitySource).not.toContain("Action terrain");
    for (const sectionTitle of ["Identité", "Récolte", "Parcours", "Validation"]) {
      expect(formSource).toContain(`title="${sectionTitle}"`);
    }
  });
});
