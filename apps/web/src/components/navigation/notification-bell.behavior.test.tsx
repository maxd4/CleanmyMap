import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/notifications/client";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type ClickProps = { onClick: () => void | Promise<void> };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

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
const preferencesLocale = vi.hoisted(() => ({ value: "fr" as "fr" | "en" }));
const notificationStateMocks = vi.hoisted(() => ({
  getDecisionDescriptor: vi.fn((payload: unknown) => { void payload; return null as null | { kind: "action_result"; requestId: string; actionId?: string }; }),
  isOptional: vi.fn((notification: AppNotification) => { void notification; return false; }),
  isRedundant: vi.fn((notification: AppNotification, notifications?: AppNotification[]) => { void notification; void notifications; return false; }),
  prioritize: vi.fn((pending: AppNotification[], chronological: AppNotification[], limit: number) => [...pending, ...chronological].slice(0, limit)),
  resolveDisplay: vi.fn(({ notification }: { notification: AppNotification }) => (notification.read_at ? "read" : "unread") as "read" | "unread" | "decision_pending" | "treated" | "unavailable"),
}));
const notificationTargetMock = vi.hoisted(() => vi.fn((_payload: unknown, id: string): string | null => `/notifications/${id}`));
const decisionStateMock = vi.hoisted(() => ({
  pendingDecisionKeys: new Set<string>(),
  pendingDecisionNotifications: [] as AppNotification[],
  missingPendingRequestIds: [] as string[],
  treatedNotificationIds: new Set<string>(),
  decisionErrors: {} as Record<string, string>,
  busyDecisionIds: new Set<string>(),
  decisionStateError: false,
  refreshDecisionState: refreshDecisionStateMock,
  handleDecision: handleDecisionMock,
}));

