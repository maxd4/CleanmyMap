import * as React from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({ save: vi.fn(async () => true), cancel: vi.fn() }));
let workspaceMounts = 0;

vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div> }));
vi.mock("@/components/ui/page-header", () => ({ PageHeader: ({ title }: { title: string }) => <header>{title}</header> }));
vi.mock("./spogomi-preparation-workspace", () => ({
  SpogomiPreparationWorkspace: ({ section, onDraftStateChange }: { section: string; onDraftStateChange?: (controls: { dirty: boolean; save: () => Promise<boolean>; cancel: () => void }) => void }) => {
    React.useEffect(() => {
      workspaceMounts += 1;
      onDraftStateChange?.({ dirty: true, save: controls.save, cancel: controls.cancel });
    }, [onDraftStateChange]);
    return <div data-workspace-section={section} />;
  },
}));
vi.mock("./spogomi-observer-cockpit-panel", () => ({ SpogomiObserverCockpitPanel: () => <div /> }));
vi.mock("./spogomi-result-review-panel", () => ({ SpogomiResultReviewPanel: () => <div /> }));
vi.mock("./spogomi-attendance-panel", () => ({ SpogomiAttendancePanel: () => <div /> }));
vi.mock("./spogomi-field-operations-panel", () => ({ SpogomiFieldOperationsPanel: () => <div /> }));
vi.mock("./spogomi-closure-summary", () => ({ SpogomiClosureSummary: () => <div /> }));
vi.mock("./spogomi-synthetic-demo-notice", () => ({ SpogomiSyntheticDemoNotice: ({ children }: React.PropsWithChildren) => <div>{children}</div> }));
vi.mock("./spogomi-volunteer-help-proposals-panel", () => ({ SpogomiVolunteerHelpProposalsPanel: () => <div /> }));

import { SpogomiEventCockpit } from "./spogomi-event-cockpit";

const event = { id: "event-1", name: "SPOGOMI Paris", eventSlug: "paris-2026", mode: "casual", state: "draft", startsAt: "2026-06-01T10:00:00.000Z", endsAt: null, publicVisibility: "private" };

describe("SpogomiEventCockpit draft navigation", () => {
  it("keeps one organizer workspace mounted and requires an explicit decision before leaving a dirty draft", async () => {
    workspaceMounts = 0;
    controls.save.mockClear();
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiEventCockpit event={event} role="organizer" capabilities={["manage"]} />); });
    expect(workspaceMounts).toBe(1);

    const teamsLink = renderer.root.findAllByType("a").find((link) => link.props.href === "#teams");
    act(() => { teamsLink?.props.onClick({ preventDefault: () => undefined }); });
    expect(workspaceMounts).toBe(1);
    expect(renderer.root.findByProps({ "data-workspace-section": "teams" })).toBeTruthy();

    const settingsLink = renderer.root.findAllByType("a").find((link) => link.props.href === "#settings");
    act(() => { settingsLink?.props.onClick({ preventDefault: () => undefined }); });
    expect(renderer.root.findByProps({ role: "alert" })).toBeTruthy();
    expect(renderer.root.findByProps({ "data-workspace-section": "teams" })).toBeTruthy();

    const saveAndLeave = renderer.root.findAllByType("button").find((button) => button.props.children === "Enregistrer puis continuer");
    await act(async () => { await saveAndLeave?.props.onClick(); });
    expect(controls.save).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByProps({ "data-workspace-section": "settings" })).toBeTruthy();
    expect(workspaceMounts).toBe(1);
    renderer.unmount();
  });
});
