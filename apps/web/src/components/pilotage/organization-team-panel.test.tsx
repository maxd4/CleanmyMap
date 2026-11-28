// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationWorkspace } from "@/lib/organizations/contracts";
import { OrganizationTeamPanel } from "./organization-team-panel";

const orgId = "00000000-0000-4000-8000-000000000001";
const membershipId = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const emptyWorkspace = (role: OrganizationWorkspace["role"] = "owner"): OrganizationWorkspace => ({
  id: orgId, name: "Alpha", role, site_id: null, members: [], sites: [], campaigns: [], actions: [],
  actions_has_more: false, link_candidates: [], candidates_has_more: false,
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function render(workspace: OrganizationWorkspace, busy = false, onMutate = vi.fn()) {
  await act(async () => root.render(<OrganizationTeamPanel workspace={workspace} locale="fr" busy={busy} onMutate={onMutate} />));
  return onMutate;
}

describe("organization team panel", () => {
  it("shows the empty roster and disables leaving while a mutation is active", async () => {
    await render(emptyWorkspace(), true);
    expect(host.textContent).toContain("Aucun membre actif.");
    expect([...host.querySelectorAll("button")].find((button) => button.textContent === "Quitter l’organisation")?.disabled).toBe(true);
  });

  it("shows pending expiry to owners, hides revoked actions, and revokes only the selected membership", async () => {
    const workspace = emptyWorkspace();
    workspace.members = [
      { id: membershipId(11), member_role: "owner", state: "active", site_id: null, label: "Alice", is_self: true, expires_at: null },
      { id: membershipId(12), member_role: "member", state: "pending", site_id: null, label: "Invité", is_self: false, expires_at: "2026-12-01T00:00:00.000Z" },
      { id: membershipId(13), member_role: "manager", state: "revoked", site_id: null, label: "Ancien", is_self: false, expires_at: null },
    ];
    const onMutate = await render(workspace);
    expect(host.textContent).toContain("expire le");
    const revokedItem = [...host.querySelectorAll("li")].find((item) => item.textContent?.includes("Ancien"));
    expect(revokedItem?.querySelector("button")).toBeNull();
    const inviteItem = [...host.querySelectorAll("li")].find((item) => item.textContent?.includes("Invité"));
    await act(async () => inviteItem?.querySelector("button")?.click());
    expect(onMutate).toHaveBeenCalledWith(orgId, { operation: "revoke", membershipId: membershipId(12) });
  });

  it("marks a roster at its 101-row limit and keeps management controls off a site manager view", async () => {
    const owner = emptyWorkspace();
    owner.members = Array.from({ length: 101 }, (_, index) => ({
      id: membershipId(index + 100), member_role: "member" as const, state: "active" as const,
      site_id: null, label: `Member ${index}`, is_self: false, expires_at: null,
    }));
    await render(owner);
    expect(host.textContent).toContain("Liste partielle.");

    const local = emptyWorkspace("site_manager");
    local.members = [{ id: membershipId(11), member_role: "site_manager", state: "active", site_id: membershipId(31), label: "Gestionnaire local", is_self: true, expires_at: null }];
    await render(local);
    expect(host.textContent).toContain("Mon équipe");
    expect(host.querySelector('input[type="email"]')).toBeNull();
    expect(host.textContent).not.toContain("Transférer la responsabilité");
  });

  it("renders the English team labels", async () => {
    await act(async () => root.render(<OrganizationTeamPanel workspace={emptyWorkspace("manager")} locale="en" busy={false} onMutate={vi.fn()} />));
    expect(host.textContent).toContain("My team");
    expect(host.textContent).toContain("No active members.");
    expect(host.textContent).toContain("Leave organization");
  });
});