vi.mock("@clerk/nextjs", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: (props: React.PropsWithChildren<Record<string, unknown>>) => <a {...props} /> }));
vi.mock("@/components/ui/site-preferences-provider", () => ({ useSitePreferences: () => ({ locale: preferencesLocale.value }) }));
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
  NotificationListItem: ({ notification, onClick, decision }: { notification: AppNotification; onClick: (notification: AppNotification) => void; decision?: { kind?: string; onDecision: (choice: string) => void } }) => (
    <>
      <button type="button" data-notification-id={notification.id} data-has-decision={String(Boolean(decision))} onClick={() => onClick(notification)}>{notification.title}</button>
      {decision ? <button type="button" data-decision-action={notification.id} onClick={() => decision.onDecision("accept")}>decision</button> : null}
    </>
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
  getNotificationDecisionDescriptor: notificationStateMocks.getDecisionDescriptor,
  isOptionalInformationNotification: notificationStateMocks.isOptional,
  isRedundantGamificationLevelUpNotification: notificationStateMocks.isRedundant,
  prioritizeNotificationPreview: notificationStateMocks.prioritize,
  resolveNotificationDisplayState: notificationStateMocks.resolveDisplay,
}));
vi.mock("@/lib/notifications/notification-targets", () => ({ buildNotificationHref: notificationTargetMock }));
vi.mock("@/lib/notifications/use-notification-decision-state", () => ({
  useNotificationDecisionState: () => decisionStateMock,
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

function renderBell(props: { ribbonChrome?: RibbonChrome } = {}) {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<NotificationBell {...props} />); });
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
  preferencesLocale.value = "fr";
  decisionStateMock.pendingDecisionKeys = new Set();
  decisionStateMock.pendingDecisionNotifications = [];
  decisionStateMock.missingPendingRequestIds = [];
  decisionStateMock.treatedNotificationIds = new Set();
  decisionStateMock.decisionErrors = {};
  decisionStateMock.busyDecisionIds = new Set();
  decisionStateMock.decisionStateError = false;
  notificationStateMocks.getDecisionDescriptor.mockImplementation(() => null);
  notificationStateMocks.isOptional.mockImplementation(() => false);
  notificationStateMocks.isRedundant.mockImplementation(() => false);
  notificationStateMocks.prioritize.mockImplementation((pending, chronological, limit) => [...pending, ...chronological].slice(0, limit));
  notificationStateMocks.resolveDisplay.mockImplementation(({ notification }) => notification.read_at ? "read" : "unread");
  notificationTargetMock.mockImplementation((_payload, id) => `/notifications/${id}`);
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

  it("waits for a usable Clerk user id even when the session is signed in", async () => {
    authState.userId = null;
    const renderer = renderBell();
    await flush();
    expect(loadNotificationsMock).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("loads a preview, opens it, marks a notification read and navigates", async () => {
    const item = notification("private-1");
    loadNotificationsMock.mockResolvedValue([item]);
    const renderer = renderBell();
    await flush();
    expect(loadNotificationsMock).toHaveBeenCalledWith("user-1", authState.getToken);

    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    await act(async () => {
      await propsOf<ClickProps>(trigger).onClick();
      await flush();
    });
    const itemButton = renderer.root.findByProps({ "data-notification-id": "private-1" });
    await act(async () => { await propsOf<ClickProps>(itemButton).onClick(); await Promise.resolve(); });
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
    loadNotificationsMock.mockReturnValueOnce(oldResponse).mockResolvedValue([notification("new")]);
    const renderer = renderBell();
    authState.userId = "user-2";
    act(() => { renderer.update(<NotificationBell />); });
    await flush();
    resolveOld([notification("old")]);
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    await act(async () => {
      await propsOf<ClickProps>(trigger).onClick();
      await flush();
    });
    expect(renderer.root.findAllByProps({ "data-notification-id": "old" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-notification-id": "new" })).toHaveLength(1);
    renderer.unmount();
  });

  it("keeps an unavailable notification load fail-closed", async () => {
    loadNotificationsMock.mockRejectedValue(new Error("unavailable"));
    const renderer = renderBell();
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    await act(async () => { await propsOf<ClickProps>(trigger).onClick(); });
    expect(renderer.root.findAllByProps({ "data-notification-id": "private-1" })).toHaveLength(0);
    renderer.unmount();
  });

  it("filters redundant and muted informational entries while preserving ordinary entries", async () => {
    const optional = notification("optional");
    const redundant = notification("redundant", { type: "gamification_recognition" });
    const ordinary = notification("ordinary");
    loadNotificationsMock.mockResolvedValue([optional, redundant, ordinary]);
    loadPreferencesMock.mockResolvedValue({ informationalEnabled: false, mutedInformationActionIds: [] });
    notificationStateMocks.isOptional.mockImplementation((item: AppNotification) => item.id === "optional");
    notificationStateMocks.isRedundant.mockImplementation((item: AppNotification) => item.id === "redundant");
    const renderer = renderBell();
    await flush();
    await act(async () => propsOf<ClickProps>(renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" })).onClick());
    expect(renderer.root.findAllByProps({ "data-notification-id": "optional" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-notification-id": "redundant" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-notification-id": "ordinary" })).toHaveLength(1);
    renderer.unmount();
  });

  it("does not duplicate an in-flight fetch and ignores visibility events after unmount", async () => {
    let resolveNotifications!: (items: AppNotification[]) => void;
    const pending = new Promise<AppNotification[]>((resolve) => { resolveNotifications = resolve; });
    loadNotificationsMock.mockReturnValueOnce(pending);
    let visibilityListener!: EventListener;
    const documentMock = {
      visibilityState: "visible",
      addEventListener: vi.fn((_type: string, listener: EventListener) => { visibilityListener = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("document", documentMock);
    const renderer = renderBell();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const callsDuringFetch = loadNotificationsMock.mock.calls.length;
    act(() => visibilityListener(new Event("visibilitychange")));
    expect(loadNotificationsMock.mock.calls.length).toBe(callsDuringFetch);
    act(() => renderer.unmount());
    act(() => visibilityListener(new Event("visibilitychange")));
    resolveNotifications([]);
    await flush();
  });

  it("renders the English empty state and applies the ribbon chrome style", async () => {
    preferencesLocale.value = "en";
    const renderer = renderBell({
      ribbonChrome: {
        backgroundImage: "linear-gradient(red, blue)",
        backgroundColor: "rgb(1, 2, 3)",
        borderColor: "rgb(4, 5, 6)",
        boxShadow: "0 1px 2px rgb(0 0 0 / 20%)",
      },
    });
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    await act(async () => propsOf<ClickProps>(trigger).onClick());
    expect(renderer.root.findByProps({ children: "No notifications" })).toBeTruthy();
    renderer.unmount();
  });

  it("shows loading, recovers with data, and uses default preferences after a preference failure", async () => {
    let resolveNotifications!: (items: AppNotification[]) => void;
    const pendingResponse = new Promise<AppNotification[]>((resolve) => { resolveNotifications = resolve; });
    const item = notification("recovered");
    loadNotificationsMock.mockReturnValueOnce(pendingResponse);
    loadPreferencesMock.mockRejectedValueOnce(new Error("preferences unavailable"));
    const renderer = renderBell();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => { void propsOf<ClickProps>(renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" })).onClick(); });
    expect(renderer.root.findAllByProps({ role: "status" }).length).toBeGreaterThan(0);

    resolveNotifications([item]);
    await flush();
    expect(renderer.root.findByProps({ "data-notification-id": "recovered" })).toBeTruthy();
    renderer.unmount();
  });

  it("polls at the open cadence and closes through both footer controls", async () => {
    vi.useFakeTimers();
    const renderer = renderBell();
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" });
    const initialCalls = loadNotificationsMock.mock.calls.length;
    act(() => { void propsOf<ClickProps>(trigger).onClick(); });
    vi.advanceTimersByTime(300_000);
    await flush();
    expect(loadNotificationsMock.mock.calls.length).toBeGreaterThan(initialCalls);

    const openLink = renderer.root.findByProps({ href: "/dashboard?tab=notifications#notifications" });
    act(() => { void openLink.props.onClick(); });
    act(() => { void propsOf<ClickProps>(trigger).onClick(); });
    const closeButton = renderer.root.findByProps({ children: "Fermer" });
    act(() => { void closeButton.props.onClick(); });
    renderer.unmount();
    vi.useRealTimers();
  });

  it("does not navigate when marking a notification fails and its target is unavailable", async () => {
    const item = notification("no-target");
    loadNotificationsMock.mockResolvedValue([item]);
    markReadMock.mockRejectedValueOnce(new Error("read unavailable"));
    notificationTargetMock.mockReturnValueOnce(null);
    const renderer = renderBell();
    await flush();
    await act(async () => propsOf<ClickProps>(renderer.root.findByProps({ "aria-label": "Notifications (0 à traiter)" })).onClick());
    await act(async () => { await propsOf<ClickProps>(renderer.root.findByProps({ "data-notification-id": "no-target" })).onClick(); });
    expect(markReadMock).toHaveBeenCalledWith("user-1", "no-target", authState.getToken);
    expect(router.push).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("renders pending decisions, missing-request status and English labels", async () => {
    preferencesLocale.value = "en";
    const decisionNotification = notification("decision-1", {
      type: "action_event",
      payload: { eventType: "action_event", subtype: "action_result", actionId: "action-1" },
    });
    decisionStateMock.pendingDecisionKeys = new Set(["action_result:action-1"]);
    decisionStateMock.pendingDecisionNotifications = [decisionNotification];
    decisionStateMock.missingPendingRequestIds = ["action-1"];
    decisionStateMock.busyDecisionIds = new Set(["decision-1"]);
    decisionStateMock.decisionErrors = { "decision-1": "Decision unavailable" };
    notificationStateMocks.getDecisionDescriptor.mockReturnValue({ kind: "action_result", requestId: "action-1", actionId: "action-1" });
    notificationStateMocks.resolveDisplay.mockReturnValue("decision_pending");
    const renderer = renderBell();
    await flush();
    const trigger = renderer.root.findByProps({ "aria-label": "Notifications (1 à traiter)" });
    act(() => { void propsOf<ClickProps>(trigger).onClick(); });
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Certaines décisions nécessitent une actualisation.");
    expect(renderer.root.findByProps({ "data-has-decision": "true" })).toBeTruthy();
    act(() => { void renderer.root.findByProps({ "data-decision-action": "decision-1" }).props.onClick(); });
    expect(handleDecisionMock).toHaveBeenCalledWith(decisionNotification, "accept");
    renderer.unmount();
  });
});
