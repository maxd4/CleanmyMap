import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { RoleManagementPanelView, type RoleActionState } from "./role-management-panel-view";
import type { RoleAccountRecord } from "@/lib/admin/role-management";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function account(userId: string, roleLabel: RoleAccountRecord["roleLabel"], displayName = userId): RoleAccountRecord {
  return { userId, displayName, handle: displayName.toLowerCase().replaceAll(" ", "-"), avatarUrl: null, roleLabel, parisArrondissement: null, updatedAt: null };
}

function renderView(overrides: Partial<React.ComponentProps<typeof RoleManagementPanelView>> = {}) {
  const callbacks = {
    onSearch: vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault()),
    onSearchQueryChange: vi.fn(),
    onClearSearch: vi.fn(),
    onReasonChange: vi.fn(),
    onRoleChange: vi.fn(),
  };
  const props: React.ComponentProps<typeof RoleManagementPanelView> = {
    accounts: [account("self", "admin", "Current Admin"), account("max", "max", "Max Owner"), account("elected", "elu", "Élue"), account("company", "entreprise", "Company"), account("ordinary", "benevole", "Volunteer")],
    currentUserId: "self",
    fr: true,
    searchQuery: "",
    searchResults: [],
    searchResultsCount: 0,
    searchState: { status: "idle", message: null },
    errorMessage: null,
    reason: "",
    reasonError: null,
    actionState: null,
    ...callbacks,
    ...overrides,
  };
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(React.createElement(RoleManagementPanelView, props)); });
  return { renderer, props, callbacks };
}

function buttons(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType("button");
}

describe("RoleManagementPanelView", () => {
  it("renders every role, protects self and max, and exposes accessible reason validation", () => {
    const { renderer } = renderView({ reasonError: "Indiquez la raison de cette modification." });
    const text = renderer.root.findByType("section").findAll((node) => typeof node.children[0] === "string").map((node) => node.children.join(""));
    expect(text.join(" ")).toContain("Administrateur");
    expect(text.join(" ")).toContain("IMU");
    expect(text.join(" ")).toContain("Élu·e");
    expect(text.join(" ")).toContain("Entreprise");
    expect(text.join(" ")).toContain("Vous");
    expect(text.join(" ")).toContain("Protection");
    const reason = renderer.root.findByType("textarea");
    expect(reason.props["aria-invalid"]).toBe("true");
    expect(reason.props["aria-describedby"]).toBe("role-change-reason-error");
    expect(buttons(renderer).map((button) => button.props.children).flat().join(" ")).toContain("Attribuer admin");
    expect(buttons(renderer).filter((button) => button.props.children === "Révoquer").length).toBe(2);
  });

  it("renders empty state, search result state, pending buttons and English labels", async () => {
    const pending: RoleActionState = { userId: "elected", action: "revoke" };
    const { renderer, callbacks } = renderView({
      fr: false,
      accounts: [],
      searchQuery: "el",
      searchResults: [account("elected", "elu", "Elected")],
      searchResultsCount: 1,
      searchState: { status: "searching", message: "Searching..." },
      actionState: pending,
    });
    const rendered = renderer.root.findAll((node) => typeof node.children[0] === "string").map((node) => node.children.join(" ")).join(" ");
    expect(rendered).toContain("No admin or elected account to show.");
    expect(rendered).toContain("Search results");
    expect(rendered).toContain("Searching...");
    expect(rendered).toContain("Revoking...");
    const search = buttons(renderer).find((item) => item.props.children === "Searching...");
    expect(search).toBeDefined();
    expect(search?.props.disabled).toBe(true);
    const clear = buttons(renderer).find((button) => button.props.children === "Clear");
    expect(clear).toBeDefined();
    await act(() => clear?.props.onClick());
    expect(callbacks.onClearSearch).toHaveBeenCalledOnce();
  });

  it("passes exact assign/revoke payloads and reason edits to callbacks", async () => {
    const { renderer, callbacks } = renderView({
      accounts: [account("other", "benevole", "Other")],
      reason: "Valid reason",
      searchResults: [account("other", "benevole", "Other")],
    });
    const assignAdmin = buttons(renderer).find((button) => button.props.children === "Attribuer admin");
    const assignElected = buttons(renderer).find((button) => button.props.children === "Attribuer élu");
    expect(assignAdmin).toBeDefined();
    expect(assignElected).toBeDefined();
    await act(() => assignAdmin?.props.onClick());
    await act(() => assignElected?.props.onClick());
    expect(callbacks.onRoleChange).toHaveBeenNthCalledWith(1, "other", "assign", "admin");
    expect(callbacks.onRoleChange).toHaveBeenNthCalledWith(2, "other", "assign", "elu");
    await act(() => renderer.root.findByType("textarea").props.onChange({ target: { value: "Updated reason" } }));
    expect(callbacks.onReasonChange).toHaveBeenCalledWith("Updated reason");
  });
});
