import React from "react";
import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionFieldRolesPanel } from "./action-field-roles-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const serverState = {
  status: "ok",
  actionId: "action-1",
  roleOptions: [{ code: "group_lead", label: "Responsable", description: "Coordination" }],
  assignments: [],
  confirmedParticipants: [{ userId: "user-1", displayName: "Bénévole", handle: null, registrationStatus: "confirmed" }],
  organizers: [],
  pendingTransfer: null,
  transferProposals: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("ActionFieldRolesPanel role drafts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") return new Response(JSON.stringify({ ...serverState, assignments: [{ id: "assignment-1", user_id: "user-1", role_code: "group_lead", assignment_status: "active" }] }), { status: 200 });
      return new Response(JSON.stringify(serverState), { status: 200 });
    }));
  });

  it("keeps a checkbox draft through a render and sends exactly the selected roles", async () => {
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<ActionFieldRolesPanel actionId="action-1" />); await Promise.resolve(); });
    const checkbox = renderer.root.findByType("input");
    act(() => { checkbox.props.onChange({ target: { checked: true } }); });
    renderer.update(<ActionFieldRolesPanel actionId="action-1" />);
    const saveButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Enregistrer");
    await act(async () => { await saveButton?.props.onClick(); });
    const calls = vi.mocked(fetch).mock.calls;
    expect(JSON.parse(String(calls.find(([, init]) => init?.method === "PUT")?.[1]?.body))).toEqual({ userId: "user-1", roleCodes: ["group_lead"] });
  });

  it("keeps the draft after a failed save", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") return new Response(JSON.stringify({ error: "concurrent update" }), { status: 409 });
      return new Response(JSON.stringify(serverState), { status: 200 });
    }));
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<ActionFieldRolesPanel actionId="action-1" />); await Promise.resolve(); });
    act(() => { renderer.root.findByType("input").props.onChange({ target: { checked: true } }); });
    const saveButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Enregistrer");
    await act(async () => { await saveButton?.props.onClick(); });
    expect(renderer.root.findByType("input").props.checked).toBe(true);
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("concurrent update");
  });
});
