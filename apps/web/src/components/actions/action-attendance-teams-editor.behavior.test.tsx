// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttendanceRegistryMutationRequest } from "@/lib/actions/participation/attendance-registry-http";
import type { ActionAttendanceEntryRow, ActionAttendanceTeamSnapshot } from "@/types/database";
import { ActionAttendanceTeamsEditor } from "./action-attendance-teams-editor";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const attendanceEntry = (id: string, status: ActionAttendanceEntryRow["attendance_status"]): ActionAttendanceEntryRow => ({
  id, action_id: "action-1", display_label: "Alex Martin", clerk_user_id: null, provenance: "organizer_entry",
  attendance_status: status, observed_at: status === "unknown" ? null : "2026-11-23T09:00:00.000Z",
  created_by: "organizer-1", created_at: "2026-11-23T08:00:00.000Z", updated_at: "2026-11-23T08:00:00.000Z",
  updated_by: "organizer-1", revision: 1, deleted_at: null, deleted_by: null,
});

const entries = [attendanceEntry("entry-a", "unknown"), attendanceEntry("entry-b", "present"), attendanceEntry("entry-c", "absent")];
const team = (id: string, name: string, member_entry_ids: string[] = [], revision = 1, leader_entry_id: string | null = null): ActionAttendanceTeamSnapshot => ({
  id, action_id: "action-1", name, normalized_name: name.toLowerCase(), leader_entry_id, revision,
  created_by: "organizer-1", created_at: "2026-11-23T08:00:00.000Z", updated_by: "organizer-1", updated_at: "2026-11-23T08:00:00.000Z",
  member_entry_ids,
});

let host: HTMLDivElement;
let root: Root;
let mutate: ReturnType<typeof vi.fn<(...args: [Omit<AttendanceRegistryMutationRequest, "requestId">]) => Promise<void>>>;

function render(teams: ActionAttendanceTeamSnapshot[] = [team("team-a", "Équipe A", ["entry-a", "entry-b"]), team("team-b", "Équipe B")]) {
  mutate = vi.fn(async () => undefined);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<ActionAttendanceTeamsEditor entries={entries} teams={teams} busyKey={null} onMutate={async (request) => { await mutate(request); }}/>));
  return host;
}

async function changeValue(control: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, "value")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
}

async function click(button: HTMLButtonElement | null) {
  if (!button) throw new Error("button not found");
  await act(async () => { button.click(); await Promise.resolve(); });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("ActionAttendanceTeamsEditor", () => {
  it("shows private teams, status counts, a leader among members, and a distinct unassigned state", () => {
    const mounted = render();
    expect(mounted.textContent).toContain("Équipes (facultatif)");
    expect(mounted.textContent).toContain("2 personnes attendues · 1 présente · 0 absentes · 1 à confirmer");
    expect(mounted.textContent).toContain("Sans équipe (1)");
    const leader = mounted.querySelector<HTMLSelectElement>('select[aria-label="Chef d’équipe Équipe A"]');
    expect([...leader!.options].map((option) => option.textContent)).toEqual(["À désigner", "Alex Martin", "Alex Martin"]);
    expect(mounted.textContent).toContain("Le rôle de chef ne modifie ni les droits ni la participation.");
    expect(mounted.querySelector('[class*="sm:grid-cols-"]')).not.toBeNull();
  });

  it("creates and renames teams, assigns and moves homonymous identities, and designates an account-free leader", async () => {
    const mounted = render([team("team-a", "Équipe A", ["entry-a"]), team("team-b", "Équipe B")]);
    const nameInput = mounted.querySelector<HTMLInputElement>(".cmm-field input");
    if (!nameInput) throw new Error("new team name input missing");
    await changeValue(nameInput, "Équipe C");
    await click([...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Créer une équipe") ?? null);
    expect(mutate).toHaveBeenLastCalledWith({ operation: "team_create", teamName: "Équipe C" });

    await click([...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Renommer") ?? null);
    const renameInput = mounted.querySelector<HTMLInputElement>('section[aria-label="Équipe Équipe A"] form input');
    if (!renameInput) throw new Error("rename input missing");
    await changeValue(renameInput, "Équipe Alpha");
    await click([...mounted.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Enregistrer") ?? null);
    expect(mutate).toHaveBeenLastCalledWith({ operation: "team_rename", teamId: "team-a", teamName: "Équipe Alpha", expectedRevisions: [{ teamId: "team-a", revision: 1 }] });

    const move = mounted.querySelector<HTMLSelectElement>('select[aria-label="Équipe de Alex Martin"]');
    if (!move) throw new Error("member team selector missing");
    await changeValue(move, "team-b");
    expect(mutate).toHaveBeenLastCalledWith({ operation: "member_assign", entryId: "entry-a", targetTeamId: "team-b", expectedRevisions: [{ teamId: "team-a", revision: 1 }, { teamId: "team-b", revision: 1 }] });

    const leader = mounted.querySelector<HTMLSelectElement>('select[aria-label="Chef d’équipe Équipe A"]');
    if (!leader) throw new Error("leader selector missing");
    await changeValue(leader, "entry-a");
    expect(mutate).toHaveBeenLastCalledWith({ operation: "leader_set", teamId: "team-a", leaderEntryId: "entry-a", expectedRevisions: [{ teamId: "team-a", revision: 1 }] });
  });

  it("releases a moved leader by supplying both current team revisions and preserves the member", async () => {
    const mounted = render([team("team-a", "Équipe A", ["entry-a"], 4, "entry-a"), team("team-b", "Équipe B", [], 7)]);
    const memberSelect = mounted.querySelector<HTMLSelectElement>('select[aria-label="Équipe de Alex Martin"]');
    if (!memberSelect) throw new Error("member team selector missing");
    await changeValue(memberSelect, "team-b");
    expect(mutate).toHaveBeenCalledWith({ operation: "member_assign", entryId: "entry-a", targetTeamId: "team-b", expectedRevisions: [{ teamId: "team-a", revision: 4 }, { teamId: "team-b", revision: 7 }] });
  });
});
