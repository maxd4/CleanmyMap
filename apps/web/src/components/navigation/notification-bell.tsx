"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Bell, Check } from "lucide-react";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmCountBadge } from "@/components/ui/cmm-count-badge";
import { CmmPopover } from "@/components/ui/cmm-popover";
import { buildNotificationHref } from "@/lib/notifications/notification-targets";
import { logFailure } from "@/lib/logging/failure-log";
import {
  loadNotificationsForCurrentUser,
  loadUnreadNotificationCountForCurrentUser,
  markNotificationAsReadForCurrentUser,
  type AppNotification,
} from "@/lib/notifications/client";
import {
  getNotificationDecisionDescriptor,
  resolveNotificationDisplayState,
  type NotificationDisplayState,
} from "@/lib/notifications/notification-state";
import { useNotificationRequestIdentity } from "@/lib/notifications/use-notification-request-identity";
import { useNotificationDecisionState } from "@/lib/notifications/use-notification-decision-state";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";

type NotificationBellProps = { ribbonChrome?: RibbonChrome };

export function NotificationBell({ ribbonChrome }: NotificationBellProps) {
  const auth = useAuth();
  const identityKey = auth.isLoaded && auth.isSignedIn && auth.userId ? auth.userId : "signed-out";
  return <NotificationBellSession key={identityKey} auth={auth} ribbonChrome={ribbonChrome} />;
}

type NotificationAuthState = Pick<
  ReturnType<typeof useAuth>,
  "getToken" | "isLoaded" | "isSignedIn" | "userId"
>;

