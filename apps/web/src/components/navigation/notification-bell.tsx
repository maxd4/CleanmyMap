"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Bell, Check, MessageSquare, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { buildChatNotificationHref } from "@/lib/chat/chat-notification-targets";
import { logFailure } from "@/lib/logging/failure-log";

type AppNotification = {
  id: string;
  type: "validation" | "community" | "system" | "security" | "chat";
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown> | null;
};

function getNotificationIcon(type: AppNotification["type"]) {
  switch (type) {
    case "validation":
      return <ShieldCheck className="text-pink-500" size={16} />;
    case "security":
      return <AlertTriangle className="text-rose-500" size={16} />;
    case "community":
      return <UserCheck className="text-blue-500" size={16} />;
    case "chat":
      return <MessageSquare className="text-violet-500" size={16} />;
    default:
      return <Check className="cmm-text-muted" size={16} />;
  }
}

export function NotificationBell() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { locale } = useSitePreferences();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchInFlightRef = useRef(false);
  const markReadInFlightRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );
  const pollIntervalMs = isOpen ? 60_000 : 300_000;

  const fetchNotifications = async () => {
    if (!isLoaded || !isSignedIn) {
      setNotifications([]);
      return;
    }

    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as { notifications?: AppNotification[] };
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      logFailure("Notifications", "Fetch failed", err);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setNotifications([]);
      return;
    }

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
      if (!mounted || document.visibilityState !== "visible") {
        return;
      }

      // Polling is intentional for unread notifications, but the cadence is reduced to protect Invocations.
      intervalId = window.setInterval(() => {
        void fetchNotifications();
      }, pollIntervalMs);
    };

    const handleVisibilityChange = () => {
      if (!mounted) {
        return;
      }

      if (document.visibilityState === "visible") {
        void fetchNotifications();
        startPolling();
      } else {
        clearPolling();
      }
    };

    // Polling remains intentional, but it pauses when hidden and slows down while closed.
    void fetchNotifications();
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      clearPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoaded, isSignedIn, isOpen, pollIntervalMs]);

  useEffect(() => {
    if (
      unreadCount > 0 &&
      typeof window !== "undefined" &&
      "navigator" in window &&
      "vibrate" in navigator
    ) {
      const latestUnread = notifications.find((notification) => !notification.read_at);
      const isMajor = latestUnread?.type === "system" && latestUnread?.title.includes("Niveau Supérieur");

      try {
        if (isMajor) {
          navigator.vibrate([20, 50, 20]);
        } else {
          navigator.vibrate(15);
        }
      } catch {
        // Silent fail.
      }
    }
  }, [notifications, unreadCount]);

  const markAsRead = async (id: string) => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    try {
      if (fetchInFlightRef.current || markReadInFlightRef.current) {
        return;
      }
      markReadInFlightRef.current = true;
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications((previous) =>
          previous.map((notification) =>
            notification.id === id
              ? { ...notification, read_at: new Date().toISOString() }
              : notification,
          ),
        );
      }
    } catch (err) {
      logFailure("Notifications", "Mark as read failed", err, { id });
    } finally {
      markReadInFlightRef.current = false;
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    await markAsRead(notification.id);
    const href = buildChatNotificationHref(notification.payload);
    if (href) {
      setIsOpen(false);
      router.push(href);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/88 shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)] transition-all hover:border-pink-200/28 hover:bg-pink-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/40"
        aria-label={`Notifications (${unreadCount} non lues)`}
        aria-expanded={isOpen}
      >
        <Bell
          className={`h-5 w-5 ${unreadCount > 0 ? "text-pink-300 animate-swing" : "text-white/70"}`}
          aria-hidden="true"
        />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-white cmm-text-caption font-bold">
              {unreadCount}
            </span>
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label={locale === "fr" ? "Fermer les notifications" : "Close notifications"}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-h-[32rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/88 shadow-[0_32px_70px_-34px_rgba(2,6,23,0.96)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="font-bold uppercase tracking-widest cmm-text-caption cmm-text-primary dark:text-white">
                {locale === "fr" ? "Centre de notifications" : "Notifications"}
              </h3>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="space-y-2 p-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/50">
                    <Check size={24} />
                  </div>
                  <p className="font-bold uppercase tracking-tighter cmm-text-caption text-white/70">
                    {locale === "fr" ? "Aucune notification active" : "No active notifications"}
                  </p>
                  <p className="cmm-text-caption text-white/54">
                    {locale === "fr"
                      ? "Vous n'avez rien de nouveau à traiter pour le moment."
                      : "You have nothing new to review right now."}
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isUnread = !notification.read_at;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void handleNotificationClick(notification)}
                      className={`flex w-full border-b border-white/6 p-4 text-left transition-colors hover:bg-white/6 ${
                        isUnread ? "bg-pink-400/6" : ""
                      }`}
                    >
                      <div className="mr-3 mt-1 flex-shrink-0">
                        <div
                          className={`rounded-xl p-2 ${
                            isUnread
                              ? "bg-white/10 shadow-sm"
                              : "bg-white/6 opacity-70"
                          }`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`truncate font-bold tracking-tight cmm-text-caption ${
                              isUnread ? "text-white" : "text-white/60"
                            }`}
                          >
                            {notification.title}
                          </span>
                          <span className="shrink-0 cmm-text-caption text-white/50">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: locale === "fr" ? fr : enUS,
                            })}
                          </span>
                        </div>
                        <p
                          className={`leading-relaxed cmm-text-caption ${
                            isUnread
                              ? "text-white/72"
                              : "text-white/54"
                          }`}
                        >
                          {notification.content}
                        </p>
                        {!isUnread ? null : (
                          <span className="mt-2 inline-flex items-center gap-1 font-bold uppercase tracking-widest text-pink-300 cmm-text-caption">
                            <MessageSquare size={12} />
                            {locale === "fr" ? "Ouvrir" : "Open"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 bg-white/4 p-4 text-center">
              <button
                type="button"
                className="font-bold uppercase tracking-widest cmm-text-caption text-white/60 transition-colors hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {locale === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
