import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpogomiClosureSummary } from "./spogomi-closure-summary";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function textOf(renderer: ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

const teams = [{ teamId: "team-1", divisionId: "division-1", teamNumber: 1, publicName: "Les nettoyeurs", certifiedSubmission: true, certifiedSubmissionVersion: 3, decision: null }];
const division = { id: "division-1", type: "casual", regulationComplete: true, sportEligibleTeams: 1, certifiedTeams: 1, officialRankingCount: 0, blockers: [], teams };

function summaryPayload(fieldCompetition: string, summaryTeams = teams) {
  return {
    summary: {
      fieldCompetition,
      arbitration: "approved",
      rankings: "published",
      environmental: "validated",
      action: "linked",
      individualRequests: "none",
      blockers: [],
      certificationsRemaining: 0,
      divisions: [{ ...division, teams: summaryTeams }],
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

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

  it("keeps the newest snapshot when concurrent refreshes resolve in reverse order", async () => {
    const initial = deferred<Response>();
    const refreshes: Array<ReturnType<typeof deferred<Response>>> = [];
    let initialPending = true;
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      if (init?.method === "POST") return Promise.resolve(new Response(JSON.stringify({ status: "recorded" }), { status: 200 }));
      if (initialPending) {
        initialPending = false;
        return initial.promise;
      }
      const refresh = deferred<Response>();
      refreshes.push(refresh);
      return refresh.promise;
    });
    const twoTeams = [
      ...teams,
      { teamId: "team-2", divisionId: "division-1", teamNumber: 2, publicName: "Les voisins", certifiedSubmission: true, certifiedSubmissionVersion: 4, decision: null },
    ];
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<SpogomiClosureSummary eventId="event-race" />); });
    await act(async () => { initial.resolve(new Response(JSON.stringify(summaryPayload("initial snapshot", twoTeams)), { status: 200 })); await Promise.resolve(); await Promise.resolve(); });

    const textareas = renderer.root.findAllByType("textarea");
    const buttons = renderer.root.findAllByType("button");
    act(() => { textareas[0].props.onChange({ target: { value: "Décision équipe 1." } }); });
    act(() => { textareas[1].props.onChange({ target: { value: "Décision équipe 2." } }); });
    await act(async () => {
      buttons[0].props.onClick();
      buttons[1].props.onClick();
      for (let index = 0; index < 4; index += 1) await Promise.resolve();
    });

    expect(refreshes).toHaveLength(2);
    await act(async () => { refreshes[1].resolve(new Response(JSON.stringify(summaryPayload("newest snapshot", twoTeams)), { status: 200 })); await Promise.resolve(); await Promise.resolve(); });
    await act(async () => { refreshes[0].resolve(new Response(JSON.stringify(summaryPayload("obsolete snapshot", twoTeams)), { status: 200 })); await Promise.resolve(); await Promise.resolve(); });

    const rendered = textOf(renderer);
    expect(rendered).toContain("newest snapshot");
    expect(rendered).not.toContain("obsolete snapshot");
  });
});
