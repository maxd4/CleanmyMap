// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionCreationSectionFormProps } from "./action-creation-shell.types";
import { AfterActionCreationView } from "./action-creation-shell-completion";

vi.mock("./action-declaration/form", () => ({
  ActionDeclarationForm: ({ initialActionId, onActionPersisted }: { initialActionId: string | null; onActionPersisted?: (actionId: string) => void }) => (
    <div data-testid="declaration-form" data-action-id={initialActionId ?? "none"}>
      {!initialActionId ? <button type="button" onClick={() => onActionPersisted?.("action-created")}>Enregistrer l’action</button> : null}
    </div>
  ),
}));
vi.mock("./action-creation-shell-navigation", () => ({
  ActionLifecycleNavigation: ({ actionId }: { actionId: string | null }) => <nav data-testid="lifecycle-navigation" data-action-id={actionId ?? "none"} />,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const formProps = {} as ActionCreationSectionFormProps;
let host: HTMLDivElement;
let root: Root;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("AfterActionCreationView attendance registry lifecycle", () => {
  it("reveals the same server registry immediately after first persistence and on resume", async () => {
    const reads: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      reads.push(String(url));
      return response({
        actionId: "action-created",
        entries: [{
          id: "entry-confirmed", action_id: "action-created", display_label: "Alex Martin", clerk_user_id: "user_123",
          provenance: "confirmed_registration", attendance_status: "unknown", observed_at: null,
          created_by: "system:confirmed-registration", created_at: "2026-10-20T09:00:00.000Z", updated_at: "2026-10-20T09:00:00.000Z",
          updated_by: "system:confirmed-registration", revision: 1, deleted_at: null, deleted_by: null,
        }],
        declared: { total: 3, adults: 2, retired: 0, children: 1 },
        canMarkPresent: false,
      });
    }));
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);

    function CreationAndResumeHarness() {
      const [actionId, setActionId] = useState<string | null>(null);
      return <AfterActionCreationView formProps={formProps} actionId={actionId} fr searchParams={{ tab: "after" }} onActionPersisted={setActionId} />;
    }

    act(() => root.render(<CreationAndResumeHarness />));
    expect(host.textContent).toContain("accessible après l’enregistrement de l’action");
    expect(reads).toHaveLength(0);
    await act(async () => {
      host.querySelector<HTMLButtonElement>("button")?.click();
      await Promise.resolve(); await Promise.resolve();
    });
    expect(host.querySelector('[data-testid="declaration-form"]')?.getAttribute("data-action-id")).toBe("action-created");
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(host.querySelector('[data-testid="action-attendance-registry-bilan"]')).not.toBeNull();
    expect(host.textContent).toContain("Alex Martin");
    expect(reads).toEqual(["/api/actions/action-created/attendance-registry"]);
    expect(host.querySelector('[data-testid="lifecycle-navigation"]')?.getAttribute("data-action-id")).toBe("action-created");
  });

  it("renders a resumed action's existing ID into the bilan registry without creating another roster", async () => {
    const fetchMock = vi.fn(async () => response({
      actionId: "action-resumed",
      entries: [],
      declared: { total: 0, adults: 0, retired: 0, children: 0 },
      canMarkPresent: false,
    }));
    vi.stubGlobal("fetch", fetchMock);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(<AfterActionCreationView formProps={formProps} actionId="action-resumed" fr searchParams={{ tab: "after", actionId: "action-resumed" }} />));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(host.querySelector('[data-testid="action-attendance-registry-bilan"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/action-resumed/attendance-registry", { cache: "no-store" });
    expect(host.querySelector('[data-testid="declaration-form"]')?.getAttribute("data-action-id")).toBe("action-resumed");
  });
});
