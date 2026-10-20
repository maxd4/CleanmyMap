import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification, NotificationsPage } from "@/lib/notifications/client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

const authState = vi.hoisted(() => ({
  getToken: vi.fn(async () => "token"),
  isLoaded: true,
  isSignedIn: true,
  userId: "user-1" as string | null,
}));
const useAuthMock = vi.hoisted(() => vi.fn(() => authState));
const router = vi.hoisted(() => ({ push: vi.fn() }));
const loadPageMock = vi.hoisted(() => vi.fn());
const markReadMock = vi.hoisted(() => vi.fn());
const loadPreferencesMock = vi.hoisted(() => vi.fn());
const updatePreferencesMock = vi.hoisted(() => vi.fn());
const refreshDecisionStateMock = vi.hoisted(() => vi.fn(async () => new Set<string>()));

vi.mock("@clerk/nextjs", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/components/ui/site-preferences-provider", () => ({ useSitePreferences: () => ({ locale: "fr" }) }));
vi.mock("@/components/notifications/notification-list-item", () => ({
  NotificationListItem: ({ notification, onClick }: { notification: AppNotification; onClick: (notification: AppNotification) => void }) => (
    <button type="button" data-notification-id={notification.id} onClick={() => onClick(notification)}>{notification.title}</button>
  ),
}));
vi.mock("@/lib/notifications/client", () => ({
  loadNotificationsPageForCurrentUser: loadPageMock,
  markNotificationAsReadForCurrentUser: markReadMock,
}));
vi.mock("@/lib/notifications/notification-preferences-client", () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: { informationalEnabled: true, mutedInformationActionIds: [] },
  loadNotificationPreferences: loadPreferencesMock,
  updateNotificationPreferences: updatePreferencesMock,
}));
vi.mock("@/lib/notifications/notification-state", () => ({
  getNotificationActionId: () => null,
  getNotificationDecisionDescriptor: () => null,
  isOptionalInformationNotification: () => false,
  isRedundantGamificationLevelUpNotification: () => false,
  resolveNotificationDisplayState: ({ notification }: { notification: AppNotification }) => notification.read_at ? "read" : "unread",
}));
vi.mock("@/lib/notifications/notification-targets", () => ({ buildNotificationHref: (_payload: unknown, id: string) => `/notifications/${id}` }));
vi.mock("@/lib/notifications/use-notification-decision-state", () => ({
  useNotificationDecisionState: () => ({
    pendingRequestIds: new Set<string>(),
    pendingDecisionKeys: new Set<string>(),
    pendingDecisionNotifications: [],
    missingPendingRequestIds: [],
    treatedNotificationIds: new Set<string>(),
    decisionErrors: {},
    busyDecisionIds: new Set<string>(),
    decisionStateError: false,
    refreshDecisionState: refreshDecisionStateMock,
    handleDecision: vi.fn(),
  }),
}));

import { DashboardNotificationsSection } from "./dashboard-notifications-section";

function notification(id: string): AppNotification {
  return {
    id,
    type: "chat",
    title: `Notification ${id}`,
    content: `Contenu privé ${id}`,
    read_at: null,
    created_at: "2026-10-20T10:00:00.000Z",
    payload: null,
  };
}

function page(items: AppNotification[], nextCursor: NotificationsPage["nextCursor"] = null): NotificationsPage {
  return { notifications: items, nextCursor };
}

function renderSection() {
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<DashboardNotificationsSection />); });
  return renderer;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.userId = "user-1";
  authState.isLoaded = true;
  authState.isSignedIn = true;
  loadPageMock.mockResolvedValue(page([]));
  markReadMock.mockResolvedValue(undefined);
  loadPreferencesMock.mockResolvedValue({ informationalEnabled: true, mutedInformationActionIds: [] });
  updatePreferencesMock.mockResolvedValue({ informationalEnabled: true, mutedInformationActionIds: [] });
});

describe("DashboardNotificationsSection behavior", () => {
  it("keeps the notification corpus empty until the authenticated session is ready", async () => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
    const renderer = renderSection();
    await flush();
    expect(loadPageMock).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ "data-notification-id": "private-1" })).toHaveLength(0);
    expect(renderer.root.findByProps({ role: "status" })).toBeTruthy();
    renderer.unmount();
  });

  it("loads information pages, removes duplicate ids and follows the cursor", async () => {
    const first = notification("one");
    const second = notification("two");
    loadPageMock
      .mockResolvedValueOnce(page([first], { createdAt: first.created_at, id: first.id }))
      .mockResolvedValueOnce(page([first, second]));
    const renderer = renderSection();
    await flush();
    const tabs = renderer.root.findAllByProps({ role: "tab" });
    act(() => tabs[1]?.props.onClick());
    expect(renderer.root.findAllByProps({ "data-notification-id": "one" })).toHaveLength(1);
    const loadMore = renderer.root.findByProps({ children: "Afficher plus" });
    await act(async () => { loadMore.props.onClick(); await flush(); });
    expect(loadPageMock).toHaveBeenLastCalledWith("user-1", authState.getToken, { createdAt: first.created_at, id: first.id });
    expect(renderer.root.findAllByProps({ "data-notification-id": "one" })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "data-notification-id": "two" })).toHaveLength(1);
    renderer.unmount();
  });

  it("marks an information notification as read before navigating", async () => {
    const item = notification("open-me");
    loadPageMock.mockResolvedValue(page([item]));
    const renderer = renderSection();
    await flush();
    act(() => renderer.root.findAllByProps({ role: "tab" })[1]?.props.onClick());
    await act(async () => { renderer.root.findByProps({ "data-notification-id": "open-me" }).props.onClick(); await Promise.resolve(); });
    expect(markReadMock).toHaveBeenCalledWith("user-1", "open-me", authState.getToken);
    expect(router.push).toHaveBeenCalledWith("/notifications/open-me");
    renderer.unmount();
  });

  it("renders an explicit unavailable state after a page error", async () => {
    loadPageMock.mockRejectedValue(new Error("unavailable"));
    const renderer = renderSection();
    await flush();
    expect(renderer.root.findByProps({ children: "Les notifications sont momentanément indisponibles." })).toBeTruthy();
    renderer.unmount();
  });

  it("ignores a page returned for the previous identity", async () => {
    let resolveOld!: (value: NotificationsPage) => void;
    const oldPage = new Promise<NotificationsPage>((resolve) => { resolveOld = resolve; });
    loadPageMock.mockReturnValueOnce(oldPage).mockResolvedValueOnce(page([notification("new")]));
    const renderer = renderSection();
    authState.userId = "user-2";
    act(() => { renderer.update(<DashboardNotificationsSection />); });
    await flush();
    resolveOld(page([notification("old")]));
    await flush();
    act(() => renderer.root.findAllByProps({ role: "tab" })[1]?.props.onClick());
    expect(renderer.root.findAllByProps({ "data-notification-id": "old" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ "data-notification-id": "new" })).toHaveLength(1);
    renderer.unmount();
  });
});
