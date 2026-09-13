"use client";

import { AlertTriangle, Check, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import type { AppNotification } from "@/lib/notifications/client";

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

type NotificationListItemProps = {
  notification: AppNotification;
  locale: "fr" | "en";
  onClick: (notification: AppNotification) => void;
  compact?: boolean;
};

export function NotificationListItem({
  notification,
  locale,
  onClick,
  compact = false,
}: NotificationListItemProps) {
  const isUnread = !notification.read_at;

  return (
    <button
      key={notification.id}
      type="button"
      onClick={() => onClick(notification)}
      className={`relative flex w-full border-b px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
        compact
          ? "border-white/10 hover:bg-white/[0.07] focus-visible:ring-sky-300/70"
          : "border-amber-200/14 hover:bg-amber-100/[0.08] focus-visible:ring-amber-200/80"
      } ${
        compact
          ? isUnread
            ? "bg-white/[0.05]"
            : "bg-white/[0.015]"
          : isUnread
            ? "bg-amber-100/[0.08]"
            : "bg-amber-950/[0.12]"
      }`}
    >
      {isUnread ? (
        <span
          className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${
            compact ? "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]" : "bg-amber-300"
          }`}
          aria-label={locale === "fr" ? "Non lue" : "Unread"}
        />
      ) : null}
      <div className="mr-3 mt-1 flex-shrink-0">
        <div
          className={`rounded-xl border p-2 ${
            compact
              ? `border-white/10 ${isUnread ? "bg-white/[0.06]" : "bg-white/[0.03] opacity-70"}`
              : `border-amber-200/20 ${isUnread ? "bg-amber-100/[0.12]" : "bg-amber-950/[0.16] opacity-70"}`
          }`}
        >
          {getNotificationIcon(notification.type)}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`min-w-0 flex-1 ${compact ? "line-clamp-1" : "break-words"} font-bold tracking-tight cmm-text-caption ${
              isUnread
                ? compact
                  ? "text-white"
                  : "text-amber-50"
                : compact
                  ? "text-white/60"
                  : "text-amber-100/62"
            }`}
          >
            {notification.title}
          </span>
          <span
            className={`shrink-0 cmm-text-caption ${
              compact ? "text-white/50" : "text-amber-100/58"
            }`}
          >
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: locale === "fr" ? fr : enUS,
            })}
          </span>
        </div>
        <p
          className={`${compact ? "line-clamp-2" : "whitespace-pre-wrap break-words"} leading-relaxed cmm-text-caption ${
            isUnread
              ? compact
                ? "text-white/72"
                : "text-amber-50/82"
              : compact
                ? "text-white/54"
                : "text-amber-100/62"
          }`}
        >
          {notification.content}
        </p>
      </div>
    </button>
  );
}
