import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatActionModeration } from "./chat-action-moderation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function renderModeration(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<ChatActionModeration actionId="action-1" tone="light" />); });
  return renderer;
}

describe("ChatActionModeration behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders no moderation surface for a foreign or insufficient scope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "forbidden" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderModeration();
    await act(async () => { await flush(); });

    expect(renderer.root.findAllByType("section")).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/chat/action-exclusions?actionId=action-1");
    renderer.unmount();
  });

  it("searches only after the moderator scope is confirmed and persists an exclusion once", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ canModerate: true, exclusions: [] }))
      .mockResolvedValueOnce(jsonResponse({ users: [{ id: "member-2", display_name: "Alice", handle: "alice" }] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ canModerate: true, exclusions: [{ user_id: "member-2", reason: "spam", active: true }] }));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderModeration();
    await act(async () => { await flush(); });

    const queryInput = renderer.root.findByProps({ id: "action-discussion-user" });
    act(() => { queryInput.props.onChange({ target: { value: "Al" } }); });
    await act(async () => {
      vi.advanceTimersByTime(200);
      await flush();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/chat/users?q=Al", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    const resultButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Alice");
    expect(resultButton).toBeDefined();
    act(() => { resultButton?.props.onClick(); });
    const reasonInput = renderer.root.findByProps({ "aria-label": "Motif optionnel" });
    act(() => { reasonInput.props.onChange({ target: { value: "spam" } }); });
    const excludeButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Exclure");
    await act(async () => {
      excludeButton?.props.onClick();
      await flush();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/chat/action-exclusions", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ actionId: "action-1", userId: "member-2", reason: "spam" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/chat/action-exclusions?actionId=action-1");
    expect(renderer.root.findAllByProps({ children: "member-2" }).length).toBeGreaterThan(0);
    renderer.unmount();
  });

  it("keeps an HTTP moderation failure visible and does not claim success", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ canModerate: true, exclusions: [] }))
      .mockResolvedValueOnce(jsonResponse({ users: [{ id: "member-2", display_name: "Alice", handle: "alice" }] }))
      .mockResolvedValueOnce(jsonResponse({ error: "permission revoked" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderModeration();
    await act(async () => { await flush(); });
    const queryInput = renderer.root.findByProps({ id: "action-discussion-user" });
    act(() => { queryInput.props.onChange({ target: { value: "Al" } }); });
    await act(async () => { vi.advanceTimersByTime(200); await flush(); });
    const resultButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Alice");
    act(() => { resultButton?.props.onClick(); });
    const excludeButton = renderer.root.findAllByType("button").find((button) => button.props.children === "Exclure");
    await act(async () => { excludeButton?.props.onClick(); await flush(); });

    const alert = renderer.root.findByProps({ role: "alert" });
    expect(alert.props.children).toBe("permission revoked");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    renderer.unmount();
  });
});
