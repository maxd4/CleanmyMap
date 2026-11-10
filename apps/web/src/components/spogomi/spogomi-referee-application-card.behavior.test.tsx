import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({ Gavel: () => null, LockKeyhole: () => null }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("button", props, children) }));
vi.stubGlobal("window", { setTimeout, clearTimeout });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

import { SpogomiRefereeApplicationCard } from "./spogomi-referee-application-card";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); }); };
const text = (renderer: ReturnType<typeof create>, value: string) => renderer.root.findAll((node: ReactTestInstance) => typeof node.props.children === "string" && node.props.children.includes(value));

describe("SpogomiRefereeApplicationCard behavior", () => {
  it("clears the previous format and ignores an out-of-order application response", async () => {
    const casual = deferred<Response>();
    const world = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(casual.promise).mockReturnValueOnce(world.promise);
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<SpogomiRefereeApplicationCard eventId="event-1" isAuthenticated divisions={[{ id: "casual", type: "casual" }, { id: "world", type: "world_cup" }]} initialDivisionId="casual" signInHref="/sign-in" />); });
    await settle();

    const select = renderer.root.findByType("select");
    await act(async () => { select.props.onChange({ target: { value: "world" } }); await settle(); });
    expect(text(renderer, "Chargement de votre candidature")).toHaveLength(1);
    world.resolve(response({ application: { applicationId: "world-app", eventId: "event-1", divisionId: "world", status: "candidate", quizVersion: null, regulationVersion: "world-v2", theoryQualified: false, practicalConfirmed: false, qualificationCurrent: true } }));
    await settle();
    expect(text(renderer, "Candidature reçue · quiz à passer")).toHaveLength(1);

    casual.resolve(response({ application: { applicationId: "casual-app", eventId: "event-1", divisionId: "casual", status: "theory_qualified", quizVersion: "casual-v1", regulationVersion: "casual-v1", theoryQualified: true, practicalConfirmed: false, qualificationCurrent: true } }));
    await settle();
    expect(text(renderer, "Qualification théorique réussie")).toHaveLength(0);
    expect(text(renderer, "Candidature reçue · quiz à passer")).toHaveLength(1);
  });
});
