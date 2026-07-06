import Link from "next/link";
import { ArrowUpDown, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Leaf, Loader2, MapPin, ShieldCheck, Sparkles, Users2, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import type { ActionPhase } from "@/lib/actions/types";
import type { ActionParticipationReviewItem, JoinableActionItem } from "@/lib/actions/group-participation";
import { CmmButton } from "@/components/ui/cmm-button";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

type ThumbnailVariant = {
  sky: string;
  land: string;
  accent: string;
  water: string;
};

const THUMBNAILS: ThumbnailVariant[] = [
  {
    sky: "#dff1ff",
    land: "#7fb85f",
    accent: "#2b7a47",
    water: "#a8dbff",
  },
  {
    sky: "#eef8d8",
    land: "#6cab49",
    accent: "#2f6f33",
    water: "#a9d7a2",
  },
  {
    sky: "#dcefff",
    land: "#8dc8e8",
    accent: "#1f7a59",
    water: "#8dc8e8",
  },
  {
    sky: "#eef7e7",
    land: "#74b56f",
    accent: "#28663a",
    water: "#bfe3a8",
  },
];

export type ActionCardStatus = "open" | "pending" | "closed" | "confirmed" | "cancelled" | "completed";

export function getActionDisplayStatus(item: JoinableActionItem): "open" | "pending" | "closed" | "confirmed" {
  if (item.joined) {
    return "confirmed";
  }
  if (item.awaitingApproval) {
    return "pending";
  }
  if (!item.groupJoinEnabled) {
    return "closed";
  }
  return "open";
}

export function getCardDisplayStatus(item: JoinableActionItem): ActionCardStatus {
  if (item.participationStatus === "cancelled") {
    return "cancelled";
  }

  if (item.joined) {
    return "confirmed";
  }

  if (item.awaitingApproval) {
    return "pending";
  }

  if (!item.groupJoinEnabled) {
    return "closed";
  }

  return "open";
}

export function getStatusLabel(status: ActionCardStatus, fr: boolean): string {
  switch (status) {
    case "pending":
      return fr ? "En attente" : "Pending";
    case "closed":
      return fr ? "Fermée" : "Closed";
    case "confirmed":
      return fr ? "Confirmée" : "Confirmed";
    case "cancelled":
      return fr ? "Annulée" : "Cancelled";
    case "completed":
      return fr ? "Complétée" : "Completed";
    case "open":
    default:
      return fr ? "Ouverte" : "Open";
  }
}

export function getStatusDotTone(status: ActionCardStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500";
    case "closed":
    case "cancelled":
      return "bg-slate-400";
    case "confirmed":
      return "bg-emerald-600";
    case "completed":
      return "bg-emerald-500";
    case "open":
    default:
      return "bg-emerald-500";
  }
}

export function getLifecycleLabel(actionPhase: ActionPhase, fr: boolean): string {
  switch (actionPhase) {
    case "pre_action":
      return fr ? "Pré-action" : "Pre-action";
    case "post_action_draft":
      return fr ? "À compléter après action" : "To complete after action";
    case "post_action_complete":
    default:
      return fr ? "Déclaration complète" : "Complete declaration";
  }
}

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

function ActionThumbnail({ item, index }: { item: JoinableActionItem; index: number }) {
  const variant = THUMBNAILS[index % THUMBNAILS.length];
  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] border border-white/70 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.45)]"
      style={{
        background: `linear-gradient(180deg, ${variant.sky} 0%, #f6f9f3 52%, #e3efd5 100%)`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_76%_18%,rgba(255,255,255,0.45),transparent_19%)]" />
      <svg viewBox="0 0 420 260" className="relative h-full w-full" aria-hidden="true">
        <path d="M0 182c50-32 98-44 145-43 48 1 71 21 117 21 38 0 73-12 111-32 31-16 58-23 47-20v152H0z" fill={variant.land} opacity="0.9" />
        <path d="M0 208c48-20 97-30 145-27 50 4 79 27 133 27 44 0 82-15 142-39v91H0z" fill={variant.accent} opacity="0.82" />
        <path d="M0 171c66-28 108-39 164-35 53 4 88 27 131 27 36 0 78-12 125-35v29c-38 17-79 29-125 29-50 0-90-25-144-28-47-3-91 7-151 28z" fill={variant.water} opacity="0.68" />
        <circle cx="66" cy="58" r="22" fill="#fffdf3" opacity="0.85" />
        <circle cx="95" cy="76" r="14" fill="#fffdf3" opacity="0.72" />
        <g transform="translate(264 64)" opacity="0.72">
          <rect x="0" y="46" width="15" height="62" rx="2" fill={variant.accent} />
          <circle cx="7" cy="38" r="26" fill={variant.land} />
          <circle cx="7" cy="58" r="22" fill={variant.water} />
        </g>
        <g transform="translate(330 36)" opacity="0.95">
          <rect x="0" y="48" width="11" height="78" rx="2" fill={variant.accent} />
          <path d="M5 0c18 6 36 20 45 44-16 1-31 8-44 20-6-18-6-37-1-64z" fill={variant.land} />
          <path d="M13 18c11 5 22 13 31 25-9 5-18 13-25 24-8-14-9-30-6-49z" fill={variant.water} />
        </g>
        <g transform="translate(44 115)">
          <path d="M0 60c12-20 24-36 34-60h12C36 30 29 44 18 60z" fill={variant.accent} />
          <circle cx="31" cy="11" r="16" fill={variant.land} />
          <circle cx="46" cy="22" r="13" fill={variant.water} />
          <circle cx="20" cy="21" r="12" fill="#4f8f59" />
        </g>
        <g transform="translate(188 146)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 52c20-19 35-31 54-49 18 15 31 26 47 49" stroke="#ffffff" strokeWidth="4" opacity="0.66" />
          <path d="M14 52c13-13 24-21 40-35 13 11 22 21 34 35" stroke={variant.accent} strokeWidth="4" opacity="0.9" />
        </g>
        <g transform="translate(150 192)">
          <rect x="0" y="4" width="86" height="12" rx="6" fill="#ffffff" opacity="0.45" />
        </g>
        <g transform="translate(92 170)">
          <path d="M0 42c12-15 22-28 29-42h9C31 18 25 30 16 42z" fill="#ffffff" opacity="0.45" />
        </g>
      </svg>
      <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800 shadow-sm">
        {item.groupJoinEnabled ? "Open" : "Closed"}
      </div>
    </div>
  );
}

