import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpogomiClosureSummary } from "@/lib/spogomi/closure";
import { SpogomiClosureDecisionsPanel } from "./spogomi-closure-decisions-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const baseSummary: SpogomiClosureSummary = {
  fieldCompetition: "finished",
  arbitration: "complete",
  rankings: "certified",
  environmental: "pending",
  action: "pending",
  individualRequests: "complete",
  blockers: [],
  certificationsRemaining: 0,
  divisions: [{
    id: "division-1",
    type: "casual",
    regulationComplete: true,
    sportEligibleTeams: 1,
    certifiedTeams: 1,
    officialRankingCount: 0,
    blockers: [],
    teams: [{
      teamId: "team-1",
      divisionId: "division-1",
      teamNumber: 1,
      publicName: "Les nettoyeurs",
      certifiedSubmission: true,
      certifiedSubmissionVersion: 3,
      decision: null,
    }],
  }],
};

function textOf(renderer: ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

describe("SpogomiClosureDecisionsPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows every division/team, certified submission version, current decision and all explicit statuses", () => {
    const rendered = renderToStaticMarkup(<SpogomiClosureDecisionsPanel eventId="event-1" summary={baseSummary} onSaved={vi.fn()} />);
    expect(rendered).toContain("Division Casual");
    expect(rendered).toContain("Équipe 1 · Les nettoyeurs");
    expect(rendered).toContain("Soumission certifiée · version 3");
    expect(rendered).toContain("Aucune décision courante");
    for (const label of ["Présence mesurée", "Absence", "Forfait", "Exclusion", "Disqualification", "Résultat manquant", "Contestation"]) expect(rendered).toContain(label);
    expect(rendered).toContain("Motif obligatoire");
  });

  it("records an explicit decision with independent eligibilities and the first version", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "recorded" }), { status: 200 }));
    const onSaved = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureDecisionsPanel eventId="event-1" summary={baseSummary} onSaved={onSaved} />); });
    const selects = renderer.root.findAllByType("select");
    const checkbox = renderer.root.findByType("input");
    const textarea = renderer.root.findByType("textarea");
    act(() => {
      selects[0].props.onChange({ target: { value: "disqualified" } });
      selects[1].props.onChange({ target: { value: "eligible" } });
      checkbox.props.onChange({ target: { checked: false } });
      textarea.props.onChange({ target: { value: "Décision arbitrale motivée." } });
    });
    await act(async () => { await renderer.root.findByType("button").props.onClick(); });
    expect(fetchMock).toHaveBeenCalledWith("/api/spogomi/events/event-1/closure", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "decide", divisionId: "division-1", teamId: "team-1", status: "disqualified", sportEligible: false, environmentalEligibility: "eligible", reason: "Décision arbitrale motivée.", decisionVersion: 1 }) }));
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("increments the decision version for a correction and keeps the current values editable", async () => {
    const currentSummary: SpogomiClosureSummary = {
      ...baseSummary,
      divisions: [{
        ...baseSummary.divisions[0],
        teams: [{ ...baseSummary.divisions[0].teams[0], decision: { teamId: "team-1", divisionId: "division-1", status: "forfeit", sportEligible: false, environmentalEligibility: "excluded", decisionVersion: 4, reason: "Forfait initial." } }],
      }],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "recorded" }), { status: 200 }));
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureDecisionsPanel eventId="event-1" summary={currentSummary} onSaved={vi.fn().mockResolvedValue(undefined)} />); });
    expect(textOf(renderer)).toContain("Décision courante · version 4");
    const textarea = renderer.root.findByType("textarea");
    act(() => { textarea.props.onChange({ target: { value: "Présence finalement mesurée." } }); });
    await act(async () => { await renderer.root.findByType("button").props.onClick(); });
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ body: expect.stringContaining('"decisionVersion":5') }));
  });

  it("shows a server rejection and never refreshes after a refused correction", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Conflict: la décision de clôture a changé entre-temps." }), { status: 409 }));
    const onSaved = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureDecisionsPanel eventId="event-1" summary={baseSummary} onSaved={onSaved} />); });
    const textarea = renderer.root.findByType("textarea");
    act(() => { textarea.props.onChange({ target: { value: "Correction refusée." } }); });
    await act(async () => { await renderer.root.findByType("button").props.onClick(); });
    expect(textOf(renderer)).toContain("Conflict: la décision de clôture a changé entre-temps.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("requires a reason before making a mutation request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const onSaved = vi.fn().mockResolvedValue(undefined);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureDecisionsPanel eventId="event-1" summary={baseSummary} onSaved={onSaved} />); });
    expect(renderer.root.findByType("button").props.disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
