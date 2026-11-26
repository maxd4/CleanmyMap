"use client";

import { AlertTriangle, Check, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import type { AppNotification, NotificationDecision } from "@/lib/notifications/client";
import {
  getNotificationDecisionOutcome,
  getNotificationActionId,
  isOptionalInformationNotification,
  type NotificationDisplayState,
} from "@/lib/notifications/notification-state";
import { ACTION_CHANGE_LABELS, type ActionChangeKind } from "@/lib/actions/action-change-notifications";

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
    case "action_discussion":
      return <MessageSquare className="text-pink-500" size={16} />;
    case "action_event":
      return <UserCheck className="text-emerald-400" size={16} />;
    default:
      return <Check className="cmm-text-muted" size={16} />;
  }
}

type NotificationListItemProps = {
  notification: AppNotification;
  locale: "fr" | "en";
  onClick: (notification: AppNotification) => void;
  compact?: boolean;
  displayState?: NotificationDisplayState;
  decision?: {
    kind?: "action_share" | "action_invitation" | "action_registration_request" | "action_result" | "action_post_action_claim";
    state: "decision_pending" | "treated" | "unavailable";
    busy?: boolean;
    error?: string | null;
    onDecision: (decision: NotificationDecision) => void;
  };
  onMuteAction?: (actionId: string) => void;
};

const stateLabels: Record<NotificationDisplayState, { fr: string; en: string }> = {
  unread: { fr: "Non lue", en: "Unread" },
  read: { fr: "Lue", en: "Read" },
  decision_pending: { fr: "À traiter", en: "Pending decision" },
  treated: { fr: "Traitée", en: "Treated" },
  unavailable: { fr: "Obsolète", en: "Obsolete" },
};

const actionEventStaticLabels: Record<string, { fr: string; en: string }> = {
  action_reminder: { fr: "Rappel J-1", en: "J-1 reminder" },
  invitation: { fr: "Invitation de l'organisateur", en: "Organizer invitation" },
  registration_request: { fr: "Demande d'inscription", en: "Registration request" },
  registration_decision: { fr: "Suivi de votre demande", en: "Registration update" },
  action_result: { fr: "Résultats disponibles", en: "Results available" },
  action_result_impact: {
    fr: "Participation confirmée et résultats disponibles",
    en: "Participation confirmed and results available",
  },
  administrative_requirements: {
    fr: "Démarches administratives à finaliser",
    en: "Administrative steps to complete",
  },
  post_action_claim: { fr: "Réclamation de participation", en: "Participation claim" },
  post_action_claim_decision: { fr: "Résultat de votre réclamation", en: "Claim review result" },
  role_attestation_decision: { fr: "Décision sur votre mission", en: "Role mission decision" },
};

function getStateLabel(
  notification: AppNotification,
  displayState: NotificationDisplayState,
  locale: "fr" | "en",
): string {
  const outcome = getNotificationDecisionOutcome(notification.payload);
  if (displayState === "treated" && outcome) {
    return locale === "fr"
      ? { accepted: "Acceptée", rejected: "Refusée", withdrawn: "Retirée", claimed: "Demande envoyée", not_participated: "Je n'ai pas participé" }[outcome]
      : { accepted: "Accepted", rejected: "Refused", withdrawn: "Withdrawn", claimed: "Claim submitted", not_participated: "Not participated" }[outcome];
  }
  if (displayState === "unavailable" && outcome === "withdrawn") {
    return locale === "fr" ? "Retirée" : "Withdrawn";
  }
  return stateLabels[displayState][locale];
}

