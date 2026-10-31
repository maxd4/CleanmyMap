import { act, create, type ReactTestInstance } from "react-test-renderer";
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

type BuddyButtonProps = {
  children?: string;
  onClick?: () => void | Promise<void>;
};

function getButtonProps(button: ReactTestInstance): BuddyButtonProps {
  return button.props as BuddyButtonProps;
}

function buttonWithLabel(renderer: ReturnType<typeof create>, label: string): ReactTestInstance | undefined {
  return renderer.root.findAllByType("button").find((button) => getButtonProps(button).children === label);
}

function hasButtonWithLabel(renderer: ReturnType<typeof create>, label: string): boolean {
  return renderer.root.findAllByType("button").some((button) => getButtonProps(button).children === label);
}

async function clickButton(renderer: ReturnType<typeof create>, label: string): Promise<void> {
  const button = buttonWithLabel(renderer, label);
  if (!button) return;
  const onClick = getButtonProps(button).onClick;
  await onClick?.();
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

    expect(hasButtonWithLabel(renderer, "Retirer")).toBe(false);
    expect(buttonWithLabel(renderer, "Accepter")).toBeDefined();
    expect(buttonWithLabel(renderer, "Refuser")).toBeDefined();

    await act(async () => { await clickButton(renderer, "Accepter"); });
    await act(async () => { await clickButton(renderer, "Refuser"); });

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

    expect(hasButtonWithLabel(renderer, "Accepter")).toBe(false);
    expect(hasButtonWithLabel(renderer, "Refuser")).toBe(false);
    const withdraw = buttonWithLabel(renderer, "Retirer");
    expect(withdraw).toBeDefined();

    await act(async () => { await clickButton(renderer, "Retirer"); });

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
