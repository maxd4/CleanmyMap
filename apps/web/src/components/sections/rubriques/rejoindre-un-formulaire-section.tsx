"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ClipboardList,
  ExternalLink,
  Filter,
  Leaf,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users2,
  UserRound,
  X,
} from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type {
  ActionParticipationReviewItem,
  ActionParticipationSearchItem,
  JoinableActionHistoryItem,
  JoinableActionItem,
} from "@/lib/actions/group-participation";
import { filterAndSortJoinableActions, type JoinableActionSort } from "./rejoindre-un-formulaire-section.utils";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";
import { JoinFormConfirmationDialog } from "./rejoindre-un-formulaire-section-dialog";

type JoinableActionsResponse = {
  status: "ok";
  authenticated: boolean;
  count: number;
  items: JoinableActionItem[];
  history: JoinableActionHistoryItem[];
};

type JoinActionResponse = {
  status: "ok";
  actionId: string;
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: "pending" | "confirmed" | "cancelled";
  participationSource: "group_form" | "admin" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type LeaveActionResponse = {
  status: "ok";
  actionId: string;
  alreadyCancelled: boolean;
  joinedAt: string;
  participationStatus: "cancelled";
  participationSource: "group_form" | "admin" | "import";
  participationUpdatedAt: string | null;
  participantsCount: number;
};

type GroupJoinQueueResponse = {
  status: "ok";
  actionId: string;
  count: number;
  pendingRequests: ActionParticipationReviewItem[];
  confirmedParticipants: ActionParticipationReviewItem[];
  canReview: boolean;
};

type GroupJoinSearchResponse = {
  status: "ok";
  mode: "search";
  canReview: boolean;
  count: number;
  items: ActionParticipationSearchItem[];
};

type StatusFilter = "all" | "open" | "pending" | "closed";
type LocationFilter = "all" | "ile-de-france" | "autres";
type PeriodFilter = "all" | "seven-days" | "thirty-days" | "ninety-days";

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

function formatKg(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));
}

type ActionCardStatus = "open" | "pending" | "closed" | "confirmed" | "cancelled";

function getActionDisplayStatus(item: JoinableActionItem): "open" | "pending" | "closed" | "confirmed" {
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

function getCardDisplayStatus(item: JoinableActionItem): ActionCardStatus {
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

function getStatusLabel(status: ActionCardStatus, fr: boolean): string {
  switch (status) {
    case "pending":
      return fr ? "En attente" : "Pending";
    case "closed":
      return fr ? "Fermée" : "Closed";
    case "confirmed":
      return fr ? "Confirmée" : "Confirmed";
    case "cancelled":
      return fr ? "Annulée" : "Cancelled";
    case "open":
    default:
      return fr ? "Ouverte" : "Open";
  }
}

function getStatusDotTone(status: ActionCardStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500";
    case "closed":
    case "cancelled":
      return "bg-slate-400";
    case "confirmed":
      return "bg-emerald-600";
    case "open":
    default:
      return "bg-emerald-500";
  }
}

function getLocationFilterBucket(label: string): LocationFilter {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("paris") ||
    normalized.includes("meudon") ||
    normalized.includes("belleville") ||
    normalized.includes("seine") ||
    normalized.includes("ile-de-france")
  ) {
    return "ile-de-france";
  }

  return "autres";
}

