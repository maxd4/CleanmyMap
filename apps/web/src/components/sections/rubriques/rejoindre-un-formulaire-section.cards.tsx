import Link from "next/link";
import { ArrowUpDown, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Leaf, Loader2, MapPin, ShieldCheck, Sparkles, Users2, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ActionParticipationReviewItem, JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";
import { ActionThumbnail } from "./rejoindre-un-formulaire-section.illustrations";
import { getActionDisplayStatus, getCardDisplayStatus, getLifecycleLabel, getStatusDotTone, getStatusLabel } from "./rejoindre-un-formulaire-section.status";

export function PillBadge({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "slate";
  children: ReactNode;
}) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${toneClasses}`}>
      {children}
    </span>
  );
}
export function HeroStatCard({
  icon,
  value,
  label,
  tone = "emerald",
  compact = false,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  tone?: "emerald" | "amber";
  compact?: boolean;
}) {
  return (
    <div
      className={`flex h-full ${compact ? "min-h-[80px] px-3 py-2.5" : "min-h-[102px] px-4 py-3"} flex-col justify-between rounded-[1.25rem] border shadow-[0_18px_34px_-30px_rgba(15,23,42,0.18)] ${
        tone === "amber" ? "border-amber-100 bg-amber-50/70" : "border-emerald-100 bg-white/85"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex ${compact ? "h-8 w-8" : "h-10 w-10"} items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm`}>
          {icon}
        </span>
      </div>
      <div className="space-y-1">
        <p className={`font-black uppercase tracking-[0.22em] text-slate-500 ${compact ? "text-[8px]" : "text-[10px]"}`}>{label}</p>
        <p className={`${compact ? "text-[1.55rem]" : "text-[1.95rem]"} font-black tracking-tight text-slate-900`}>{value}</p>
      </div>
    </div>
  );
}

export function FilterField({
  label,
  icon,
  children,
  className = "",
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex min-h-[56px] flex-col justify-between rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_12px_22px_-20px_rgba(15,23,42,0.18)] ${className}`}
    >
      <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

export function ShortcutsCard() {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black tracking-tight text-emerald-900">Raccourcis</h3>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-[1.1rem] border border-slate-100">
        {[
          { href: "#mon-suivi", label: "Mes participations", icon: <UserRound size={18} /> },
          { href: "#file-publique", label: "Mes demandes envoyées", icon: <ArrowUpDown size={18} /> },
          { href: "/actions/new", label: "Devenir organisateur", icon: <Sparkles size={18} /> },
          { href: "/sections/guide", label: "Guide du bénévole", icon: <ChevronRight size={18} /> },
        ].map((shortcut) => (
          <Link
            key={shortcut.label}
            href={shortcut.href}
            className="flex items-center justify-between gap-3 bg-white px-4 py-3 transition hover:bg-emerald-50/60"
          >
            <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                {shortcut.icon}
              </span>
              {shortcut.label}
            </span>
            <ChevronRight size={16} className="text-emerald-700" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function HelpCard() {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-[linear-gradient(135deg,#f7fbf4_0%,#eef7e5_100%)] p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="relative flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-base font-black tracking-tight text-emerald-900">Besoin d’aide ?</h3>
          <p className="max-w-xs text-sm leading-relaxed text-slate-700">
            Consultez notre FAQ ou contactez-nous.
          </p>
          <CmmButton href="/feedback" tone="secondary" variant="pill" size="sm" className="mt-2">
            Centre d&apos;aide
          </CmmButton>
        </div>
        <div className="relative h-24 w-24 shrink-0">
          <div className="absolute bottom-1 right-1 h-14 w-14 rounded-full bg-emerald-200/70" />
          <Leaf size={38} className="absolute right-2 top-1 text-emerald-700" />
          <div className="absolute bottom-2 left-0 h-12 w-16 rounded-[999px] border-2 border-emerald-300/70 bg-white/70" />
          <div className="absolute bottom-1 left-7 h-8 w-8 rotate-[-18deg] rounded-full border-2 border-emerald-400/70 bg-emerald-50" />
        </div>
      </div>
    </div>
  );
}

export function ActionCard({
  item,
  index,
  fr,
  authenticated,
  joining,
  leaving,
  onRequestJoin,
  onRequestLeave,
}: {
  item: JoinableActionItem;
  index: number;
  fr: boolean;
  authenticated: boolean;
  joining: boolean;
  leaving: boolean;
  onRequestJoin: (actionId: string) => void;
  onRequestLeave: (actionId: string) => void;
}) {
  const status = getActionDisplayStatus(item);
  const isPreAction = item.actionPhase === "pre_action";
  const cardStatus = isPreAction ? getCardDisplayStatus(item) : "completed";
  const statusLabel = getStatusLabel(cardStatus, fr);
  const lifecycleLabel = getLifecycleLabel(item.actionPhase, fr);
  const footerLabel = isPreAction
    ? fr
      ? "Pré-formulaire visible"
      : "Pre-form visible"
    : fr
      ? "Déclaration complète"
      : "Complete declaration";
  const requestCountLabel = `${formatCount(item.pendingRequestsCount)} ${fr ? "demandes" : "requests"}`;

  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.38)]">
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-stretch">
        <ActionThumbnail item={item} index={index} />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-black tracking-tight text-emerald-950">{item.location_label}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <PillBadge tone={item.actionPhase === "pre_action" ? "amber" : "emerald"}>
                  {lifecycleLabel}
                </PillBadge>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400" />
                  {item.location_label}
                </p>
              </div>
            </div>
            <PillBadge tone={cardStatus === "pending" ? "amber" : cardStatus === "closed" || cardStatus === "cancelled" ? "slate" : "emerald"}>
              <span className={`h-2 w-2 rounded-full ${getStatusDotTone(cardStatus)}`} />
              {statusLabel}
            </PillBadge>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <CalendarDays size={14} className="text-slate-400" />
              {fr ? formatDate(item.action_date, "fr") : formatDate(item.action_date, "en")}
              <span className="text-slate-300">•</span>
              {item.duration_minutes > 0 ? `${formatCount(item.duration_minutes)} min` : "—"}
            </p>
            <p className="flex items-center gap-2">
              <Users2 size={14} className="text-slate-400" />
              {fr ? `Organisé par Clean River Paris` : "Organized by Clean River Paris"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              {formatCount(item.participantsCount)}/{formatCount(item.volunteers_count)}{" "}
              {fr ? "bénévoles" : "volunteers"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              {requestCountLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              {isPreAction
                ? status === "closed"
                  ? fr
                    ? "Pré-formulaire fermé"
                    : "Pre-form closed"
                  : fr
                    ? "Ouvert aux bénévoles"
                    : "Open to volunteers"
                : fr
                  ? "Déclaration complète"
                  : "Complete declaration"}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 md:items-end">
          {!isPreAction || status === "closed" ? (
            <CmmButton href="/actions/history" tone="secondary" variant="pill" className="min-w-[12rem] px-5">
              <span className="flex items-center gap-2">
                {fr ? "Voir les détails" : "View details"}
                <ChevronRight size={16} />
              </span>
            </CmmButton>
          ) : authenticated ? (
            item.joined || item.awaitingApproval ? (
              <CmmButton
                tone="secondary"
                variant="pill"
                className="min-w-[12rem] px-5"
                disabled={leaving}
                onClick={() => onRequestLeave(item.id)}
              >
                {leaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {fr ? "Retrait..." : "Leaving..."}
                  </>
                ) : item.joined ? (
                  <>
                    <X size={14} />
                    {fr ? "Quitter le formulaire" : "Leave the form"}
                  </>
                ) : (
                  <>
                    <X size={14} />
                    {fr ? "Annuler ma demande" : "Cancel request"}
                  </>
                )}
              </CmmButton>
            ) : (
              <CmmButton
                tone="primary"
                variant="pill"
                className="min-w-[12rem] px-5"
                disabled={joining}
                onClick={() => onRequestJoin(item.id)}
              >
                {joining ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {fr ? "Envoi..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <ClipboardList size={14} />
                    {fr ? "Demander à participer" : "Request to join"}
                  </>
                )}
              </CmmButton>
            )
          ) : (
            <CmmButton href="/sign-in" tone="primary" variant="pill" className="min-w-[12rem] px-5">
              <span className="flex items-center gap-2">
                <ClipboardList size={14} />
                {fr ? "Se connecter" : "Sign in"}
              </span>
            </CmmButton>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>{footerLabel}</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-700" />
          {fr ? "Participation sécurisée" : "Protected participation"}
        </span>
      </div>
    </article>
  );
}

export function QueueRow({
  request,
  fr,
  queueCanReview,
  reviewingQueueId,
  onReviewQueueRequest,
  displayMode,
}: {
  request: ActionParticipationReviewItem;
  fr: boolean;
  queueCanReview: boolean;
  reviewingQueueId: string | null;
  onReviewQueueRequest: (requestId: string, decision: "accept" | "reject") => void;
  displayMode: "pending" | "confirmed";
}) {
  const initials = request.displayName
    .split(" ")
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_auto_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {request.displayName}
        </p>
        <p className="text-xs text-slate-500">
          {request.handle ? `@${request.handle}` : fr ? "Compte public absent" : "No public handle"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">
            {fr ? "Demande reçue" : "Request received"}
          </p>
          <p className="text-xs text-slate-500">
            {fr ? formatDate(request.joinedAt.slice(0, 10), "fr") : formatDate(request.joinedAt.slice(0, 10), "en")}
          </p>
        </div>
      </div>
      <PillBadge tone={displayMode === "pending" ? "amber" : "emerald"}>
        {displayMode === "pending" ? (fr ? "En attente" : "Pending") : fr ? "Confirmé" : "Confirmed"}
      </PillBadge>
      {queueCanReview ? (
        <div className="flex items-center gap-2">
          {displayMode === "pending" && (
            <button
              type="button"
              aria-label={fr ? "Accepter la demande" : "Accept request"}
              disabled={reviewingQueueId === request.id}
              onClick={() => onReviewQueueRequest(request.id, "accept")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
            </button>
          )}
          <button
            type="button"
            aria-label={fr ? "Exclure le compte" : "Remove account"}
            disabled={reviewingQueueId === request.id}
            onClick={() => onReviewQueueRequest(request.id, "reject")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="hidden md:block text-sm text-slate-500">
          {fr ? "Lecture seule" : "Read only"}
        </div>
      )}
    </div>
  );
}