function NotificationBellSession({
  auth,
  ribbonChrome,
}: NotificationBellProps & { auth: NotificationAuthState }) {
  const { getToken, isLoaded, isSignedIn, userId } = auth;
  const router = useRouter();
  const { locale } = useSitePreferences();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getRequest, isCurrentRequest } = useNotificationRequestIdentity(userId);
  const fetchInFlightRef = useRef<ReturnType<typeof getRequest> | null>(null);
  const markReadInFlightRef = useRef<ReturnType<typeof getRequest> | null>(null);
  const pollIntervalMs = isOpen ? 300_000 : 900_000;
  const decisionState = useNotificationDecisionState({ getRequest, isCurrentRequest, scope: "Notifications" });
  const refreshDecisionState = decisionState.refreshDecisionState;

  const fetchNotifications = useCallback(async () => {
    const request = getRequest();
    if (!request.userId) return;
    if (fetchInFlightRef.current && isCurrentRequest(fetchInFlightRef.current)) return;

    fetchInFlightRef.current = request;
    setLoading(true);
    try {
      const [loadedNotifications, loadedUnreadCount] = await Promise.all([
        loadNotificationsForCurrentUser(request.userId, getToken),
        loadUnreadNotificationCountForCurrentUser(request.userId, getToken),
      ]);
      if (!isCurrentRequest(request)) return;
      setNotifications(loadedNotifications);
      setUnreadCount(loadedUnreadCount);
      await refreshDecisionState(request);
    } catch (err) {
      if (isCurrentRequest(request)) logFailure("Notifications", "Fetch failed", err);
    } finally {
      if (isCurrentRequest(request)) {
        setLoading(false);
        if (fetchInFlightRef.current === request) fetchInFlightRef.current = null;
      }
    }
  }, [getRequest, getToken, isCurrentRequest, refreshDecisionState]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let intervalId: number | null = null;
    let mounted = true;
    const clearPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
    const startPolling = () => {
      clearPolling();
      if (!mounted || document.visibilityState !== "visible") return;
      intervalId = window.setInterval(() => void fetchNotifications(), pollIntervalMs);
    };
    const handleVisibilityChange = () => {
      if (!mounted) return;
      if (document.visibilityState === "visible") {
        void fetchNotifications();
        startPolling();
      } else clearPolling();
    };
    void Promise.resolve().then(() => fetchNotifications());
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      mounted = false;
      clearPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, isLoaded, isSignedIn, isOpen, pollIntervalMs]);

  const visibleNotifications = useMemo(() => (isLoaded && isSignedIn ? notifications : []), [isLoaded, isSignedIn, notifications]);
  const previewNotifications = useMemo(() => visibleNotifications.slice(0, 4), [visibleNotifications]);

  useEffect(() => {
    if (unreadCount > 0 && typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      const latestUnread = visibleNotifications.find((notification) => !notification.read_at);
      const isMajor = latestUnread?.type === "system" && latestUnread.title.includes("Niveau Supérieur");
      try { navigator.vibrate(isMajor ? [20, 50, 20] : 15); } catch { /* Optional device feedback. */ }
    }
  }, [visibleNotifications, unreadCount]);

  const stateFor = (notification: AppNotification): NotificationDisplayState => resolveNotificationDisplayState({ notification, pendingRequestIds: decisionState.pendingRequestIds, treatedNotificationIds: decisionState.treatedNotificationIds });

  const markAsRead = async (id: string) => {
    const request = getRequest();
    if (!request.userId || (markReadInFlightRef.current && isCurrentRequest(markReadInFlightRef.current))) return;
    const wasUnread = notifications.some((notification) => notification.id === id && !notification.read_at);
    markReadInFlightRef.current = request;
    try {
      await markNotificationAsReadForCurrentUser(request.userId, id, getToken);
      if (!isCurrentRequest(request)) return;
      setNotifications((previous) => previous.map((notification) => notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification));
      if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      if (isCurrentRequest(request)) logFailure("Notifications", "Mark as read failed", err, { id });
    } finally {
      if (isCurrentRequest(request) && markReadInFlightRef.current === request) markReadInFlightRef.current = null;
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    const request = getRequest();
    await markAsRead(notification.id);
    if (!isCurrentRequest(request)) return;
    const href = buildNotificationHref(notification.payload, notification.id);
    if (href) {
      setIsOpen(false);
      router.push(href);
    }
  };

  return (
    <CmmPopover
      id="notifications-popover-panel"
      ariaLabel="Notifications"
      open={isOpen}
      onOpenChange={setIsOpen}
      panelClassName="w-[min(22rem,calc(100vw-1rem))] overflow-visible rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)]"
      panelStyle={ribbonChrome ? { backgroundImage: ribbonChrome.backgroundImage, backgroundColor: ribbonChrome.backgroundColor, borderColor: ribbonChrome.borderColor } : undefined}
      renderTrigger={(triggerProps) => (
        <button {...triggerProps} aria-label={`Notifications (${unreadCount} non lues)`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/88 shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)] transition-all hover:border-pink-200/28 hover:bg-pink-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/40 xl:h-10 xl:w-10">
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? "text-pink-300 animate-swing" : "text-white/70"}`} aria-hidden="true" />
          <CmmCountBadge count={unreadCount} tone="rose" className="absolute right-1.5 top-1.5 !min-h-4 !min-w-4 !border-0 !p-0 text-white" />
        </button>
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
        <div>
          <h3 className="text-sm font-bold text-white">Notifications</h3>
          <p className="mt-0.5 text-xs text-white/60">À traiter : {decisionState.pendingRequestIds.size}</p>
        </div>
        {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" role="status" aria-label="Chargement" /> : null}
      </div>
      <div className="overflow-hidden">
        {loading && visibleNotifications.length === 0 ? (
          <div className="space-y-2 p-6 text-center" role="status"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" /><p className="text-sm font-semibold text-white">{locale === "fr" ? "Chargement des notifications" : "Loading notifications"}</p></div>
        ) : previewNotifications.length === 0 ? (
          <div className="space-y-2 p-6 text-center"><div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/55"><Check size={24} /></div><p className="text-sm font-semibold text-white">{locale === "fr" ? "Aucune notification" : "No notifications"}</p></div>
        ) : (
          previewNotifications.map((notification) => {
            const displayState = stateFor(notification);
            const notificationDecision = getNotificationDecisionDescriptor(notification.payload);
            return <NotificationListItem key={notification.id} notification={notification} locale={locale === "fr" ? "fr" : "en"} compact displayState={displayState} decision={notificationDecision ? { state: displayState === "decision_pending" || displayState === "treated" || displayState === "unavailable" ? displayState : "unavailable", busy: decisionState.busyDecisionIds.has(notification.id), error: decisionState.decisionErrors[notification.id], onDecision: (choice) => void decisionState.handleDecision(notification, choice) } : undefined} onClick={(item) => void handleNotificationClick(item)} />;
          })
        )}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-3">
        <Link href="/dashboard#notifications" onClick={() => setIsOpen(false)} className="text-xs font-semibold text-sky-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Ouvrir</Link>
        <button type="button" className="text-xs font-semibold text-sky-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" onClick={() => setIsOpen(false)}>Fermer</button>
      </div>
    </CmmPopover>
  );
}