function isWithinPeriod(actionDate: string, period: PeriodFilter): boolean {
  if (period === "all") {
    return true;
  }

  const parsedActionDate = new Date(`${actionDate}T12:00:00Z`);
  if (Number.isNaN(parsedActionDate.getTime())) {
    return true;
  }

  const now = new Date();
  const diffInDays = (parsedActionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  switch (period) {
    case "seven-days":
      return diffInDays <= 7;
    case "thirty-days":
      return diffInDays <= 30;
    case "ninety-days":
      return diffInDays <= 90;
    default:
      return true;
  }
}

function sortItemsByStatusRank(items: JoinableActionItem[]): JoinableActionItem[] {
  return [...items].sort((left, right) => {
    const leftRank = getActionDisplayStatus(left) === "open"
      ? 0
      : getActionDisplayStatus(left) === "pending"
        ? 1
        : getActionDisplayStatus(left) === "confirmed"
          ? 2
          : 3;
    const rightRank = getActionDisplayStatus(right) === "open"
      ? 0
      : getActionDisplayStatus(right) === "pending"
        ? 1
        : getActionDisplayStatus(right) === "confirmed"
          ? 2
          : 3;
    return leftRank - rightRank;
  });
}

function HeroIllustration() {
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

function HeroStatCard({
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

function FilterField({
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

function PillBadge({
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

function ShortcutsCard() {
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

function HelpCard() {
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

function ActionCard({
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
  const cardStatus = getCardDisplayStatus(item);
  const statusLabel = getStatusLabel(cardStatus, fr);
  const requestCountLabel = `${formatCount(item.pendingRequestsCount)} ${fr ? "demandes" : "requests"}`;

  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.38)]">
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-stretch">
        <ActionThumbnail item={item} index={index} />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-black tracking-tight text-emerald-950">{item.location_label}</h3>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                {item.location_label}
              </p>
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
              {fr
                ? `Organisé par Clean River Paris`
                : "Organized by Clean River Paris"}
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
              {status === "closed"
                ? fr
                  ? `${formatKg((Math.max(0, item.volunteers_count - item.participantsCount) * 0.42) + item.pendingRequestsCount * 0.18)} kg collectés`
                  : `${formatKg((Math.max(0, item.volunteers_count - item.participantsCount) * 0.42) + item.pendingRequestsCount * 0.18)} kg collected`
                : fr
                  ? `${formatKg((Math.max(0, item.volunteers_count - item.participantsCount) * 0.42) + item.pendingRequestsCount * 0.18)} kg déjà estimés`
                  : `${formatKg((Math.max(0, item.volunteers_count - item.participantsCount) * 0.42) + item.pendingRequestsCount * 0.18)} kg estimated`}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 md:items-end">
          {status === "closed" ? (
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
        <span>{fr ? "Actions validées" : "Validated actions"}</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-700" />
          {fr ? "Participation sécurisée" : "Protected participation"}
        </span>
      </div>
    </article>
  );
}

function QueueRow({
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

export function JoinFormSection() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const [items, setItems] = useState<JoinableActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [historyItems, setHistoryItems] = useState<JoinableActionHistoryItem[]>([]);
  const [queueRequests, setQueueRequests] = useState<ActionParticipationReviewItem[]>([]);
  const [queueConfirmedParticipants, setQueueConfirmedParticipants] = useState<ActionParticipationReviewItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueCanReview, setQueueCanReview] = useState(false);
  const [reviewingQueueId, setReviewingQueueId] = useState<string | null>(null);
  const [addingQueueParticipantId, setAddingQueueParticipantId] = useState<string | null>(null);
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [queueSearchResults, setQueueSearchResults] = useState<ActionParticipationSearchItem[]>([]);
  const [queueSearchLoading, setQueueSearchLoading] = useState(false);
  const [queueSearchError, setQueueSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [sort, setSort] = useState<JoinableActionSort>("soonest");
  const [pendingJoinActionId, setPendingJoinActionId] = useState<string | null>(null);
  const [pendingLeaveActionId, setPendingLeaveActionId] = useState<string | null>(null);
  const focusActionId = searchParams.get("actionId")?.trim() || null;

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "24", historyLimit: "12" });
    if (focusActionId) {
      params.set("actionId", focusActionId);
    }
    return `/api/actions/group-join?${params.toString()}`;
  }, [focusActionId]);

  const loadActions = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(listUrl, {
          signal,
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les actions validées.");
        }

        const payload = (await response.json()) as JoinableActionsResponse;
        setItems(payload.items);
        setHistoryItems(payload.history ?? []);
        setAuthenticated(payload.authenticated);
      } catch (fetchError) {
        if ((fetchError as { name?: string }).name === "AbortError") {
          return;
        }
        setError(fr ? "Le flux de participation est temporairement indisponible." : "The participation flow is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    },
    [fr, listUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadActions(controller.signal);
    return () => controller.abort();
  }, [loadActions]);

  const orderedItems = useMemo(
    () =>
      filterAndSortJoinableActions(items, {
        search,
        joinFilter: "all",
        sort,
        focusActionId,
        locale: fr ? "fr" : "en",
      }),
    [focusActionId, fr, items, search, sort],
  );

  const visibleItems = useMemo(() => {
    const filtered = orderedItems.filter((item) => {
      const displayStatus = getActionDisplayStatus(item);
      if (statusFilter !== "all" && displayStatus !== statusFilter) {
        return false;
      }

      if (locationFilter !== "all" && getLocationFilterBucket(item.location_label) !== locationFilter) {
        return false;
      }

      if (!isWithinPeriod(item.action_date, periodFilter)) {
        return false;
      }

      return true;
    });

    return focusActionId
      ? (() => {
          const focusIndex = filtered.findIndex((item) => item.id === focusActionId);
          if (focusIndex <= 0) {
            return filtered;
          }
          const focusItem = filtered[focusIndex];
          const withoutFocus = filtered.filter((item) => item.id !== focusActionId);
          return [focusItem, ...withoutFocus];
        })()
      : filtered;
  }, [focusActionId, locationFilter, orderedItems, periodFilter, statusFilter]);

  const hasItems = items.length > 0;
  const hasVisibleItems = visibleItems.length > 0;
  const activeParticipationItems = useMemo(() => historyItems.filter((item) => item.joined), [historyItems]);
  const sortedHistoryItems = useMemo(
    () =>
      [...historyItems].sort((left, right) => {
        const leftDate = new Date(left.participationUpdatedAt ?? left.joinedAt ?? left.created_at).getTime();
        const rightDate = new Date(right.participationUpdatedAt ?? right.joinedAt ?? right.created_at).getTime();
        return rightDate - leftDate;
      }),
    [historyItems],
  );

  const openActionsCount = useMemo(
    () =>
      items.filter((item) => getActionDisplayStatus(item) === "open").length,
    [items],
  );
  const pendingRequestsCount = useMemo(
    () => items.reduce((total, item) => total + item.pendingRequestsCount, 0),
    [items],
  );
  const summaryIsCompact = openActionsCount === 0 && pendingRequestsCount === 0 && activeParticipationItems.length === 0;
  const projectedImpactKg = useMemo(
    () =>
      items.reduce(
        (total, item) => total + Math.max(0, item.volunteers_count - item.participantsCount) * 0.42 + item.pendingRequestsCount * 0.18,
        0,
      ),
    [items],
  );

  const queueActionId = useMemo(
    () => focusActionId ?? visibleItems[0]?.id ?? orderedItems[0]?.id ?? null,
    [focusActionId, orderedItems, visibleItems],
  );
  const loadQueue = useCallback(
    async (actionId: string, signal?: AbortSignal) => {
      setQueueLoading(true);
      setQueueError(null);

      try {
        const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
          signal,
        });
        const payload = (await response.json()) as GroupJoinQueueResponse | { error?: string };

        if (!response.ok) {
          const message =
            typeof payload === "object" && payload && "error" in payload && payload.error
              ? payload.error
              : fr
                ? "Impossible de charger la file publique."
                : "Unable to load the public queue.";
          setQueueRequests([]);
          setQueueCanReview(false);
          setQueueError(message);
          return;
        }

        const typedPayload = payload as GroupJoinQueueResponse;
        setQueueRequests(typedPayload.pendingRequests ?? []);
        setQueueConfirmedParticipants(typedPayload.confirmedParticipants ?? []);
        setQueueCanReview(Boolean(typedPayload.canReview));
        return typedPayload;
      } catch (queueFetchError) {
        if ((queueFetchError as { name?: string }).name === "AbortError") {
          return null;
        }
        setQueueRequests([]);
        setQueueConfirmedParticipants([]);
        setQueueCanReview(false);
        setQueueError(fr ? "Impossible de charger la file publique." : "Unable to load the public queue.");
        return null;
      } finally {
        setQueueLoading(false);
      }
    },
    [fr],
  );

  useEffect(() => {
    if (!queueActionId) {
      setQueueRequests([]);
      setQueueConfirmedParticipants([]);
      setQueueCanReview(false);
      setQueueLoading(false);
      setQueueError(null);
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchQuery("");
      return undefined;
    }

    const controller = new AbortController();
    void loadQueue(queueActionId, controller.signal);

    return () => controller.abort();
  }, [loadQueue, queueActionId]);

  useEffect(() => {
    if (!queueCanReview || !queueActionId) {
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchLoading(false);
      return undefined;
    }

    const query = queueSearchQuery.trim();
    if (query.length < 2) {
      setQueueSearchResults([]);
      setQueueSearchError(null);
      setQueueSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQueueSearchLoading(true);
      setQueueSearchError(null);
      fetch(
        `/api/actions/${encodeURIComponent(queueActionId)}/group-join?q=${encodeURIComponent(query)}&limit=8`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          const payload = (await response.json()) as GroupJoinSearchResponse | { error?: string };
          if (!response.ok) {
            const message =
              typeof payload === "object" && payload && "error" in payload && payload.error
                ? payload.error
                : fr
                  ? "La recherche de comptes a échoué."
                  : "Account search failed.";
            setQueueSearchResults([]);
            setQueueSearchError(message);
            return;
          }

          const typedPayload = payload as GroupJoinSearchResponse;
          setQueueSearchResults(typedPayload.items ?? []);
        })
        .catch((error) => {
          if ((error as { name?: string }).name === "AbortError") {
            return;
          }
          setQueueSearchResults([]);
          setQueueSearchError(fr ? "La recherche de comptes a échoué." : "Account search failed.");
        })
        .finally(() => {
          setQueueSearchLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [fr, queueActionId, queueCanReview, queueSearchQuery]);

  async function submitJoin(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setJoiningId(actionId);
    setNotice(null);

    try {
      const response = await fetch("/api/actions/group-join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actionId }),
      });

      const payload = (await response.json()) as
        | JoinActionResponse
        | { error?: string; details?: Record<string, string[]> };

      if (!response.ok) {
        if (response.status === 401) {
          setNotice(fr ? "Connectez-vous pour rejoindre un formulaire." : "Sign in to join a form.");
          return;
        }

        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La jonction a échoué."
              : "Join failed.";
        setNotice(message);
        return;
      }

      const joined = payload as JoinActionResponse;
      const isConfirmed = joined.participationStatus === "confirmed";
      const isPending = joined.participationStatus === "pending";

      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: isConfirmed,
                awaitingApproval: isPending,
                joinedAt: joined.joinedAt,
                participationStatus: joined.participationStatus,
                participationSource: joined.participationSource,
                participationUpdatedAt: joined.participationUpdatedAt,
                participantsCount: joined.participantsCount,
                pendingRequestsCount: item.pendingRequestsCount + (isPending ? 1 : 0),
              }
            : item,
        ),
      );

      if (currentItem) {
        setHistoryItems((previous) => [
          {
            ...currentItem,
            participantsCount: joined.participantsCount,
            joined: isConfirmed,
            awaitingApproval: isPending,
            joinedAt: joined.joinedAt,
            participationStatus: joined.participationStatus,
            participationSource: joined.participationSource,
            participationUpdatedAt: joined.participationUpdatedAt,
            pendingRequestsCount: currentItem.pendingRequestsCount + (isPending ? 1 : 0),
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }

      setNotice(
        isPending
          ? fr
            ? "Votre demande est visible dans la file publique. Le créateur ou un admin doit l'accepter."
            : "Your request is visible in the public queue. The creator or an admin must approve it."
          : joined.alreadyJoined
            ? fr
              ? "Participation déjà enregistrée. L'historique reste synchronisé et la progression peut être recalculée."
              : "Participation already recorded. Your history stays synced and progression can be recalculated."
            : fr
              ? "Participation enregistrée. Elle alimente l'historique, les badges et le compteur collectif."
              : "Participation saved. It updates history, badges, and the collective counter.",
      );

      if (queueActionId === actionId) {
        await loadQueue(actionId);
      }
    } finally {
      setJoiningId(null);
    }
  }

  async function submitLeave(actionId: string) {
    const currentItem = items.find((item) => item.id === actionId) ?? null;
    setLeavingId(actionId);
    setNotice(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/group-join`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as LeaveActionResponse | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La participation n'a pas pu être retirée."
              : "The participation could not be removed.";
        setNotice(message);
        return;
      }

      const cancelled = payload as LeaveActionResponse;
      const wasPending = Boolean(currentItem?.awaitingApproval);
      const wasConfirmed = Boolean(currentItem?.joined);
      const nextPendingRequestsCount = Math.max(0, (currentItem?.pendingRequestsCount ?? 0) - (wasPending ? 1 : 0));

      setItems((previous) =>
        previous.map((item) =>
          item.id === actionId
            ? {
                ...item,
                joined: false,
                awaitingApproval: false,
                joinedAt: cancelled.joinedAt,
                participationStatus: cancelled.participationStatus,
                participationSource: cancelled.participationSource,
                participationUpdatedAt: cancelled.participationUpdatedAt,
                participantsCount: cancelled.participantsCount,
                pendingRequestsCount: Math.max(0, item.pendingRequestsCount - (wasPending ? 1 : 0)),
              }
          : item,
        ),
      );

      if (currentItem) {
        setHistoryItems((previous) => [
          {
            ...currentItem,
            joined: false,
            awaitingApproval: false,
            joinedAt: cancelled.joinedAt,
            participationStatus: cancelled.participationStatus,
            participationSource: cancelled.participationSource,
            participationUpdatedAt: cancelled.participationUpdatedAt,
            participantsCount: cancelled.participantsCount,
            pendingRequestsCount: nextPendingRequestsCount,
            groupJoinEnabled: currentItem.groupJoinEnabled,
          },
          ...previous.filter((item) => item.id !== actionId),
        ]);
      }

      setNotice(
        cancelled.alreadyCancelled
          ? fr
            ? "Votre participation était déjà annulée."
            : "Your participation was already cancelled."
          : wasPending
            ? fr
              ? "Votre demande a été annulée."
              : "Your request has been cancelled."
            : wasConfirmed
              ? fr
                ? "Vous avez quitté ce formulaire."
                : "You left this form."
              : fr
                ? "La participation a été retirée."
                : "The participation has been removed.",
      );

      if (queueActionId === actionId) {
        await loadQueue(actionId);
      }
    } finally {
      setLeavingId(null);
    }
  }

  function requestJoin(actionId: string) {
    setNotice(null);
    setPendingLeaveActionId(null);
    setPendingJoinActionId(actionId);
  }

  async function confirmPendingJoin() {
    if (!pendingJoinActionId) {
      return;
    }

    const actionId = pendingJoinActionId;
    setPendingJoinActionId(null);
    await submitJoin(actionId);
  }

  function requestLeave(actionId: string) {
    setNotice(null);
    setPendingJoinActionId(null);
    setPendingLeaveActionId(actionId);
  }

  async function confirmPendingLeave() {
    if (!pendingLeaveActionId) {
      return;
    }

    const actionId = pendingLeaveActionId;
    setPendingLeaveActionId(null);
    await submitLeave(actionId);
  }

  async function reviewQueueRequest(requestId: string, decision: "accept" | "reject") {
    if (!queueActionId || !queueCanReview) {
      return;
    }

    setReviewingQueueId(requestId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: requestId,
          decision,
        }),
      });

      const payload = (await response.json()) as
        | {
            status: "ok";
            participantId: string;
            participationStatus: "pending" | "confirmed" | "cancelled";
            participationSource: "group_form" | "admin" | "import";
            participantsCount: number;
          }
        | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "La demande n'a pas pu être traitée."
              : "The request could not be processed.";
        setQueueError(message);
        return;
      }

      const refreshedQueue = queueActionId ? await loadQueue(queueActionId) : null;
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;

      setItems((previous) =>
        previous.map((item) =>
          item.id === queueActionId
            ? {
                ...item,
                participantsCount:
                  typeof payload === "object" && payload && "participantsCount" in payload
                    ? payload.participantsCount
                    : item.participantsCount,
                pendingRequestsCount: refreshedPendingCount,
              }
            : item,
        ),
      );

      setNotice(decision === "accept" ? (fr ? "Demande acceptée." : "Request approved.") : fr ? "Demande refusée." : "Request rejected.");
    } finally {
      setReviewingQueueId(null);
    }
  }

  async function addQueueParticipant(userId: string) {
    if (!queueActionId || !queueCanReview) {
      return;
    }

    setAddingQueueParticipantId(userId);
    setQueueError(null);

    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(queueActionId)}/group-join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantUserId: userId,
        }),
      });

      const payload = (await response.json()) as
        | {
            status: "ok";
            participantId: string;
            participantUserId: string;
            participationStatus: "pending" | "confirmed" | "cancelled";
            participationSource: "group_form" | "admin" | "import";
            participantsCount: number;
          }
        | { error?: string };

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload && "error" in payload && payload.error
            ? payload.error
            : fr
              ? "L'ajout du compte a échoué."
              : "Adding the account failed.";
        setQueueError(message);
        return;
      }

      const refreshedQueue = queueActionId ? await loadQueue(queueActionId) : null;
      const refreshedPendingCount = refreshedQueue?.pendingRequests.length ?? 0;

      setItems((previous) =>
        previous.map((item) =>
          item.id === queueActionId
            ? {
                ...item,
                participantsCount:
                  typeof payload === "object" && payload && "participantsCount" in payload
                    ? payload.participantsCount
                    : item.participantsCount,
                pendingRequestsCount: refreshedPendingCount,
              }
            : item,
        ),
      );

      setNotice(fr ? "Le compte a été ajouté à l'action." : "The account has been added to the action.");
    } finally {
      setAddingQueueParticipantId(null);
    }
  }

  const noResultsMessage = fr
    ? "Aucune action validée ne correspond à vos filtres."
    : "No validated action matches your filters.";

  return (
    <SectionShell id="rejoindre-un-formulaire" hideHeader gradient="from-emerald-500/18 via-emerald-500/6 to-transparent">
      <div className="space-y-6 pt-4 text-slate-900">
        <section className="overflow-hidden rounded-[2.1rem] border border-emerald-100 bg-[linear-gradient(180deg,#f8fbf5_0%,#edf7e6_100%)] shadow-[0_20px_56px_-42px_rgba(15,23,42,0.28)]">
          <div className="grid gap-4 px-5 py-3.5 md:px-6 md:py-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(260px,0.88fr)] lg:items-center">
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Link href="/sections/route" className="inline-flex items-center gap-2 text-emerald-800 transition hover:text-emerald-900">
                  <Leaf size={16} />
                  {fr ? "Agir" : "Act"}
                </Link>
                <ChevronRight size={14} className="text-slate-300" />
                <span>{fr ? "Formulaire de groupe" : "Group form"}</span>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl text-[2.2rem] font-black tracking-tight text-emerald-950 md:text-[2.95rem]">
                  {fr ? "Rejoindre un formulaire de groupe" : "Join a group form"}
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600 md:text-[1.02rem]">
                  {fr
                    ? "Participez à des actions déjà validées et contribuez à leurs résultats."
                    : "Join already approved actions and contribute to their results."}
                </p>
              </div>

              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/75 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={12} />
                </span>
                {fr ? "Actions validées en attente de bénévoles" : "Validated actions waiting for volunteers"}
              </div>
            </div>

            <div className="min-h-[140px] self-end">
              <HeroIllustration />
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2.1fr)_repeat(4,minmax(0,1fr))]">
              <FilterField label={fr ? "Rechercher une action, un lieu..." : "Search an action or location..."} icon={<Search size={13} />}>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={fr ? "Rechercher une action, un lieu..." : "Search an action or location..."}
                  className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </FilterField>

              <FilterField label={fr ? "Localisation" : "Location"} icon={<MapPin size={13} />}>
                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value as LocationFilter)}
                    className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="all">{fr ? "Toutes" : "All"}</option>
                    <option value="ile-de-france">{fr ? "Île-de-France" : "Île-de-France"}</option>
                    <option value="autres">{fr ? "Autres régions" : "Other regions"}</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </FilterField>

              <FilterField label={fr ? "Période" : "Period"} icon={<CalendarDays size={13} />}>
                <div className="relative">
                  <select
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
                    className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="all">{fr ? "Toutes" : "All"}</option>
                    <option value="seven-days">{fr ? "7 prochains jours" : "Next 7 days"}</option>
                    <option value="thirty-days">{fr ? "30 prochains jours" : "Next 30 days"}</option>
                    <option value="ninety-days">{fr ? "90 prochains jours" : "Next 90 days"}</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </FilterField>

              <FilterField label={fr ? "Statut" : "Status"} icon={<Filter size={13} />}>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="all">{fr ? "Tous" : "All"}</option>
                    <option value="open">{fr ? "Ouverte" : "Open"}</option>
                    <option value="pending">{fr ? "En attente" : "Pending"}</option>
                    <option value="closed">{fr ? "Fermée" : "Closed"}</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </FilterField>

              <FilterField label={fr ? "Trier par" : "Sort by"} icon={<ArrowUpDown size={13} />}>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as JoinableActionSort)}
                    className="w-full appearance-none border-0 bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="soonest">{fr ? "Date (plus récente)" : "Date (soonest)"}</option>
                    <option value="latest">{fr ? "Date (plus lointaine)" : "Date (latest)"}</option>
                    <option value="participants-desc">{fr ? "Plus de bénévoles" : "Most volunteers"}</option>
                    <option value="participants-asc">{fr ? "Moins de bénévoles" : "Fewest volunteers"}</option>
                    <option value="location-asc">{fr ? "Lieu A → Z" : "Location A → Z"}</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </FilterField>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[2rem] font-black tracking-tight text-emerald-950 md:text-[2.15rem]">
                    {fr ? "Actions validées" : "Validated actions"}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                    {`${formatCount(visibleItems.length)} actions`}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {fr ? "Les résultats publiés sont prêts à recevoir des bénévoles." : "Published results are ready for volunteers."}
                </p>
              </div>
              {(search || statusFilter !== "all" || locationFilter !== "all" || periodFilter !== "all" || sort !== "soonest") && (
                <CmmButton
                  tone="secondary"
                  variant="pill"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setLocationFilter("all");
                    setPeriodFilter("all");
                    setSort("soonest");
                  }}
                >
                  {fr ? "Réinitialiser" : "Reset"}
                </CmmButton>
              )}
            </div>

            <div className="space-y-4">
              {loading && (
                <div className="rounded-[1.1rem] border border-emerald-100 bg-white px-4 py-3 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <Loader2 size={16} className="animate-spin" />
                    <p className="text-sm font-semibold">
                      {fr ? "Chargement des actions validées..." : "Loading validated actions..."}
                    </p>
                  </div>
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-amber-100 bg-white px-4 py-3 text-slate-800 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]">
                  <p className="text-sm font-semibold text-slate-700">{error}</p>
                  <CmmButton
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      void fetch(listUrl)
                        .then(async (response) => {
                          if (!response.ok) {
                            throw new Error("reload");
                          }
                          const payload = (await response.json()) as JoinableActionsResponse;
                          setItems(payload.items);
                          setHistoryItems(payload.history ?? []);
                          setAuthenticated(payload.authenticated);
                        })
                        .catch(() => {
                          setError(fr ? "La liste est temporairement indisponible." : "The list is temporarily unavailable.");
                        })
                        .finally(() => {
                          setLoading(false);
                        });
                    }}
                    tone="secondary"
                    size="sm"
                  >
                    {fr ? "Réessayer" : "Retry"}
                  </CmmButton>
                </div>
              )}

              {!loading && !error && !hasItems && (
                <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
                  <p className="text-sm font-bold text-slate-900">{fr ? "Aucune action validée n'est disponible." : "No validated action is available."}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                    {fr
                      ? "Créez un formulaire de groupe depuis une action validée, puis revenez ici lorsque des bénévoles peuvent le rejoindre."
                      : "Create a group form from an approved action, then come back when volunteers can join it."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CmmButton href="/actions/new" tone="primary" variant="pill">
                      {fr ? "Créer un formulaire" : "Create a form"}
                    </CmmButton>
                    <CmmButton href="/actions/new" tone="secondary" variant="pill">
                      {fr ? "Déclarer une action" : "Declare an action"}
                    </CmmButton>
                  </div>
                </div>
              )}

              {!loading && hasItems && hasVisibleItems && (
                <div className="space-y-4">
                  {sortItemsByStatusRank(visibleItems).map((item, index) => (
                    <ActionCard
                      key={item.id}
                      item={item}
                      index={index}
                      fr={fr}
                      authenticated={authenticated}
                      joining={joiningId === item.id}
                      leaving={leavingId === item.id}
                      onRequestJoin={requestJoin}
                      onRequestLeave={requestLeave}
                    />
                  ))}

                  <div className="rounded-[1.1rem] border border-slate-200 bg-white/90 px-4 py-3 text-center shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]">
                    <CmmButton
                      tone="secondary"
                      variant="pill"
                      size="sm"
                      onClick={() => {
                        setPeriodFilter("all");
                        setLocationFilter("all");
                        setStatusFilter("all");
                        setSearch("");
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        {fr ? "Voir toutes les actions" : "See all actions"}
                        <ChevronDown size={16} />
                      </span>
                    </CmmButton>
                  </div>
                </div>
              )}

              {!loading && hasItems && !hasVisibleItems && (
                <div className="rounded-[1.1rem] border border-dashed border-emerald-200 bg-white px-4 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.18)]">
                  <p className="text-sm font-semibold text-slate-900">{noResultsMessage}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {fr
                      ? "Essayez un autre mot-clé, changez la période ou réinitialisez les filtres."
                      : "Try another keyword, change the period, or reset the filters."}
                  </p>
                </div>
              )}

              {notice && (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
                  {notice}
                </div>
              )}

              <div id="file-publique" className="rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black tracking-tight text-emerald-950">
                        {fr ? "File publique des demandes" : "Public request queue"}
                      </h3>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                        {formatCount(queueRequests.length + queueConfirmedParticipants.length)}
                      </span>
                    </div>
                    <p className="max-w-2xl text-xs leading-relaxed text-slate-600">
                      {queueCanReview
                        ? fr
                          ? "Recherche, validation, exclusion et ajout manuel réservés aux admin et élus."
                          : "Search, validation, exclusion and manual addition are reserved for admins and elected users."
                        : fr
                          ? "Seuls les admin et élus peuvent modérer cette file."
                          : "Only admins and elected users can moderate this queue."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    {queueCanReview
                      ? fr
                        ? "Accès de modération activé"
                        : "Moderation access enabled"
                      : fr
                        ? "Lecture seule"
                        : "Read only"}
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4">
                  {queueCanReview && (
                    <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-emerald-950">
                            {fr ? "Ajouter un compte" : "Add an account"}
                          </p>
                          <p className="text-xs text-slate-600">
                            {fr
                              ? "Recherchez un compte puis ajoutez-le directement à l'action."
                              : "Search for an account and add it directly to the action."}
                          </p>
                        </div>
                        {queueSearchLoading && <Loader2 size={16} className="animate-spin text-emerald-700" />}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="relative rounded-xl border border-emerald-200 bg-white px-3 py-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="search"
                            value={queueSearchQuery}
                            onChange={(event) => setQueueSearchQuery(event.target.value)}
                            placeholder={fr ? "Nom, pseudo ou identifiant" : "Name, handle or ID"}
                            className="w-full border-0 bg-transparent pl-8 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                        <CmmButton
                          type="button"
                          tone="secondary"
                          variant="pill"
                          size="sm"
                          onClick={() => setQueueSearchQuery((current) => current.trim())}
                        >
                          {fr ? "Rechercher" : "Search"}
                        </CmmButton>
                      </div>

                      {queueSearchError && (
                        <p className="mt-2 text-xs font-medium text-rose-700">{queueSearchError}</p>
                      )}

                      {queueSearchQuery.trim().length >= 2 && (
                        <div className="mt-3 space-y-2">
                          {queueSearchResults.length > 0 ? (
                            queueSearchResults.map((candidate) => (
                              <div
                                key={candidate.userId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{candidate.displayName}</p>
                                  <p className="text-xs text-slate-500">
                                    {candidate.handle ? `@${candidate.handle}` : candidate.userId}
                                  </p>
                                </div>
                                <CmmButton
                                  type="button"
                                  tone="primary"
                                  variant="pill"
                                  size="sm"
                                  disabled={addingQueueParticipantId === candidate.userId}
                                  onClick={() => void addQueueParticipant(candidate.userId)}
                                >
                                  {addingQueueParticipantId === candidate.userId ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" />
                                      {fr ? "Ajout..." : "Adding..."}
                                    </>
                                  ) : (
                                    fr ? "Ajouter" : "Add"
                                  )}
                                </CmmButton>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-600">
                              {fr ? "Aucun compte ne correspond à cette recherche." : "No account matches this search."}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        {fr ? "Demandes en attente" : "Pending requests"}
                      </h4>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
                        {formatCount(queueRequests.length)}
                      </span>
                    </div>
                    {queueError ? (
                      <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm text-rose-700">
                        {queueError}
                      </div>
                    ) : queueLoading ? (
                      <div className="space-y-2.5">
                        <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
                        <div className="h-9 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40" />
                      </div>
                    ) : queueRequests.length > 0 ? (
                      <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
                        {queueRequests.map((request) => (
                          <QueueRow
                            key={request.id}
                            request={request}
                            fr={fr}
                            queueCanReview={queueCanReview}
                            reviewingQueueId={reviewingQueueId}
                            onReviewQueueRequest={reviewQueueRequest}
                            displayMode="pending"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                        {fr
                          ? "Aucune demande en attente sur ce formulaire."
                          : "No requests are waiting on this form."}
                      </div>
                    )}
                  </div>

                  {queueCanReview && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {fr ? "Comptes confirmés" : "Confirmed accounts"}
                        </h4>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800">
                          {formatCount(queueConfirmedParticipants.length)}
                        </span>
                      </div>
                      {queueConfirmedParticipants.length > 0 ? (
                        <div className="divide-y divide-slate-100 rounded-[1rem] border border-slate-100">
                          {queueConfirmedParticipants.map((request) => (
                            <QueueRow
                              key={request.id}
                              request={request}
                              fr={fr}
                              queueCanReview={queueCanReview}
                              reviewingQueueId={reviewingQueueId}
                              onReviewQueueRequest={reviewQueueRequest}
                              displayMode="confirmed"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                          {fr
                            ? "Aucun compte confirmé à afficher."
                            : "No confirmed account to display."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                  <span>
                    {queueCanReview
                      ? fr
                        ? "Les admin et élus peuvent accepter, exclure et ajouter un compte."
                        : "Admins and elected users can approve, remove and add an account."
                      : fr
                        ? "La modération des comptes est réservée aux admin et élus."
                        : "Account moderation is reserved for admins and elected users."}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    {fr ? "Vue de modération" : "Moderation view"}
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>

              <div className="rounded-[1rem] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.22)]">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" />
                  <p>
                    {fr
                      ? "En participant, vous vous engagez à respecter la charte des bénévoles et les consignes de sécurité."
                      : "By participating, you agree to follow the volunteer charter and safety instructions."}
                  </p>
                  <Link href="/charte" className="ml-auto inline-flex shrink-0 items-center gap-2 font-semibold text-emerald-800">
                    {fr ? "Voir la charte" : "View charter"}
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black tracking-tight text-emerald-950">{fr ? "Résumé" : "Summary"}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                  {formatCount(openActionsCount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                <HeroStatCard
                  icon={<Users2 size={20} />}
                  value={formatCount(openActionsCount)}
                  label={fr ? "Actions ouvertes" : "Open actions"}
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<Clock3 size={20} />}
                  value={formatCount(pendingRequestsCount)}
                  label={fr ? "Demandes en attente" : "Pending requests"}
                  tone="amber"
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<CheckCircle2 size={20} />}
                  value={formatCount(activeParticipationItems.length)}
                  label={fr ? "Participations confirmées" : "Confirmed participations"}
                  compact={summaryIsCompact}
                />
                <HeroStatCard
                  icon={<Leaf size={20} />}
                  value={`${formatKg(projectedImpactKg)} kg`}
                  label={fr ? "Impact potentiel" : "Potential impact"}
                  tone="amber"
                  compact={summaryIsCompact}
                />
              </div>
            </div>

            <ShortcutsCard />

            <div id="mon-suivi" className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-emerald-950">
                  {fr ? "Mon suivi" : "My tracking"}
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
                  {formatCount(activeParticipationItems.length)}
                </span>
              </div>

              {authenticated ? (
                sortedHistoryItems.length > 0 ? (
                <div className="space-y-2">
                  {sortedHistoryItems.slice(0, 4).map((item) => {
                      const status = getCardDisplayStatus(item);
                      return (
                        <div key={item.id} className="rounded-[1rem] border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.location_label}</p>
                              <p className="text-xs text-slate-500">{formatDate(item.action_date, fr ? "fr" : "en")}</p>
                            </div>
                            <PillBadge tone={status === "pending" ? "amber" : status === "closed" || status === "cancelled" ? "slate" : "emerald"}>
                              {getStatusLabel(status, fr)}
                            </PillBadge>
                          </div>
                        </div>
                      );
                    })}
                    <CmmButton href="/actions/history" tone="secondary" variant="pill" size="sm" className="mt-1 w-full">
                      <span className="flex items-center gap-2">
                        {fr ? "Voir toutes mes participations" : "View all my participations"}
                        <ChevronRight size={16} />
                      </span>
                    </CmmButton>
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                    {fr
                      ? "Aucune participation enregistrée pour le moment."
                      : "No participation recorded yet."}
                    <CmmButton href="#explorer-actions" tone="secondary" variant="pill" size="sm" className="mt-3">
                      {fr ? "Voir les actions" : "See actions"}
                    </CmmButton>
                  </div>
                )
              ) : (
                <p className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
                  {fr
                    ? "Connectez-vous pour retrouver vos participations et leur statut."
                    : "Sign in to review your participations and their status."}
                </p>
              )}
            </div>

            <HelpCard />
          </aside>
        </div>
      </div>

      <JoinFormConfirmationDialog
        fr={fr}
        mode={pendingJoinActionId ? "join" : "leave"}
        pendingAction={
          items.find((item) => item.id === (pendingJoinActionId ?? pendingLeaveActionId)) ?? null
        }
        onClose={() => {
          setPendingJoinActionId(null);
          setPendingLeaveActionId(null);
        }}
        onConfirm={() => {
          if (pendingJoinActionId) {
            void confirmPendingJoin();
            return;
          }

          void confirmPendingLeave();
        }}
      />
    </SectionShell>
  );
}
