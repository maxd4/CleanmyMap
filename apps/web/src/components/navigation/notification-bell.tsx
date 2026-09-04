"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Bell, Check, MessageSquare, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { buildChatNotificationHref } from "@/lib/chat/chat-notification-targets";
import { logFailure } from "@/lib/logging/failure-log";
import {
  loadNotificationsForCurrentUser,
  markNotificationAsReadForCurrentUser,
  type AppNotification,
} from "@/lib/notifications/client";
import type { RibbonChrome } from "./app-navigation-ribbon-theme";
import { useDropdownPlacement } from "@/components/ui/use-dropdown-placement";

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

type NotificationBellProps = {
  ribbonChrome?: RibbonChrome;
};

export function NotificationBell({ ribbonChrome }: NotificationBellProps) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  const { locale } = useSitePreferences();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchInFlightRef = useRef(false);
  const markReadInFlightRef = useRef(false);
  const placement = useDropdownPlacement({
    isOpen,
    triggerRef,
  });
  const triggerRect = placement.triggerRect;
  const mobilePanelTop =
    !placement.openUp && triggerRect && typeof window !== "undefined"
      ? `${triggerRect.bottom + 12}px`
      : "auto";
  const mobilePanelBottom =
    placement.openUp && triggerRect && typeof window !== "undefined"
      ? `${window.innerHeight - triggerRect.top + 12}px`
      : "auto";

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications],
  );
  const pollIntervalMs = isOpen ? 300_000 : 900_000;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");

    const updateCanHover = () => {
      setCanHover(mediaQuery.matches);
    };

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);

    return () => {
      mediaQuery.removeEventListener("change", updateCanHover);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function openNotificationMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  }

  function closeNotificationMenuSoon() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 140);
  }

  function handleBellClick() {
    if (canHover) {
      openNotificationMenu();
      return;
    }

    setIsOpen((current) => !current);
  }

  const fetchNotifications = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setNotifications([]);
      return;
    }

    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      const loadedNotifications = await loadNotificationsForCurrentUser(userId, getToken);
      setNotifications(loadedNotifications);
    } catch (err) {
      logFailure("Notifications", "Fetch failed", err);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  }, [getToken, isLoaded, isSignedIn, userId]);

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

    // Polling is intentional for unread notifications, but the cadence stays slow to protect Invocations.
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
  }, [fetchNotifications, isLoaded, isSignedIn, isOpen, pollIntervalMs]);

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
    if (!isLoaded || !isSignedIn || !userId) {
      return;
    }

    try {
      if (fetchInFlightRef.current || markReadInFlightRef.current) {
        return;
      }
      markReadInFlightRef.current = true;
      await markNotificationAsReadForCurrentUser(userId, id, getToken);
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
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
    <div
      className="relative"
      onMouseEnter={canHover ? openNotificationMenu : undefined}
      onMouseLeave={canHover ? closeNotificationMenuSoon : undefined}
      onFocus={canHover ? openNotificationMenu : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleBellClick}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white/88 shadow-[0_16px_32px_-26px_rgba(2,6,23,0.9)] transition-all hover:border-pink-200/28 hover:bg-pink-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/40"
        aria-label={`Notifications (${unreadCount} non lues)`}
        aria-expanded={isOpen}
        aria-controls="notifications-menu-panel"
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
          <div
            id="notifications-menu-panel"
            role="dialog"
            aria-label={locale === "fr" ? "Notifications" : "Notifications"}
            onMouseEnter={canHover ? openNotificationMenu : undefined}
            onMouseLeave={canHover ? closeNotificationMenuSoon : undefined}
            className={`absolute left-1/2 z-50 w-[min(21.25rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-visible rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-[0_28px_56px_-28px_rgba(2,6,23,0.82)] max-sm:fixed max-sm:left-1/2 max-sm:right-auto max-sm:w-[calc(100vw-1rem)] max-sm:max-w-[calc(100vw-1rem)] max-sm:-translate-x-1/2 max-sm:top-[var(--notifications-mobile-top)] max-sm:bottom-[var(--notifications-mobile-bottom)] ${placement.openUp ? "bottom-[calc(100%+0.75rem)]" : "top-[calc(100%+0.75rem)]"}`}
            style={
              {
                ...(ribbonChrome
                  ? {
                      backgroundImage: ribbonChrome.backgroundImage,
                      backgroundColor: ribbonChrome.backgroundColor,
                      borderColor: ribbonChrome.borderColor,
                    }
                  : {}),
                "--notifications-mobile-top": mobilePanelTop,
                "--notifications-mobile-bottom": mobilePanelBottom,
              } as CSSProperties
            }
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute left-1/2 right-auto h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-white/15 ${placement.openUp ? "-bottom-2 rotate-[225deg] border-b border-l-0 border-r border-t-0" : "-top-2"}`}
              style={
                ribbonChrome
                  ? {
                      backgroundImage: ribbonChrome.backgroundImage,
                      backgroundColor: ribbonChrome.backgroundColor,
                      borderColor: ribbonChrome.borderColor,
                    }
                  : undefined
              }
            />
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <h3 className="text-sm font-bold text-white">
                {locale === "fr" ? "Notifications" : "Notifications"}
              </h3>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="space-y-2 p-6 text-center">
                  <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/55">
                    <Check size={24} />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {locale === "fr" ? "Aucune notification" : "No notifications"}
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
                      className={`relative flex w-full border-b border-white/10 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300/70 ${
                        isUnread ? "bg-white/[0.05]" : "bg-white/[0.015]"
                      }`}
                    >
                      {isUnread ? (
                        <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]" aria-label={locale === "fr" ? "Non lue" : "Unread"} />
                      ) : null}
                      <div className="mr-3 mt-1 flex-shrink-0">
                        <div
                          className={`rounded-xl border border-white/10 p-2 ${
                            isUnread
                              ? "bg-white/[0.06]"
                              : "bg-white/[0.03] opacity-70"
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
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 bg-white/[0.03] px-4 py-3 text-center">
              <button
                type="button"
                className="text-xs font-semibold text-sky-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
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