export function HeroIllustration() {
  return (
    <div className="relative h-full min-h-[142px] overflow-hidden rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,#f5faef_0%,#eaf5df_54%,#d9ecd1_100%)] opacity-70 shadow-[0_16px_30px_-30px_rgba(16,185,129,0.2)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.72),transparent_26%),radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.52),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_35%)]" />
      <svg viewBox="0 0 840 360" className="absolute inset-0 h-full w-full scale-[0.86]" aria-hidden="true">
        <defs>
          <linearGradient id="heroHillA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cce8af" />
            <stop offset="100%" stopColor="#a4d59b" />
          </linearGradient>
          <linearGradient id="heroHillB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8ac37f" />
            <stop offset="100%" stopColor="#5aa665" />
          </linearGradient>
          <linearGradient id="heroTree" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dff0c2" />
            <stop offset="100%" stopColor="#4e9854" />
          </linearGradient>
        </defs>
        <path d="M0 258c72-34 132-48 190-47 90 2 142 45 223 45 70 0 121-18 191-49 68-31 156-42 236-18v171H0z" fill="url(#heroHillA)" opacity="0.95" />
        <path d="M80 278c50-23 102-31 145-31 58 0 103 16 160 16 56 0 92-19 151-43 63-25 133-31 220-13 35 7 60 16 84 28v125H80z" fill="url(#heroHillB)" opacity="0.95" />
        <g fill="#eaf5dc" opacity="0.9">
          <circle cx="610" cy="63" r="24" />
          <circle cx="635" cy="56" r="18" />
          <circle cx="662" cy="66" r="18" />
          <rect x="586" y="72" width="102" height="12" rx="6" />
        </g>
        <g opacity="0.25" fill="#4a7b4f">
          <rect x="445" y="98" width="34" height="60" rx="2" />
          <rect x="490" y="82" width="30" height="78" rx="2" />
          <rect x="533" y="104" width="24" height="55" rx="2" />
          <rect x="570" y="92" width="42" height="67" rx="2" />
        </g>
        <g stroke="#3b7c44" strokeLinecap="round" strokeWidth="2.3" fill="none">
          <path d="M752 54c8 0 16 3 22 8" />
          <path d="M772 52c8 0 16 3 22 8" />
          <path d="M705 66c8 0 16 3 22 8" />
        </g>
        <g transform="translate(118 160)">
          <path d="M0 76c22-28 36-48 49-79h18C54 30 44 50 28 76z" fill="#7eb46a" />
          <path d="M53 17c10 22 17 38 23 59H57C50 51 44 35 32 17z" fill="#6ea95c" />
          <circle cx="49" cy="16" r="17" fill="#8fca78" />
          <circle cx="67" cy="24" r="15" fill="#9dd288" />
          <circle cx="34" cy="24" r="14" fill="#7fbf6c" />
        </g>
        <g transform="translate(235 136)">
          <path d="M0 100c18-18 28-35 40-70h15c-10 40-19 61-35 79z" fill="#6fa95a" />
          <circle cx="36" cy="32" r="18" fill="#8bc476" />
          <circle cx="52" cy="40" r="17" fill="#a6d98b" />
          <circle cx="22" cy="40" r="14" fill="#76b967" />
        </g>
        <g transform="translate(662 96)">
          <path d="M0 138c21-33 33-61 53-127h19c-18 71-28 100-49 127z" fill="url(#heroTree)" />
          <ellipse cx="60" cy="18" rx="42" ry="28" fill="#8fcf77" opacity="0.95" />
          <ellipse cx="48" cy="40" rx="44" ry="30" fill="#5ea55a" opacity="0.94" />
          <ellipse cx="84" cy="52" rx="36" ry="26" fill="#3f8d46" opacity="0.95" />
          <ellipse cx="18" cy="48" rx="30" ry="22" fill="#a8db8a" opacity="0.9" />
        </g>
        <g transform="translate(500 192)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 54c18-13 31-25 42-43 11 17 25 31 43 43" stroke="#87bf6e" strokeWidth="3" />
          <path d="M24 54c8-10 16-17 27-24 12 8 19 15 27 24" stroke="#5c9b54" strokeWidth="3" />
        </g>
        <g transform="translate(354 236)">
          <ellipse cx="0" cy="40" rx="80" ry="18" fill="#5f9d61" opacity="0.55" />
          <ellipse cx="112" cy="35" rx="76" ry="22" fill="#7abd67" opacity="0.75" />
          <ellipse cx="248" cy="30" rx="82" ry="20" fill="#4f8e52" opacity="0.65" />
        </g>
      </svg>
      <div className="absolute left-6 top-6 h-4 w-4 rounded-full border border-white/70 bg-white/40 shadow-sm" />
      <div className="absolute right-6 top-6 h-4 w-4 rounded-full border border-white/70 bg-white/30 shadow-sm" />
      <div className="absolute bottom-4 right-6 h-6 w-6 rounded-full border border-white/70 bg-white/24 shadow-sm" />
    </div>
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
