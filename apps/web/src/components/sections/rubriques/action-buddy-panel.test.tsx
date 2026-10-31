import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionBuddyPanel } from "./action-buddy-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const baseState = {
  status: "ok",
  actionId: "action-1",
  availability: null,
  request: null,
  proposals: [],
  openRequests: [],
  matchedRequest: null,
  matchedPartner: null,
};

function buttonWithLabel(renderer: ReturnType<typeof create>, label: string) {
  return renderer.root.findAllByType("button").find((button) => button.props.children === label);
}

function responseFor(state: object): Response {
  return new Response(JSON.stringify(state), { status: 200, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("ActionBuddyPanel proposal decisions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      return responseFor(baseState);
    }));
  });

  it("shows received proposals to the requester and invokes accept/reject endpoints", async () => {
    const requesterState = {
      ...baseState,
      receivedProposals: [{ id: "received-1", status: "pending" }],
      sentProposals: [],
    };
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (init?.method) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      return responseFor(requesterState);
    });

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<ActionBuddyPanel actionId="action-mentor" fr />);
      await Promise.resolve();
    });

    expect(renderer.root.findAllByType("button").some((button) => button.props.children === "Retirer")).toBe(false);
    expect(buttonWithLabel(renderer, "Accepter")).toBeDefined();
    expect(buttonWithLabel(renderer, "Refuser")).toBeDefined();

    await act(async () => { await buttonWithLabel(renderer, "Accepter")?.props.onClick(); });
    await act(async () => { await buttonWithLabel(renderer, "Refuser")?.props.onClick(); });

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.some(([input, init]) => String(input).endsWith("/proposals/received-1/accept") && init?.method === "POST")).toBe(true);
    expect(calls.some(([input, init]) => String(input).endsWith("/proposals/received-1/reject") && init?.method === "POST")).toBe(true);
    expect(calls.filter(([, init]) => !init?.method).length).toBeGreaterThanOrEqual(3);
  });

  it("shows sent proposals to the mentor and invokes only the withdraw endpoint", async () => {
    const mentorState = {
      ...baseState,
      availability: { action_id: "action-1", mentor_user_id: "mentor-1" },
      sentProposals: [{ id: "sent-1", status: "pending" }],
      receivedProposals: [],
    };
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (init?.method) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      return responseFor(mentorState);
    });

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<ActionBuddyPanel actionId="action-1" fr />);
      await Promise.resolve();
    });

    expect(renderer.root.findAllByType("button").some((button) => button.props.children === "Accepter")).toBe(false);
    expect(renderer.root.findAllByType("button").some((button) => button.props.children === "Refuser")).toBe(false);
    const withdraw = buttonWithLabel(renderer, "Retirer");
    expect(withdraw).toBeDefined();

    await act(async () => { await withdraw?.props.onClick(); });

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.some(([input, init]) => String(input).endsWith("/proposals/sent-1") && init?.method === "DELETE")).toBe(true);
    expect(calls.some(([input]) => String(input).includes("/proposals/sent-1/accept"))).toBe(false);
    expect(calls.some(([input]) => String(input).includes("/proposals/sent-1/reject"))).toBe(false);
    expect(calls.filter(([, init]) => !init?.method).length).toBeGreaterThanOrEqual(2);
  });

  it("shows the matched partner's canonical private DM link", async () => {
    const matchedState = {
      ...baseState,
      request: { id: "request-matched", status: "matched" },
      matchedRequest: { id: "request-matched", status: "matched" },
      matchedPartner: { userId: "mentor-1", displayName: "Mentor privé", handle: "mentor" },
      sentProposals: [],
      receivedProposals: [],
    };
    vi.mocked(fetch).mockImplementation(async (_input, init) => {
      if (init?.method) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      return responseFor(matchedState);
    });

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<ActionBuddyPanel actionId="action-matched" fr />);
      await Promise.resolve();
    });

    const contactHref = "/sections/messagerie?tab=dm&channel=dm&actionId=action-matched&buddyRequestId=request-matched&recipientId=mentor-1&recipientLabel=Mentor%20priv%C3%A9&recipientHandle=mentor";
    expect(renderer.root.findAllByProps({ href: contactHref }).length).toBeGreaterThan(0);
  });
});
