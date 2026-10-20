import * as React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/notifications/client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const authState = vi.hoisted(() => ({
  getToken: vi.fn(async () => "token"),
  isLoaded: true,
  isSignedIn: true,
  userId: "user-1" as string | null,
}));
const useAuthMock = vi.hoisted(() => vi.fn(() => authState));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const loadNotificationsMock = vi.hoisted(() => vi.fn());
const markReadMock = vi.hoisted(() => vi.fn());
const loadPreferencesMock = vi.hoisted(() => vi.fn());
const refreshDecisionStateMock = vi.hoisted(() => vi.fn(async () => new Set<string>()));
const handleDecisionMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: (props: React.PropsWithChildren<Record<string, unknown>>) => <a {...props} /> }));
vi.mock("@/components/ui/site-preferences-provider", () => ({ useSitePreferences: () => ({ locale: "fr" }) }));
vi.mock("@/components/ui/cmm-count-badge", () => ({ CmmCountBadge: ({ count }: { count: number }) => <span data-count={count} /> }));
vi.mock("@/components/ui/cmm-popover", () => ({
  CmmPopover: (props: { open: boolean; onOpenChange: (open: boolean) => void; renderTrigger: (triggerProps: Record<string, unknown>) => React.ReactNode; children: React.ReactNode }) => (
    <div data-popover="notifications">
      {props.renderTrigger({ onClick: () => props.onOpenChange(!props.open) })}
      {props.open ? props.children : null}
    </div>
  ),
}));
vi.mock("@/components/notifications/notification-list-item", () => ({
  NotificationListItem: ({ notification, onClick }: { notification: AppNotification; onClick: (notification: AppNotification) => void }) => (
    <button type="button" data-notification-id={notification.id} onClick={() => onClick(notification)}>{notification.title}</button>
  ),
}));
vi.mock("@/lib/notifications/client", () => ({
  loadNotificationsForCurrentUser: loadNotificationsMock,
  markNotificationAsReadForCurrentUser: markReadMock,
}));
vi.mock("@/lib/notifications/notification-preferences-client", () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: { informationalEnabled: true, mutedInformationActionIds: [] },
  loadNotificationPreferences: loadPreferencesMock,
}));
vi.mock("@/lib/notifications/notification-state", () => ({
  getNotificationDecisionDescriptor: () => null,
  isOptionalInformationNotification: () => false,
  isRedundantGamificationLevelUpNotification: () => false,
  prioritizeNotificationPreview: (pending: AppNotification[], chronological: AppNotification[], limit: number) => [...pending, ...chronological].slice(0, limit),
  resolveNotificationDisplayState: ({ notification }: { notification: AppNotification }) => notification.read_at ? "read" : "unread",
}));
vi.mock("@/lib/notifications/notification-targets", () => ({ buildNotificationHref: (_payload: unknown, id: string) => `/notifications/${id}` }));
vi.mock("@/lib/notifications/use-notification-decision-state", () => ({
  useNotificationDecisionState: () => ({
    pendingDecisionKeys: new Set<string>(),
    pendingDecisionNotifications: [],
    missingPendingRequestIds: [],
    treatedNotificationIds: new Set<string>(),
    decisionErrors: {},
    busyDecisionIds: new Set<string>(),
    decisionStateError: false,
    refreshDecisionState: refreshDecisionStateMock,
    handleDecision: handleDecisionMock,
  }),
}));

import { NotificationBell } from "./notification-bell";

function notification(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    type: "chat",
    title: `Notification ${id}`,
    content: `Contenu privé ${id}`,
    read_at: null,
    created_at: "2026-10-20T10:00:00.000Z",
    payload: null,
    ...overrides,
  };
}

function renderBell() {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NotificationBell />); });
  return renderer;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.userId = "user-1";
  authState.isLoaded = true;
  authState.isSignedIn = true;
  loadNotificationsMock.mockResolvedValue([]);
  markReadMock.mockResolvedValue(undefined);
  loadPreferencesMock.mockResolvedValue({ informationalEnabled: true, mutedInformationActionIds: [] });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("window", { setInterval, clearInterval });
});

describe("NotificationBell behavior", () => {
  it("does not load or expose private notifications while signed out", async () => {
    authState.isSignedIn = false;
    authState.userId = null;
    const renderer = renderBell();
    await flush();
    expect(loadNotificationsMock).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" })).toBeTruthy();
    expect(renderer.root.findAllByProps({ "data-notification-id": "private-1" })).toHaveLength(0);
    renderer.unmount();
  });

  it("loads a preview, opens it, marks a notification read and navigates", async () => {
    const item = notification("private-1");
    loadNotificationsMock.mockResolvedValue([item]);
    const renderer = renderBell();
    await flush();
    expect(loadNotificationsMock).toHaveBeenCalledWith("user-1", authState.getToken);

    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    act(() => trigger.props.onClick());
    const itemButton = renderer.root.findByProps({ "data-notification-id": "private-1" });
    await act(async () => { itemButton.props.onClick(); await Promise.resolve(); });
    expect(markReadMock).toHaveBeenCalledWith("user-1", "private-1", authState.getToken);
    expect(router.push).toHaveBeenCalledWith("/notifications/private-1");
    renderer.unmount();
  });

  it("polls only while visible and stops polling and listeners on unmount", async () => {
    vi.useFakeTimers();
    const documentListeners = new Map<string, EventListener>();
    const documentMock = {
      visibilityState: "visible",
      addEventListener: vi.fn((type: string, listener: EventListener) => documentListeners.set(type, listener)),
      removeEventListener: vi.fn((type: string) => documentListeners.delete(type)),
    };
    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("window", { setInterval, clearInterval });
    const renderer = renderBell();
    await flush();
    expect(documentMock.addEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    documentMock.visibilityState = "hidden";
    act(() => { documentListeners.get("visibilitychange")?.(new Event("visibilitychange")); });
    const callsWhileHidden = loadNotificationsMock.mock.calls.length;
    vi.advanceTimersByTime(900_000);
    expect(loadNotificationsMock.mock.calls.length).toBe(callsWhileHidden);
    documentMock.visibilityState = "visible";
    await act(async () => { documentListeners.get("visibilitychange")?.(new Event("visibilitychange")); await Promise.resolve(); });
    expect(loadNotificationsMock.mock.calls.length).toBeGreaterThan(callsWhileHidden);
    act(() => renderer.unmount());
    expect(documentMock.removeEventListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    vi.useRealTimers();
  });

  it("ignores a response from a previous Clerk identity", async () => {
    let resolveOld!: (items: AppNotification[]) => void;
    const oldResponse = new Promise<AppNotification[]>((resolve) => { resolveOld = resolve; });
    loadNotificationsMock.mockReturnValueOnce(oldResponse).mockResolvedValueOnce([notification("new")]);
    const renderer = renderBell();
    authState.userId = "user-2";
    act(() => { renderer.update(<NotificationBell />); });
    await flush();
    resolveOld([notification("old")]);
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    act(() => trigger.props.onClick());
    expect(renderer.root.findAllByProps({ "data-notification-id": "old" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-notification-id": "new" })).toHaveLength(1);
    renderer.unmount();
  });

  it("keeps an unavailable notification load fail-closed", async () => {
    loadNotificationsMock.mockRejectedValue(new Error("unavailable"));
    const renderer = renderBell();
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    act(() => trigger.props.onClick());
    expect(renderer.root.findAllByProps({ "data-notification-id": "private-1" })).toHaveLength(0);
    renderer.unmount();
  });
});