export function NotificationListItem({
  notification,
  locale,
  onClick,
  compact = false,
  displayState = notification.read_at ? "read" : "unread",
  decision,
  onMuteAction,
}: NotificationListItemProps) {
  const isUnread = displayState === "unread" || displayState === "decision_pending";
  const createdAt = new Date(notification.created_at);
  const relativeDate = formatDistanceToNow(createdAt, {
    addSuffix: true,
    locale: locale === "fr" ? fr : enUS,
  });
  const absoluteDate = format(
    createdAt,
    locale === "fr" ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy HH:mm",
    { locale: locale === "fr" ? fr : enUS },
  );
  const stateLabel = getStateLabel(notification, displayState, locale);

  return (
    <article
      data-notification-state={displayState}
      className={`relative flex w-full border-b px-3.5 py-3 transition-colors ${
        compact ? "border-white/10" : "border-current/10"
      } ${
        compact
          ? isUnread
            ? "bg-white/[0.05]"
            : "bg-white/[0.015]"
          : isUnread
            ? "bg-amber-500/[0.06]"
            : "bg-transparent"
      }`}
    >
      {isUnread ? (
        <span
          className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${
            compact ? "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]" : "bg-amber-600"
          }`}
          aria-label={locale === "fr" ? "Non lue" : "Unread"}
        />
      ) : null}
      <div className="mr-3 mt-1 flex-shrink-0">
        <div
          className={`rounded-xl border p-2 ${
            compact
              ? `border-white/10 ${isUnread ? "bg-white/[0.06]" : "bg-white/[0.03] opacity-70"}`
              : `border-current/10 ${isUnread ? "bg-amber-500/[0.08]" : "bg-transparent"}`
          }`}
        >
          {getNotificationIcon(notification.type)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <NotificationOpenButton
          notification={notification}
          locale={locale}
          compact={compact}
          isUnread={isUnread}
          stateLabel={stateLabel}
          relativeDate={relativeDate}
          absoluteDate={absoluteDate}
          displayState={displayState}
          onClick={onClick}
        />
        <NotificationDecisionActions decision={decision} locale={locale} compact={compact} />
        <NotificationMuteAction
          notification={notification}
          locale={locale}
          compact={compact}
          onMuteAction={onMuteAction}
        />
      </div>
    </article>
  );
}

function NotificationMuteAction({
  notification,
  locale,
  compact,
  onMuteAction,
}: {
  notification: AppNotification;
  locale: "fr" | "en";
  compact: boolean;
  onMuteAction?: (actionId: string) => void;
}) {
  const actionId = getNotificationActionId(notification.payload);
  if (!onMuteAction || !actionId || !isOptionalInformationNotification(notification)) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onMuteAction(actionId);
      }}
      className={`mt-2 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 ${compact ? "text-sky-300 focus-visible:ring-sky-300" : "cmm-text-secondary focus-visible:ring-amber-600"}`}
    >
      {locale === "fr" ? "Masquer les informations de cette action" : "Hide information for this action"}
    </button>
  );
}

function NotificationOpenButton({
  notification,
  locale,
  compact,
  isUnread,
  stateLabel,
  relativeDate,
  absoluteDate,
  displayState,
  onClick,
}: {
  notification: AppNotification;
  locale: "fr" | "en";
  compact: boolean;
  isUnread: boolean;
  stateLabel: string;
  relativeDate: string;
  absoluteDate: string;
  displayState: NotificationDisplayState;
  onClick: (notification: AppNotification) => void;
}) {
  const actionEventLabel = getActionEventLabel(notification, locale);
  const titleClass = compact ? (isUnread ? "text-white" : "text-white/60") : "cmm-text-primary";
  const contentClass = compact ? (isUnread ? "text-white/72" : "text-white/54") : "cmm-text-secondary";
  const stateClass = displayState === "decision_pending"
    ? (compact ? "border-amber-300/50 text-amber-200" : "border-current/30 cmm-text-warning")
    : displayState === "unavailable"
      ? (compact ? "border-slate-300/30 text-slate-300/80" : "border-current/20 cmm-text-secondary")
      : displayState === "treated"
        ? (compact ? "border-emerald-300/40 text-emerald-200" : "border-current/30 cmm-text-success")
        : compact ? "border-white/15 text-white/65" : "border-current/20 cmm-text-secondary";

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      aria-label={`${locale === "fr" ? "Ouvrir la notification" : "Open notification"} : ${notification.title}`}
      className={`block w-full rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${compact ? "hover:bg-white/[0.07] focus-visible:ring-sky-300/70" : "hover:bg-amber-500/[0.06] focus-visible:ring-amber-600"}`}
    >
      {actionEventLabel ? (
        <span className={`mb-1 block cmm-text-caption font-black uppercase tracking-[0.14em] ${compact ? "text-emerald-300/80" : "cmm-text-success"}`}>
          {actionEventLabel}
        </span>
      ) : null}
      <div className={compact ? "flex items-start justify-between gap-3" : "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3"}>
        <span className={`min-w-0 flex-1 ${compact ? "line-clamp-1" : "break-words"} font-bold tracking-tight cmm-text-caption ${titleClass}`}>
          {notification.title}
        </span>
        <time dateTime={notification.created_at} className={`shrink-0 cmm-text-caption ${compact ? "text-white/50" : "cmm-text-secondary"}`}>
          {compact ? relativeDate : `${absoluteDate} · ${relativeDate}`}
        </time>
      </div>
      <p className={`${compact ? "line-clamp-2" : "whitespace-pre-wrap break-words"} leading-relaxed cmm-text-caption ${contentClass}`}>
        {notification.content}
      </p>
      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 cmm-text-caption font-bold ${stateClass}`}>
        {stateLabel}
      </span>
      <NotificationActionHint notification={notification} compact={compact} locale={locale} />
    </button>
  );
}

function getActionEventLabel(
  notification: AppNotification,
  locale: "fr" | "en",
): string | null {
  if (notification.type !== "action_event" || !notification.payload) return null;
  const subtype = notification.payload.subtype;
  if (typeof subtype !== "string") return null;
  const staticLabel = actionEventStaticLabels[subtype];
  if (staticLabel) return staticLabel[locale];
  if (subtype === "action_update") {
    const changeKinds = Array.isArray(notification.payload.changeKinds)
      ? notification.payload.changeKinds.filter(
          (kind): kind is ActionChangeKind => kind in ACTION_CHANGE_LABELS,
        )
      : [];
    if (changeKinds.includes("cancellation")) {
      return ACTION_CHANGE_LABELS.cancellation[locale];
    }
    const labels = [...new Set(changeKinds)].map((kind) => ACTION_CHANGE_LABELS[kind][locale]);
    return labels.length > 0
      ? labels.join(" · ")
      : locale === "fr" ? "Action modifiée" : "Action updated";
  }
  return null;
}

function NotificationDecisionActions({
  decision,
  locale,
  compact,
}: {
  decision: NotificationListItemProps["decision"];
  locale: "fr" | "en";
  compact: boolean;
}) {
  if (!decision) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {decision.state === "decision_pending" ? (
        decision.kind === "action_result" ? (
          <>
            <button type="button" disabled={decision.busy} onClick={() => decision.onDecision("claim")} aria-label={locale === "fr" ? "Indiquer que j'ai participé" : "Say I participated"} className={compact ? "rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-wait disabled:opacity-60" : "rounded-lg border border-current/30 px-2.5 py-1.5 text-xs font-bold cmm-text-success transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-wait disabled:opacity-60"}>
              ✓ {locale === "fr" ? "J'ai participé" : "I participated"}
            </button>
            <button type="button" disabled={decision.busy} onClick={() => decision.onDecision("not_participated")} aria-label={locale === "fr" ? "Indiquer que je n'ai pas participé" : "Say I did not participate"} className={compact ? "rounded-lg border border-slate-300/40 bg-slate-400/15 px-2.5 py-1.5 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-wait disabled:opacity-60" : "rounded-lg border border-current/30 px-2.5 py-1.5 text-xs font-bold cmm-text-secondary transition-colors hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:cursor-wait disabled:opacity-60"}>
              × {locale === "fr" ? "Je n'ai pas participé" : "I did not participate"}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={decision.busy} onClick={() => decision.onDecision("accept")} aria-label={locale === "fr" ? "Accepter la demande" : "Accept request"} className={compact ? "rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-wait disabled:opacity-60" : "rounded-lg border border-current/30 px-2.5 py-1.5 text-xs font-bold cmm-text-success transition-colors hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-wait disabled:opacity-60"}>
              ✓ {locale === "fr" ? "Accepter" : "Accept"}
            </button>
            <button type="button" disabled={decision.busy} onClick={() => decision.onDecision("reject")} aria-label={locale === "fr" ? "Refuser la demande" : "Reject request"} className={compact ? "rounded-lg border border-rose-300/40 bg-rose-400/15 px-2.5 py-1.5 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-wait disabled:opacity-60" : "rounded-lg border border-current/30 px-2.5 py-1.5 text-xs font-bold cmm-text-danger transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 disabled:cursor-wait disabled:opacity-60"}>
              × {locale === "fr" ? "Refuser" : "Reject"}
            </button>
          </>
        )
      ) : null}
      {decision.busy ? <span className="text-xs font-semibold opacity-75" role="status">{locale === "fr" ? "Traitement…" : "Processing…"}</span> : null}
      {decision.error ? <span className={compact ? "text-xs font-semibold text-rose-200" : "text-xs font-semibold cmm-text-danger"} role="alert">{decision.error}</span> : null}
    </div>
  );
}

function NotificationActionHint({
  notification,
  compact,
  locale,
}: {
  notification: AppNotification;
  compact: boolean;
  locale: string;
}) {
  if (notification.type !== "gamification_reconciliation") return null;
  return (
    <span className={`block pt-1 text-xs font-black ${compact ? "text-sky-300" : "cmm-text-link"}`}>
      {locale === "fr" ? "Voir les changements" : "View changes"}
    </span>
  );
}
