"use client";

import { MapPinned, ShieldCheck, Trophy } from "lucide-react";
import useSWR from "swr";

import { BadgeSurface } from "@/components/gamification/badge-surface";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { TerritorialLegendOverview } from "@/lib/gamification/territorial-legends/overview";
import { TERRITORIAL_LEGEND_LEVELS } from "@/lib/gamification/territorial-legends/types";
import { swrRecentViewOptions } from "@/lib/swr-config";

import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";
import {
  getConquestStatus,
  getTerritorialLevelLabel,
  getTerritorialRewardStatus,
  getTerritorialStatusLabel,
  isTerritorialLegendLevel,
  TERRITORIAL_LEVEL_LABELS,
  TERRITORIAL_REWARD_STEPS,
} from "./territorial-legends-panel.model";
import type { TerritorialRewardStatus } from "./territorial-legends-panel.model";

type OverviewResponse = { status: "ok" } & TerritorialLegendOverview;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOverviewResponse(value: unknown): value is OverviewResponse {
  return isRecord(value) && value.status === "ok" && typeof value.campaignYear === "number" &&
    value.windowDays === 90 && Array.isArray(value.levels) && value.levels.every(isTerritorialLegendLevel) &&
    Array.isArray(value.territories);
}

async function fetchOverview(): Promise<OverviewResponse> {
  const response = await fetch("/api/gamification/territorial-leaderboard/overview", {
    method: "GET",
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("territorial legend overview unavailable");
  if (!isOverviewResponse(payload)) throw new Error("territorial legend overview invalid");
  return payload;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" }).format(new Date(value));
}

function statusClasses(status: TerritorialRewardStatus): string {
  if (status === "acquis") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "en_cours") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function StatusPill({ status }: { status: TerritorialRewardStatus }) {
  return <span className={`rounded-full border px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClasses(status)}`}>{getTerritorialStatusLabel(status)}</span>;
}

function ConquestChallenges({ territories }: { territories: TerritorialLegendOverview["territories"] }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-[#b4362e]" aria-hidden="true" />
        <h3 className="text-sm font-black text-[#2c1a17]">Cinq défis de première conquête</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#806b65]">Un défi par grade territorial. Un défi n’est acquis que lorsqu’une détention est confirmée par le serveur.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {TERRITORIAL_LEGEND_LEVELS.map((level) => {
          const status = getConquestStatus(territories, level);
          return (
            <div key={level} className={`flex min-h-24 flex-col justify-between rounded-2xl border p-3 ${statusClasses(status)}`} data-testid={`territorial-conquest-${level}`}>
              <span className="text-xs font-bold leading-5">{TERRITORIAL_LEVEL_LABELS[level]}</span>
              <StatusPill status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PublicRanking({ territory }: { territory: TerritorialLegendOverview["territories"][number] }) {
  return (
    <div className="border-t border-[#ead8d2] pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-[0.16em] text-[#806b65]">Classement autorisé</h4>
        <span className="text-xs font-semibold text-[#a48d86]">{territory.public.competitorCount} compétiteur(s) · fenêtre {90} jours</span>
      </div>
      {territory.public.items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#ead8d2] bg-[#fffaf8] px-3 py-2 text-xs leading-5 text-[#806b65]">Aucun classement public disponible pour ce territoire.</p>
      ) : (
        <ol className="mt-3 space-y-2" aria-label={`Classement public de ${territory.territoryLabel ?? territory.territoryCode}`}>
          {territory.public.items.slice(0, 5).map((entry) => (
            <li key={`${entry.rank}-${entry.publicLabel}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f1dfd8] bg-white px-3 py-2 text-xs">
              <span className="font-bold text-[#2c1a17]">{entry.rank}. {entry.publicLabel}{entry.tied ? ` · égalité à ${entry.tieSize}` : ""}</span>
              <span className="font-black text-[#b4362e]">{entry.distinctActions} cleanwalk(s) admissible(s)</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TerritoryCard({ territory, campaignYear }: { territory: TerritorialLegendOverview["territories"][number]; campaignYear: number }) {
  const title = territory.private?.title;
  return (
    <CmmCard as="article" tone="rose" variant="outlined" size="sm" className="space-y-4" data-testid={`territorial-territory-${territory.level}-${territory.territoryCode}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <BadgeSurface icon="target" label={getTerritorialLevelLabel(territory.level)} tone="gamification" variant="pill" />
          <h3 className="mt-3 truncate text-base font-black text-[#2c1a17]">{territory.territoryLabel ?? `Territoire COG ${territory.territoryCode}`}</h3>
          <p className="mt-1 text-xs text-[#806b65]">{getTerritorialLevelLabel(territory.level)} · campagne {campaignYear}</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#b4362e]" aria-hidden="true" />
      </div>

      <p className="rounded-xl border border-[#f1d9a9] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-[#765f59]">
        Titre courant : <strong>{title ?? "aucun titre confirmé"}</strong>
      </p>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-xl bg-[#fffaf8] px-3 py-2"><dt className="text-[#a48d86]">Rang</dt><dd className="mt-1 font-black text-[#2c1a17]">{territory.private?.rank ?? "—"}</dd></div>
        <div className="rounded-xl bg-[#fffaf8] px-3 py-2"><dt className="text-[#a48d86]">Cleanwalks admissibles</dt><dd className="mt-1 font-black text-[#2c1a17]">{territory.private?.distinctActions ?? "—"}</dd></div>
        <div className="rounded-xl bg-[#fffaf8] px-3 py-2"><dt className="text-[#a48d86]">Fenêtre</dt><dd className="mt-1 font-black text-[#2c1a17]">90 jours</dd></div>
        <div className="rounded-xl bg-[#fffaf8] px-3 py-2"><dt className="text-[#a48d86]">Détention actuelle</dt><dd className="mt-1 font-black text-[#2c1a17]">{territory.currentHold ? `${territory.currentHold.days} j` : "—"}</dd></div>
        <div className="rounded-xl bg-[#fffaf8] px-3 py-2 sm:col-span-2"><dt className="text-[#a48d86]">Meilleur historique</dt><dd className="mt-1 font-black text-[#2c1a17]">{territory.bestHistory ? `${territory.bestHistory.days} j · ${formatDate(territory.bestHistory.startedOn)} → ${formatDate(territory.bestHistory.endedOn)}` : "—"}</dd></div>
      </dl>

      <PublicRanking territory={territory} />

      <div className="border-t border-[#ead8d2] pt-4">
        <h4 className="text-xs font-black uppercase tracking-[0.16em] text-[#806b65]">Six récompenses de détention et de saison</h4>
        <p className="mt-1 text-xs leading-5 text-[#806b65]">La campagne courante distingue la première conquête, quatre seuils de longévité et la fin de saison.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TERRITORIAL_REWARD_STEPS.map((step) => {
            const status = getTerritorialRewardStatus(territory, step);
            return <div key={step.id} className="min-w-0" data-status={status}><BadgeSurface icon={status === "acquis" ? "badge-check" : "target"} label={`${step.label} — ${getTerritorialStatusLabel(status)}`} tone="gamification" variant="tile" className={statusClasses(status)} /></div>;
          })}
        </div>
      </div>
    </CmmCard>
  );
}

export function TerritorialLegendsPanel({ locale = "fr" }: { locale?: string }) {
  const { data, error, isLoading } = useSWR<OverviewResponse, unknown>("territorial-legends-overview", fetchOverview, swrRecentViewOptions);

  if (isLoading) return <GamificationPanelLoading ariaLabel="Chargement des Légendes territoriales" headingWidth="w-80" cardHeight="h-40" />;
  if (error || !isOverviewResponse(data)) {
    return <CmmCard as="section" tone="rose" variant="outlined" data-testid="territorial-legends-error"><SectionLabel icon={MapPinned} title="Légendes territoriales" subtitle="La projection territoriale est temporairement indisponible." /></CmmCard>;
  }

  return (
    <CmmCard as="section" tone="rose" variant="outlined" size="lg" data-testid="territorial-legends-panel" data-locale={locale}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionLabel icon={MapPinned} title="Légendes territoriales" subtitle="Titres, rangs et récompenses issus des contrats serveur. La progression privée reste lisible sans consentement public." />
        <span className="rounded-full border border-[#f1c1b7] bg-[#fff5f2] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#b4362e]">Campagne {data.campaignYear}</span>
      </div>
      <div className="mt-5 rounded-2xl border border-[#ead8d2] bg-[#fffaf8] px-4 py-3 text-sm leading-6 text-[#6e5550]" role="note">
        Les scores, rangs, égalités, durées et titres sont projetés par le serveur. Une révocation retire immédiatement la projection publique sans effacer l’historique privé auditable.
      </div>
      <details className="mt-3 rounded-2xl border border-[#ead8d2] bg-white px-4 py-3 text-xs leading-5 text-[#806b65]">
        <summary className="cursor-pointer font-black text-[#2c1a17]">Règles de classement et de détention</summary>
        <p className="mt-2">Seules les cleanwalks approuvées, publiées et associées à une participation confirmée sont admissibles après l’activation du consentement. Le classement porte sur 90 jours, bornés par la campagne civile ; les égalités suivent le rang de compétition. Un titre exige deux compétiteurs admissibles et au moins deux cleanwalks distinctes.</p>
      </details>
      <div className="mt-6 space-y-7">
        <ConquestChallenges territories={data.territories} />
        <div className="border-t border-[#ead8d2] pt-6">
          <div className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-[#b4362e]" aria-hidden="true" /><h3 className="text-sm font-black text-[#2c1a17]">Fiches par territoire</h3></div>
          <p className="mt-1 text-xs leading-5 text-[#806b65]">Les égalités utilisent le rang de compétition ; les états non acquis ne valent pas titre et les données absentes restent non affichées.</p>
          {data.territories.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#ead8d2] bg-white px-4 py-4 text-sm leading-6 text-[#806b65]" data-testid="territorial-legends-empty">
              Aucun territoire n’a encore de détention ou de récompense confirmée pour votre compte. Activez le consentement territorial dans les <CmmButton href="/reglages" tone="secondary" variant="ghost" size="sm" className="px-1.5 font-black text-[#b4362e]">préférences</CmmButton> pour rejoindre les projections publiques ; cela ne change pas la consultation privée.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">{data.territories.map((territory) => <TerritoryCard key={`${territory.level}:${territory.territoryCode}`} territory={territory} campaignYear={data.campaignYear} />)}</div>
          )}
        </div>
      </div>
    </CmmCard>
  );
}
