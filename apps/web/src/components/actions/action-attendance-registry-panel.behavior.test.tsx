// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactDomHarness } from "@/__tests__/support/action-behavior-test-helpers";
import type { ActionAttendanceEntryRow } from "@/types/database";
import { ActionAttendanceRegistryPanel } from "./action-attendance-registry-panel";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), refresh: vi.fn() }));
vi.mock("./use-action-attendance-registry", () => ({
  useActionAttendanceRegistry: () => ({
    snapshot: {
      actionId: "action-1",
      entries: [entry("entry-1", "Alex Martin"), entry("entry-2", "Alex Martin", "present")],
      declared: { total: 3, adults: 2, retired: 0, children: 1 },
      canMarkPresent: true,
    },
    loadState: "ready",
    errorMessage: null,
    busyKey: null,
    mutate: mocks.mutate,
    refresh: mocks.refresh,
  }),
}));

function entry(id: string, display_label: string, attendance_status: ActionAttendanceEntryRow["attendance_status"] = "unknown"): ActionAttendanceEntryRow {
  return {
    id, action_id: "action-1", display_label, clerk_user_id: null, provenance: "organizer_entry",
    attendance_status, observed_at: attendance_status === "present" ? "2026-10-21T09:00:00.000Z" : null,
    created_by: "clerk-owner", created_at: "2026-10-20T09:00:00.000Z", updated_at: "2026-10-20T09:00:00.000Z",
    updated_by: "clerk-owner", revision: 1, deleted_at: null, deleted_by: null,
  };
}

const harness = createReactDomHarness();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { harness.cleanup(); vi.clearAllMocks(); });

describe("ActionAttendanceRegistryPanel", () => {
  it("keeps homonyms as separate rows and separates private presence from declared bilan", () => {
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="bilan" />);
    expect(mounted.querySelectorAll("li")).toHaveLength(2);
    expect(mounted.textContent).toContain("Présents identifiés : 1");
    expect(mounted.textContent).toContain("Effectif total déclaré : 3");
    expect(mounted.textContent).toContain("Écart non rapproché : 2");
    expect(mounted.textContent).toContain("Adultes : 2 · Retraités : 0 · Enfants : 1");
  });

  it("adds as unknown and clears the input only after successful persistence", async () => {
    mocks.mutate.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(entry("entry-3", "Sam"));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    const name = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
    if (!name) throw new Error("name input missing");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Sam");
      name.dispatchEvent(new Event("input", { bubbles: true }));
      name.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => { mounted.querySelector<HTMLButtonElement>('button[type="button"]')?.click(); await Promise.resolve(); });
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ operation: "add", displayLabel: "Sam", attendanceStatus: "unknown" }));
    expect(name.value).toBe("Sam");
    await act(async () => { mounted.querySelector<HTMLButtonElement>('button[type="button"]')?.click(); await Promise.resolve(); });
    expect(name.value).toBe("");
  });

  it("adds the focused free label with Enter", async () => {
    mocks.mutate.mockResolvedValueOnce(entry("entry-3", "Jamie"));
    const mounted = harness.mount(<ActionAttendanceRegistryPanel actionId="action-1" mode="day" />);
    const name = mounted.querySelector<HTMLInputElement>('input[aria-describedby]');
    if (!name) throw new Error("name input missing");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(name, "Jamie");
      name.dispatchEvent(new Event("input", { bubbles: true }));
      name.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(mocks.mutate).toHaveBeenCalledWith(expect.objectContaining({ operation: "add", displayLabel: "Jamie", attendanceStatus: "unknown" }));
  });
});
