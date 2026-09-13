"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { logFailure } from "@/lib/logging/failure-log";
import {
  loadNotificationsForCurrentUser,
  markNotificationAsReadForCurrentUser,
  type AppNotification,
} from "@/lib/notifications/client";

export function DashboardNotificationsSection() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const { locale } = useSitePreferences();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchInFlightRef = useRef(false);
  const markReadInFlightRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId || fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setLoading(true);
    setError(false);
    try {
      setNotifications(await loadNotificationsForCurrentUser(userId, getToken));
    } catch (err) {
      setError(true);
      logFailure("Dashboard notifications", "Fetch failed", err);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  }, [getToken, isLoaded, isSignedIn, userId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const visibleNotifications = useMemo(
    () => (isLoaded && isSignedIn ? notifications : []),
    [isLoaded, isSignedIn, notifications],
  );

  const markAsRead = async (notification: AppNotification) => {
    if (!isLoaded || !isSignedIn || !userId || markReadInFlightRef.current) {
      return;
    }

    markReadInFlightRef.current = true;
    try {
      await markNotificationAsReadForCurrentUser(userId, notification.id, getToken);
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      logFailure("Dashboard notifications", "Mark as read failed", err, {
        id: notification.id,
      });
    } finally {
      markReadInFlightRef.current = false;
    }
  };

  const isInitialLoading = !isLoaded || (loading && visibleNotifications.length === 0);

  return (
    <section
      id="notifications"
      aria-labelledby="dashboard-notifications-title"
      className="scroll-mt-28 rounded-3xl border border-amber-200/18 bg-[linear-gradient(145deg,rgba(44,28,15,0.78)_0%,rgba(92,45,12,0.84)_56%,rgba(245,158,11,0.22)_100%)] p-6 shadow-[0_18px_42px_-28px_rgba(124,45,18,0.3)] sm:p-8"
    >
      <div className="flex items-center justify-between gap-4 border-b border-amber-200/18 pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100/72">
            {locale === "fr" ? "Centre de suivi" : "Activity center"}
          </p>
          <h2
            id="dashboard-notifications-title"
            className="mt-1 text-2xl font-black tracking-tight text-white"
          >
            Notifications
          </h2>
        </div>
        {loading ? (
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"
            role="status"
            aria-label={locale === "fr" ? "Chargement" : "Loading"}
          />
        ) : null}
      </div>

      {isInitialLoading ? (
        <div className="space-y-3 pt-5" role="status">
          <div className="h-14 animate-pulse rounded-2xl bg-amber-950/35" />
          <div className="h-14 animate-pulse rounded-2xl bg-amber-950/35" />
          <span className="sr-only">{locale === "fr" ? "Chargement des notifications" : "Loading notifications"}</span>
        </div>
      ) : error ? (
        <p className="pt-5 text-sm leading-relaxed text-amber-50/78">
          {locale === "fr"
            ? "Les notifications sont momentanément indisponibles."
            : "Notifications are temporarily unavailable."}
        </p>
      ) : visibleNotifications.length === 0 ? (
        <div className="space-y-2 pt-6 text-center">
          <CheckMark />
          <p className="text-sm font-semibold text-amber-50">
            {locale === "fr" ? "Aucune notification" : "No notifications"}
          </p>
        </div>
      ) : (
        <div className="pt-2">
          {visibleNotifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              locale={locale === "fr" ? "fr" : "en"}
              onClick={(item) => void markAsRead(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CheckMark() {
  return (
    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/18 bg-amber-100/[0.08] text-amber-100/75">
      ✓
    </div>
  );
}
