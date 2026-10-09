"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { NotificationListItem } from "@/components/notifications/notification-list-item";
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
    void Promise.resolve().then(() => fetchNotifications());
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
    void markDashboardNotificationAsRead({
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

  return <DashboardNotificationsView isLoaded={isLoaded} locale={locale === "fr" ? "fr" : "en"} view={view} setView={setView} loading={loading} error={error} loadingMore={loadingMore} visibleNotifications={visibleNotifications} pendingCount={pendingCount} missingPendingCount={decisionState.missingPendingRequestIds.length} hasMore={hasMore} decisionState={decisionState} stateFor={stateFor} onOpen={markAsRead} onMuteAction={muteActionInformation} onLoadMore={loadMoreNotifications} />;
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
    <section id="notifications" aria-labelledby="dashboard-notifications-title" className="scroll-mt-28 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.22)_100%)] p-6 shadow-[0_18px_42px_-28px_rgba(124,45,18,0.3)] sm:p-8">
      <div className="flex items-center justify-between gap-4 border-b border-amber-200/18 pb-4">
        <div>
          <p className="cmm-text-caption font-bold uppercase tracking-[0.3em] text-amber-100/80">{locale === "fr" ? "Centre de suivi" : "Activity center"}</p>
          <h2 id="dashboard-notifications-title" className="mt-1 text-2xl font-black tracking-tight text-white">Notifications</h2>
        </div>
        {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" role="status" aria-label={locale === "fr" ? "Chargement" : "Loading"} /> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={locale === "fr" ? "Vues des notifications" : "Notification views"}>
        <button type="button" role="tab" aria-selected={view === "pending"} onClick={() => setView("pending")} className="rounded-xl border border-amber-200/25 px-3 py-2 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-100/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80">À traiter{pendingCount > 0 ? ` (${pendingCount})` : ""}</button>
        <button type="button" role="tab" aria-selected={view === "information"} onClick={() => setView("information")} className="rounded-xl border border-amber-200/25 px-3 py-2 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-100/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80">Informations</button>
      </div>
      {missingPendingCount > 0 && view === "pending" ? <p className="pt-3 text-sm text-amber-100/90" role="alert">{missingPendingCount} décision(s) métier sont encore ouvertes, mais leur notification n&apos;est pas accessible dans cette session. Actualisez avant de décider.</p> : null}
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
    return <p className="pt-3 text-sm text-amber-100/75" role="status">Les décisions disponibles n&apos;ont pas pu être actualisées.</p>;
  }
  if (!isLoaded || (loading && visibleNotifications.length === 0)) {
    return <DashboardNotificationsLoading locale={locale} />;
  }
  if (error && visibleNotifications.length === 0) {
    return <p className="pt-5 text-sm leading-relaxed text-amber-50/85">{locale === "fr" ? "Les notifications sont momentanément indisponibles." : "Notifications are temporarily unavailable."}</p>;
  }
  if (view === "pending" && missingPendingCount > 0 && visibleNotifications.length === 0) {
    return <div className="space-y-2 pt-6 text-center"><CheckMark /><p className="text-sm font-semibold text-amber-50">Certaines décisions ne peuvent pas être affichées</p></div>;
  }
  if (visibleNotifications.length === 0) {
    return <div className="space-y-2 pt-6 text-center"><CheckMark /><p className="text-sm font-semibold text-amber-50">{view === "pending" ? "Aucune décision à traiter" : "Aucune notification"}</p>{view === "information" && hasMore ? <DashboardLoadMoreButton loadingMore={loadingMore} onLoadMore={onLoadMore} /> : null}</div>;
  }
  return (
    <>
      <DashboardNotificationList visibleNotifications={visibleNotifications} locale={locale} stateFor={stateFor} decisionState={decisionState} onOpen={onOpen} onMuteAction={onMuteAction} />
      {error ? <p className="pt-4 text-sm leading-relaxed text-amber-100/85" role="alert">Le chargement des notifications a échoué.</p> : null}
      {view === "information" ? (hasMore ? <DashboardLoadMoreButton loadingMore={loadingMore} onLoadMore={onLoadMore} /> : <p className="pt-5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/54">Fin de l&apos;historique des notifications</p>) : null}
    </>
  );
}

function DashboardNotificationsLoading({ locale }: { locale: "fr" | "en" }) {
  return <div className="space-y-3 pt-5" role="status"><div className="h-14 animate-pulse rounded-2xl bg-amber-950/35" /><div className="h-14 animate-pulse rounded-2xl bg-amber-950/35" /><span className="sr-only">{locale === "fr" ? "Chargement des notifications" : "Loading notifications"}</span></div>;
}

function DashboardLoadMoreButton({ loadingMore, onLoadMore }: { loadingMore: boolean; onLoadMore: () => Promise<void> }) {
  return <button type="button" onClick={() => void onLoadMore()} disabled={loadingMore} aria-busy={loadingMore} className="mt-5 w-full rounded-2xl border border-amber-200/24 bg-amber-100/[0.08] px-4 py-3 text-sm font-bold text-amber-50 transition-colors hover:bg-amber-100/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 disabled:cursor-wait disabled:opacity-70">{loadingMore ? "Chargement…" : "Afficher plus"}</button>;
}

function CheckMark() {
  return <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/18 bg-amber-100/[0.08] text-amber-100/75">✓</div>;
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
              onDecision: (choice) => void decisionState.handleDecision(notification, choice),
            } : undefined}
            onClick={onOpen}
            onMuteAction={onMuteAction}
          />
        );
      })}
    </div>
  );
}
