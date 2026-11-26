"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { tabItemClassName, tabStripClassName } from "@/components/ui/cmm-tab-strip.styles";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { logFailure } from "@/lib/logging/failure-log";
import {
  loadNotificationsPageForCurrentUser,
  markNotificationAsReadForCurrentUser,
  type AppNotification,
  type NotificationPageCursor,
} from "@/lib/notifications/client";
import {
  getNotificationDecisionDescriptor,
  getNotificationActionId,
  isOptionalInformationNotification,
  isRedundantGamificationLevelUpNotification,
  resolveNotificationDisplayState,
  type NotificationDisplayState,
} from "@/lib/notifications/notification-state";
import { useNotificationRequestIdentity } from "@/lib/notifications/use-notification-request-identity";
import { useNotificationDecisionState } from "@/lib/notifications/use-notification-decision-state";
import { buildNotificationHref } from "@/lib/notifications/notification-targets";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications/notification-preferences-client";
import type { NotificationIdentity } from "@/lib/notifications/identity";

type NotificationAuthState = Pick<
  ReturnType<typeof useAuth>,
  "getToken" | "isLoaded" | "isSignedIn" | "userId"
>;

function navigateToNotification(router: { push: (href: string) => void }, notification: AppNotification) {
  const href = buildNotificationHref(notification.payload, notification.id);
  if (href) router.push(href);
}

async function markDashboardNotificationAsRead(params: {
  notification: AppNotification;
  userId: string;
  getToken: NotificationAuthState["getToken"];
  router: { push: (href: string) => void };
  markReadInFlightRef: MutableRefObject<ReturnType<ReturnType<typeof useNotificationRequestIdentity>["getRequest"]> | null>;
  getRequest: ReturnType<typeof useNotificationRequestIdentity>["getRequest"];
  isCurrentRequest: ReturnType<typeof useNotificationRequestIdentity>["isCurrentRequest"];
  setAllNotifications: Dispatch<SetStateAction<AppNotification[]>>;
}): Promise<void> {
  const { notification, userId, getToken, router, markReadInFlightRef, getRequest, isCurrentRequest, setAllNotifications } = params;
  const request = getRequest();
  if (markReadInFlightRef.current && isCurrentRequest(markReadInFlightRef.current)) return;
  markReadInFlightRef.current = request;
  try {
    await markNotificationAsReadForCurrentUser(userId, notification.id, getToken);
    if (!isCurrentRequest(request)) return;
    setAllNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
  } catch (err) {
    if (isCurrentRequest(request)) logFailure("Dashboard notifications", "Mark as read failed", err, { id: notification.id });
  } finally {
    if (isCurrentRequest(request) && markReadInFlightRef.current === request) markReadInFlightRef.current = null;
  }
  navigateToNotification(router, notification);
}

function canLoadMoreDashboardNotifications(params: {
  userId: string | null | undefined;
  cursor: NotificationPageCursor | null;
  hasMore: boolean;
  loadingMore: boolean;
  inFlight: NotificationIdentity | null;
  isCurrentRequest: ReturnType<typeof useNotificationRequestIdentity>["isCurrentRequest"];
}): boolean {
  return Boolean(
    params.userId &&
      params.cursor &&
      params.hasMore &&
      !params.loadingMore &&
      !(params.inFlight && params.isCurrentRequest(params.inFlight)),
  );
}

export function DashboardNotificationsSection() {
  const auth = useAuth();
  const identityKey = auth.isLoaded && auth.isSignedIn && auth.userId ? auth.userId : "signed-out";

  return <DashboardNotificationsSession key={identityKey} auth={auth} />;
}

