import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpogomiClosureSummary } from "./spogomi-closure-summary";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function textOf(renderer: ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

const teams = [{ teamId: "team-1", divisionId: "division-1", teamNumber: 1, publicName: "Les nettoyeurs", certifiedSubmission: true, certifiedSubmissionVersion: 3, decision: null }];
const division = { id: "division-1", type: "casual", regulationComplete: true, sportEligibleTeams: 1, certifiedTeams: 1, officialRankingCount: 0, blockers: [], teams };

describe("SpogomiClosureSummary", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows loading first, then independent blockers and remaining certifications", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      summary: {
        fieldCompetition: "finished",
        arbitration: "pending",
        rankings: "draft",
        environmental: "ready",
        action: "pending",
        individualRequests: "2 à traiter",
        blockers: ["division-1:contested_result"],
        certificationsRemaining: 2,
        divisions: [{ ...division, blockers: ["contested_result"] }],
      },
    }), { status: 200 }));
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureSummary eventId="event-1" />); });
    expect(textOf(renderer)).toContain("Chargement du récapitulatif de clôture");

    await act(async () => { await Promise.resolve(); });
    const rendered = textOf(renderer);
    expect(rendered).toContain("Récapitulatif de clôture");
    expect(rendered).toContain("Clôture bloquée : 1 point(s) à traiter.");
    expect(rendered).toContain("résultat contesté");
    expect(rendered).toContain("Certifications restantes");
    expect(rendered).toContain('"Certifications restantes : ","2"');
    expect(rendered).toContain("Les décisions sportives, environnementales et de publication restent indépendantes.");
  });

  it("shows the no-blocker state without inventing certification work", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      summary: {
        fieldCompetition: "finished", arbitration: "approved", rankings: "published", environmental: "validated",
        action: "linked", individualRequests: "none", blockers: [], certificationsRemaining: 0,
        divisions: [division],
      },
    }), { status: 200 }));
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<SpogomiClosureSummary eventId="event-2" />); await Promise.resolve(); });

    const rendered = textOf(renderer);
    expect(rendered).toContain("Aucun blocage de clôture détecté.");
    expect(rendered).not.toContain("Certifications restantes");
  });

  it("does not expose a failed response body as raw internal data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<SpogomiClosureSummary eventId="event-3" />); await Promise.resolve(); });

    const rendered = textOf(renderer);
    expect(rendered).toContain("Récapitulatif de clôture indisponible.");
    expect(rendered).not.toContain("provider detail");
  });

  it("does not update an unmounted consumer when the request resolves later", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureSummary eventId="event-4" />); });
    act(() => { renderer.unmount(); });

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ summary: { fieldCompetition: "not_started", arbitration: "complete", rankings: "blocked", environmental: "pending", action: "pending", individualRequests: "complete", blockers: [], certificationsRemaining: 0, divisions: [] } }), { status: 200 }));
      await Promise.resolve();
    });

    expect(renderer.toJSON()).toBeNull();
  });
});
