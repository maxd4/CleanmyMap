
"use client";

import { CheckCircle2, ChevronRight, Clock3, UserRound, Users2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { useJoinFormSectionController } from "./rejoindre-un-formulaire-section.controller";
import { HelpCard, HeroStatCard, PillBadge, ShortcutsCard, getCardDisplayStatus, getStatusLabel } from "./rejoindre-un-formulaire-section.shared";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

type ControllerState = ReturnType<typeof useJoinFormSectionController>;

type SidebarProps = Pick<ControllerState, "fr" | "authenticated" | "sortedHistoryItems" | "activeParticipationItems" | "preActionVisibleItems" | "pendingRequestsCount" | "volunteersExpectedCount" | "summaryIsCompact">;

export function JoinFormSidebar({
  fr,
  authenticated,
  sortedHistoryItems,
  activeParticipationItems,
  preActionVisibleItems,
  pendingRequestsCount,
  volunteersExpectedCount,
  summaryIsCompact,
}: SidebarProps) {
  function renderHistorySection() {
    if (!authenticated) {
      return (
        <p className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
          {fr
            ? "Connectez-vous pour retrouver vos participations et leur statut."
            : "Sign in to review your participations and their status."}
        </p>
      );
    }

    if (sortedHistoryItems.length === 0) {
      return (
        <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-sm leading-relaxed text-slate-600">
          {fr
            ? "Aucune participation enregistrée pour le moment."
            : "No participation recorded yet."}
          <CmmButton href="#explorer-actions" tone="secondary" variant="pill" size="sm" className="mt-3">
            {fr ? "Voir les actions" : "See actions"}
          </CmmButton>
        </div>
      );
    }

    return (
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
    );
  }

  return (
  <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-emerald-950">{fr ? "Résumé" : "Summary"}</h2>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">
          {formatCount(preActionVisibleItems.length)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
        <HeroStatCard
          icon={<Users2 size={20} />}
          value={formatCount(preActionVisibleItems.length)}
          label={fr ? "Pré-formulaires" : "Pre-forms"}
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
          icon={<UserRound size={20} />}
          value={formatCount(volunteersExpectedCount)}
          label={fr ? "Bénévoles attendus" : "Expected volunteers"}
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

      {renderHistorySection()}
    </div>

    <HelpCard />
  </aside>
  );
}