function DashboardNotificationsSession({ auth }: { auth: NotificationAuthState }) {
  const { getToken, isLoaded, isSignedIn, userId } = auth;
  const { locale } = useSitePreferences();
  const router = useRouter();
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [view, setView] = useState<"pending" | "information">("pending");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [nextCursor, setNextCursor] = useState<NotificationPageCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const { getRequest, isCurrentRequest } = useNotificationRequestIdentity(userId);
  const fetchInFlightRef = useRef<ReturnType<typeof getRequest> | null>(null);
  const loadMoreInFlightRef = useRef<ReturnType<typeof getRequest> | null>(null);
  const markReadInFlightRef = useRef<ReturnType<typeof getRequest> | null>(null);
  const decisionState = useNotificationDecisionState({ getRequest, isCurrentRequest, getToken, scope: "Dashboard notifications" });
  const refreshDecisionState = decisionState.refreshDecisionState;

  const fetchNotifications = useCallback(async () => {
    const request = getRequest();
    if (!request.userId) return;
    if (fetchInFlightRef.current && isCurrentRequest(fetchInFlightRef.current)) return;

    fetchInFlightRef.current = request;
    setLoading(true);
    setError(false);
    try {
      const [page, , loadedPreferences] = await Promise.all([
        loadNotificationsPageForCurrentUser(request.userId, getToken),
        refreshDecisionState(request),
        loadNotificationPreferences().catch(() => DEFAULT_NOTIFICATION_PREFERENCES),
      ]);
      if (!isCurrentRequest(request)) return;
      setAllNotifications(page.notifications);
      setNextCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
      setPreferences(loadedPreferences);
    } catch (err) {
      if (!isCurrentRequest(request)) return;
      setError(true);
      logFailure("Dashboard notifications", "Fetch failed", err);
    } finally {
      if (isCurrentRequest(request)) {
        setLoading(false);
        if (fetchInFlightRef.current === request) fetchInFlightRef.current = null;
      }
    }
  }, [getRequest, getToken, isCurrentRequest, refreshDecisionState]);

  const loadMoreNotifications = async () => {
    const request = getRequest();
    const currentUserId = request.userId;
    if (!canLoadMoreDashboardNotifications({
      userId: currentUserId,
      cursor: nextCursor,
      hasMore,
      loadingMore,
      inFlight: loadMoreInFlightRef.current,
      isCurrentRequest,
    })) return;

    const cursor = nextCursor;
    if (!currentUserId) return;
    loadMoreInFlightRef.current = request;
    setLoadingMore(true);
    setError(false);
    try {
      const page = await loadNotificationsPageForCurrentUser(currentUserId, getToken, cursor);
      if (!isCurrentRequest(request)) return;
      setAllNotifications((previous) => appendUniqueNotifications(previous, page.notifications));
      setNextCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
      await refreshDecisionState(request);
    } catch (err) {
      if (!isCurrentRequest(request)) return;
      setError(true);
      logFailure("Dashboard notifications", "Load more failed", err);
    } finally {
      if (isCurrentRequest(request)) {
        setLoadingMore(false);
        if (loadMoreInFlightRef.current === request) loadMoreInFlightRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ Promise.resolve().then(() => fetchNotifications()).catch(() => undefined);
  }, [fetchNotifications, isLoaded, isSignedIn, userId]);

  const stateFor = useCallback((notification: AppNotification): NotificationDisplayState => {
    return resolveNotificationDisplayState({
      notification,
      pendingRequestIds: decisionState.pendingRequestIds,
      pendingDecisionKeys: decisionState.pendingDecisionKeys,
      treatedNotificationIds: decisionState.treatedNotificationIds,
    });
  }, [decisionState.pendingDecisionKeys, decisionState.pendingRequestIds, decisionState.treatedNotificationIds]);

  const pendingNotifications = useMemo(
    () => decisionState.pendingDecisionNotifications.filter((notification) => stateFor(notification) === "decision_pending"),
    [decisionState.pendingDecisionNotifications, stateFor],
  );
  const pendingNotificationIds = useMemo(
    () => new Set(pendingNotifications.map((notification) => notification.id)),
    [pendingNotifications],
  );
  const informationNotifications = useMemo(
    () => allNotifications.filter((notification) => {
      if (isRedundantGamificationLevelUpNotification(notification, allNotifications)) return false;
      if (pendingNotificationIds.has(notification.id) || stateFor(notification) === "decision_pending") return false;
      if (!isOptionalInformationNotification(notification)) return true;
      const actionId = getNotificationActionId(notification.payload);
      return preferences.informationalEnabled
        && (!actionId || !preferences.mutedInformationActionIds.includes(actionId));
    }),
    [allNotifications, pendingNotificationIds, preferences, stateFor],
  );
  const visibleNotifications = view === "pending" ? pendingNotifications : informationNotifications;
  const pendingCount = decisionState.pendingDecisionKeys.size;

  const markAsRead = (notification: AppNotification) => {
    if (!userId) return;
    void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ markDashboardNotificationAsRead({
      notification, userId, getToken, router, markReadInFlightRef, getRequest,
      isCurrentRequest, setAllNotifications,
    });
  };

  const muteActionInformation = async (actionId: string) => {
    try {
      const nextPreferences = await updateNotificationPreferences({ actionId, muted: true });
      setPreferences(nextPreferences);
    } catch (err) {
      logFailure("Dashboard notifications", "Mute action information failed", err, { actionId });
    }
  };

  return <DashboardNotificationsView isLoaded={isLoaded} locale={locale === "fr" ? "fr" : "en"} view={view} setView={setView} loading={loading} error={error} loadingMore={loadingMore} visibleNotifications={visibleNotifications} pendingCount={pendingCount} missingPendingCount={decisionState.missingPendingRequestIds.length} hasMore={hasMore} decisionState={decisionState} stateFor={stateFor} onOpen={markAsRead} onMuteAction={(actionId) => { void /* fire-and-forget -- the notification view owns preference state and errors. */ muteActionInformation(actionId); }} onLoadMore={loadMoreNotifications} />;
}

function DashboardNotificationsView({
  isLoaded,
  locale,
  view,
  setView,
  loading,
  error,
  loadingMore,
  visibleNotifications,
  pendingCount,
  missingPendingCount,
  hasMore,
  decisionState,
  stateFor,
  onOpen,
  onMuteAction,
  onLoadMore,
}: {
  isLoaded: boolean;
  locale: "fr" | "en";
  view: "pending" | "information";
  setView: (view: "pending" | "information") => void;
  loading: boolean;
  error: boolean;
  loadingMore: boolean;
  visibleNotifications: AppNotification[];
  pendingCount: number;
  missingPendingCount: number;
  hasMore: boolean;
  decisionState: ReturnType<typeof useNotificationDecisionState>;
  stateFor: (notification: AppNotification) => NotificationDisplayState;
  onOpen: (notification: AppNotification) => void;
  onMuteAction: (actionId: string) => void;
  onLoadMore: () => Promise<void>;
}) {
  return (
    <section id="notifications" aria-labelledby="dashboard-notifications-title" className="scroll-mt-28">
      <CmmCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="dashboard-notifications-title" className="text-xl font-bold cmm-text-primary">Notifications</h2>
        </div>
        {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" role="status" aria-label={locale === "fr" ? "Chargement" : "Loading"} /> : null}
      </div>
      <div
        role="tablist"
        aria-label={locale === "fr" ? "Vues des notifications" : "Notification views"}
        className={tabStripClassName("family", "grid-cols-2")}
        onKeyDown={(event) => {
          const target = event.key === "Home" ? "pending"
            : event.key === "End" ? "information"
            : event.key === "ArrowLeft" || event.key === "ArrowRight"
              ? (view === "pending" ? "information" : "pending") : null;
          if (!target) return;
          event.preventDefault();
          setView(target);
          event.currentTarget.querySelector<HTMLButtonElement>(`#dashboard-notification-tab-${target}`)?.focus();
        }}
      >
        <button type="button" role="tab" id="dashboard-notification-tab-pending"
          aria-selected={view === "pending"} aria-controls="dashboard-notification-panel"
          tabIndex={view === "pending" ? 0 : -1} onClick={() => setView("pending")}
          className={tabItemClassName("family", view === "pending")}>
          {locale === "fr" ? "À traiter" : "To review"}{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </button>
        <button type="button" role="tab" id="dashboard-notification-tab-information"
          aria-selected={view === "information"} aria-controls="dashboard-notification-panel"
          tabIndex={view === "information" ? 0 : -1} onClick={() => setView("information")}
          className={tabItemClassName("family", view === "information")}>
          {locale === "fr" ? "Informations" : "Information"}
        </button>
      </div>
      <div id="dashboard-notification-panel" role="tabpanel"
        aria-labelledby={`dashboard-notification-tab-${view}`} tabIndex={0}>
      {missingPendingCount > 0 && view === "pending" ? <p className="pt-3 text-sm cmm-text-secondary" role="alert">{missingPendingCount} décision(s) métier sont encore ouvertes, mais leur notification n&apos;est pas accessible dans cette session. Actualisez avant de décider.</p> : null}
      <DashboardNotificationContent
        isLoaded={isLoaded}
        locale={locale}
        view={view}
        loading={loading}
        error={error}
        loadingMore={loadingMore}
        visibleNotifications={visibleNotifications}
        missingPendingCount={missingPendingCount}
        hasMore={hasMore}
        decisionState={decisionState}
        stateFor={stateFor}
        onOpen={onOpen}
        onMuteAction={onMuteAction}
        onLoadMore={onLoadMore}
      />
      </div>
      </CmmCard>
    </section>
  );
}

function DashboardNotificationContent({
  isLoaded,
  locale,
  view,
  loading,
  error,
  loadingMore,
  visibleNotifications,
  missingPendingCount,
  hasMore,
  decisionState,
  stateFor,
  onOpen,
  onMuteAction,
  onLoadMore,
}: {
  isLoaded: boolean;
  locale: "fr" | "en";
  view: "pending" | "information";
  loading: boolean;
  error: boolean;
  loadingMore: boolean;
  visibleNotifications: AppNotification[];
  missingPendingCount: number;
  hasMore: boolean;
  decisionState: ReturnType<typeof useNotificationDecisionState>;
  stateFor: (notification: AppNotification) => NotificationDisplayState;
  onOpen: (notification: AppNotification) => void;
  onMuteAction: (actionId: string) => void;
  onLoadMore: () => Promise<void>;
}) {
  if (decisionState.decisionStateError && missingPendingCount === 0) {
    return <p className="pt-3 text-sm cmm-text-secondary" role="status">Les décisions disponibles n&apos;ont pas pu être actualisées.</p>;
  }
  if (!isLoaded || (loading && visibleNotifications.length === 0)) {
    return <DashboardNotificationsLoading locale={locale} />;
  }
  if (error && visibleNotifications.length === 0) {
    return <p className="pt-5 text-sm leading-relaxed cmm-text-primary">{locale === "fr" ? "Les notifications sont momentanément indisponibles." : "Notifications are temporarily unavailable."}</p>;
  }
  if (view === "pending" && missingPendingCount > 0 && visibleNotifications.length === 0) {
    return <div className="space-y-2 pt-6 text-center"><CheckMark /><p className="text-sm font-semibold cmm-text-primary">Certaines décisions ne peuvent pas être affichées</p></div>;
  }
  if (visibleNotifications.length === 0) {
    return <div className="space-y-2 pt-6 text-center"><CheckMark /><p className="text-sm font-semibold cmm-text-primary">{view === "pending" ? "Aucune décision à traiter" : "Aucune notification"}</p>{view === "information" && hasMore ? <DashboardLoadMoreButton loadingMore={loadingMore} onLoadMore={onLoadMore} /> : null}</div>;
  }
  return (
    <>
      <DashboardNotificationList visibleNotifications={visibleNotifications} locale={locale} stateFor={stateFor} decisionState={decisionState} onOpen={onOpen} onMuteAction={onMuteAction} />
      {error ? <p className="pt-4 text-sm leading-relaxed cmm-text-danger" role="alert">Le chargement des notifications a échoué.</p> : null}
      {view === "information" ? (hasMore ? <DashboardLoadMoreButton loadingMore={loadingMore} onLoadMore={onLoadMore} /> : <p className="pt-5 text-center text-xs font-semibold uppercase tracking-[0.16em] cmm-text-secondary">Fin de l&apos;historique des notifications</p>) : null}
    </>
  );
}

function DashboardNotificationsLoading({ locale }: { locale: "fr" | "en" }) {
  return <div className="space-y-3 pt-5" role="status" aria-live="polite" aria-busy="true" aria-label={locale === "fr" ? "Chargement des notifications" : "Loading notifications"}><CmmSkeleton className="h-14" /><CmmSkeleton className="h-14" /></div>;
}

function DashboardLoadMoreButton({ loadingMore, onLoadMore }: { loadingMore: boolean; onLoadMore: () => Promise<void> }) {
  return <CmmButton type="button" onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ onLoadMore(); }} loading={loadingMore} tone="tertiary" width="wide" className="mt-5">{loadingMore ? "Chargement…" : "Afficher plus"}</CmmButton>;
}

function CheckMark() {
  return <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-current/15 cmm-text-secondary">✓</div>;
}

export function appendUniqueNotifications(current: AppNotification[], incoming: AppNotification[]) {
  const knownIds = new Set(current.map((notification) => notification.id));
  return [...current, ...incoming.filter((notification) => !knownIds.has(notification.id))];
}

function DashboardNotificationList({
  visibleNotifications,
  locale,
  stateFor,
  decisionState,
  onOpen,
  onMuteAction,
}: {
  visibleNotifications: AppNotification[];
  locale: "fr" | "en";
  stateFor: (notification: AppNotification) => NotificationDisplayState;
  decisionState: ReturnType<typeof useNotificationDecisionState>;
  onOpen: (notification: AppNotification) => void;
  onMuteAction: (actionId: string) => void;
}) {
  return (
    <div className="pt-2">
      {visibleNotifications.map((notification) => {
        const displayState = stateFor(notification);
        const notificationDecision = getNotificationDecisionDescriptor(notification.payload);
        return (
          <NotificationListItem
            key={notification.id}
            notification={notification}
            locale={locale}
            displayState={displayState}
            decision={notificationDecision ? {
              kind: notificationDecision.kind,
              state: displayState === "decision_pending" || displayState === "treated" || displayState === "unavailable" ? displayState : "unavailable",
              busy: decisionState.busyDecisionIds.has(notification.id),
              error: decisionState.decisionErrors[notification.id],
              onDecision: (choice) => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ decisionState.handleDecision(notification, choice); },
            } : undefined}
            onClick={onOpen}
            onMuteAction={onMuteAction}
          />
        );
      })}
    </div>
  );
}
