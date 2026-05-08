"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, MessageSquare, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { buildChatNotificationHref } from "@/lib/chat/chat-notification-targets";

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

  const fetchNotifications = async () => {
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
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  };

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

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
      console.error("Failed to mark as read", err);
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
        className="relative rounded-full p-2 transition-colors hover:bg-pink-100 dark:hover:bg-slate-800"
        aria-label={`Notifications (${unreadCount} non lues)`}
        aria-expanded={isOpen}
      >
        <Bell
          className={`h-5 w-5 ${unreadCount > 0 ? "text-pink-500 animate-swing" : "cmm-text-muted dark:cmm-text-muted"}`}
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
          <div className="absolute right-0 z-50 mt-2 w-80 max-h-[32rem] overflow-hidden rounded-3xl border border-pink-100/40 bg-[rgba(255,248,251,0.96)] shadow-2xl backdrop-blur-xl dark:bg-slate-900/95">
            <div className="flex items-center justify-between border-b border-pink-100/60 p-4 dark:border-slate-800">
              <h3 className="font-bold uppercase tracking-widest cmm-text-caption cmm-text-primary dark:text-white">
                {locale === "fr" ? "Centre de notifications" : "Notifications"}
              </h3>
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
              ) : null}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="space-y-2 p-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full cmm-surface-muted text-slate-300">
                    <Check size={24} />
                  </div>
                  <p className="font-bold uppercase tracking-tighter cmm-text-caption cmm-text-muted">
                    {locale === "fr" ? "Aucune notification active" : "No active notifications"}
                  </p>
                  <p className="cmm-text-caption cmm-text-muted">
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
                      className={`flex w-full border-b border-pink-50 p-4 text-left transition-colors hover:bg-pink-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                        isUnread ? "bg-pink-500/5" : ""
                      }`}
                    >
                      <div className="mr-3 mt-1 flex-shrink-0">
                        <div
                          className={`rounded-xl p-2 ${
                            isUnread
                              ? "bg-white shadow-sm dark:bg-slate-800"
                              : "cmm-surface-muted/50 opacity-60"
                          }`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`truncate font-bold tracking-tight cmm-text-caption ${
                              isUnread ? "cmm-text-primary dark:text-white" : "cmm-text-muted"
                            }`}
                          >
                            {notification.title}
                          </span>
                          <span className="shrink-0 cmm-text-caption cmm-text-muted">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: locale === "fr" ? fr : enUS,
                            })}
                          </span>
                        </div>
                        <p
                          className={`leading-relaxed cmm-text-caption ${
                            isUnread
                              ? "cmm-text-secondary dark:cmm-text-muted"
                              : "cmm-text-muted opacity-80"
                          }`}
                        >
                          {notification.content}
                        </p>
                        {!isUnread ? null : (
                          <span className="mt-2 inline-flex items-center gap-1 font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 cmm-text-caption">
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

            <div className="bg-pink-50/50 p-4 text-center dark:bg-slate-800/20">
              <button
                type="button"
                className="font-bold uppercase tracking-widest cmm-text-caption cmm-text-muted transition-colors hover:cmm-text-secondary dark:hover:text-slate-200"
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
