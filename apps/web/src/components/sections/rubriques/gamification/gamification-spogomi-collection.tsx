"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { Award, CalendarDays, CheckCircle2, Flag, Gavel, Medal, Recycle, Trophy } from "lucide-react";
import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";
import type { SpogomiCollection, SpogomiCollectionAward, SpogomiBadgePresentation } from "@/lib/spogomi/collection";
import { getSpogomiBadgePresentation } from "@/lib/spogomi/collection";
import {
  filterSpogomiCollection,
  getSpogomiEvents,
  getSpogomiYears,
  type SpogomiCollectionFilters,
  type SpogomiCollectionKind,
} from "./gamification-spogomi-collection.model";

type Props = { locale: string };

async function fetchCollection(url: string): Promise<SpogomiCollection> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { collection?: SpogomiCollection; error?: string } | null;
  if (!response.ok || !payload?.collection) throw new Error(payload?.error ?? "Collection SPOGOMI indisponible.");
  return payload.collection;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`));
}

function badgeIcon(presentation: SpogomiBadgePresentation) {
  const Icon = presentation.icon === "collector" ? Recycle
    : presentation.icon === "referee" ? Gavel
      : presentation.icon === "organizer" ? Flag
        : presentation.icon === "points" ? Trophy
          : presentation.icon === "butts" ? Medal
            : presentation.icon === "double" ? Award
              : CheckCircle2;
  return <Icon size={20} strokeWidth={2.2} aria-hidden="true" />;
}

const TONE_CLASSES: Record<SpogomiBadgePresentation["tone"], string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  violet: "border-violet-200 bg-violet-50 text-violet-950",
  rose: "border-rose-200 bg-rose-50 text-rose-950",
  slate: "border-slate-200 bg-slate-50 text-slate-900",
};

function ProgressCard({
  title,
  description,
  progress,
  icon: Icon,
}: {
  title: string;
  description: string;
  progress: SpogomiCollection["collectorProgress"];
  icon: typeof Recycle;
}) {
  const currentLabel = progress.lastThreshold === null ? "Aucun palier" : `${progress.lastThreshold} événement${progress.lastThreshold > 1 ? "s" : ""}`;
  return (
    <div className="rounded-2xl border border-[#efd9d2] bg-[#fffaf8] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e8bdb2] bg-white text-[#a83228]"><Icon size={19} aria-hidden="true" /></div>
        <div className="min-w-0">
          <h3 className="font-black text-[#2b1713]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#765d57]">{description}</p>
        </div>
        <strong className="ml-auto whitespace-nowrap text-lg text-[#a83228]">{progress.currentValue}</strong>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#6f5450]"><span>{currentLabel}</span><span>Prochain : {progress.nextThreshold}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2dfda]" aria-label={`${progress.progressPercent} % vers le prochain palier`}><div className="h-full rounded-full bg-gradient-to-r from-[#c51f1f] to-[#e99d45]" style={{ width: `${progress.progressPercent}%` }} /></div>
      <p className="mt-2 text-xs text-[#765d57]">Reconnaissance SPOGOMI indépendante de l’XP globale.</p>
    </div>
  );
}

function AwardRow({ award }: { award: SpogomiCollectionAward }) {
  const presentation = getSpogomiBadgePresentation(award.badgeTypeId);
  const statusLabel = award.status === "active" ? "Active" : award.status === "revoked" ? "Révoquée" : "Remplacée après correction";
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[#ead8d2] bg-white/85 p-4 sm:flex-row sm:items-center">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${TONE_CLASSES[presentation.tone]}`}>{badgeIcon(presentation)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[#2b1713]">{presentation.label}</h3><span className="rounded-full bg-[#f8eeeb] px-2 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#765d57]">{presentation.roleOrRank}</span></div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#765d57]"><span className="font-bold text-[#3b2520]">{award.eventName}</span><span aria-hidden="true">·</span><span><CalendarDays className="mr-1 inline" size={13} aria-hidden="true" />{formatDate(award.eventLocalDate)} ({award.eventYear})</span></p>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-[#765d57]"><span className={award.status === "active" ? "text-emerald-700" : "text-rose-700"}>{statusLabel}</span>{award.eventPublic && award.eventSlug ? <Link href={`/spogomi/${encodeURIComponent(award.eventSlug)}`} className="rounded-full border border-[#dcb7ad] px-3 py-2 text-[#8e2d24] underline-offset-2 hover:underline">Voir l’événement</Link> : null}</div>
    </li>
  );
}

export function GamificationSpogomiCollection({ locale }: Props) {
  const fr = locale === "fr";
  const { data, error, isLoading } = useSWR("gamification-spogomi-collection", () => fetchCollection("/api/gamification/spogomi/collection"));
  const [filters, setFilters] = useState<SpogomiCollectionFilters>({ year: "all", kind: "all", eventId: "all" });
  const awards = data?.awards ?? [];
  const filteredAwards = filterSpogomiCollection(awards, filters);
  const years = getSpogomiYears(awards);
  const events = getSpogomiEvents(awards);

  if (isLoading) return <GamificationPanelLoading ariaLabel={fr ? "Chargement de la collection SPOGOMI" : "Loading SPOGOMI collection"} headingWidth="w-72" cardHeight="h-32" />;
  if (error) return <section id="spogomi-collection" className="rounded-[2.25rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"><h2 className="font-black">Collection SPOGOMI indisponible</h2><p className="mt-2">La collection privée n’a pas pu être chargée. Réessayez depuis votre espace Gamification.</p></section>;
  if (!data) return null;

  return (
    <section id="spogomi-collection" aria-labelledby="spogomi-collection-title" className="space-y-5 rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel icon={Medal} title="Événements & distinctions" subtitle="Vos reconnaissances SPOGOMI certifiées, conservées par événement et par année. Deux badges identiques sur deux événements restent deux occurrences." />
      <div><h2 id="spogomi-collection-title" className="sr-only">Collection SPOGOMI</h2><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#fff8f6] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#765d57]">Badges actifs</p><p className="mt-1 text-2xl font-black text-[#2b1713]">{data.spogomiAwardCount}</p></div><div className="rounded-2xl bg-[#fff8f6] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#765d57]">Événements terrain</p><p className="mt-1 text-2xl font-black text-[#2b1713]">{data.spogomiEventsParticipated}</p></div><div className="rounded-2xl bg-[#fff8f6] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#765d57]">Types distincts</p><p className="mt-1 text-2xl font-black text-[#2b1713]">{data.spogomiDistinctBadgeTypes}</p></div></div></div>
      <div className="grid gap-4 lg:grid-cols-2"><ProgressCard title="Terrain SPOGOMI" description="Événements de collecte confirmés." progress={data.collectorProgress} icon={Recycle} /><ProgressCard title="Arbitrage SPOGOMI" description="Événements où votre mission d’arbitrage est certifiée." progress={data.refereeProgress} icon={Gavel} /></div>
      <div className="grid gap-3 rounded-2xl border border-[#ead8d2] bg-[#fffdfc] p-4 md:grid-cols-3" aria-label="Filtres de la collection SPOGOMI"><label className="text-xs font-bold text-[#543b35]">Année<select className="mt-1 min-h-11 w-full rounded-xl border border-[#dec6bf] bg-white px-3 text-sm text-[#2b1713]" value={String(filters.year)} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value === "all" ? "all" : Number(event.target.value) }))}><option value="all">Toutes les années</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><label className="text-xs font-bold text-[#543b35]">Type<select className="mt-1 min-h-11 w-full rounded-xl border border-[#dec6bf] bg-white px-3 text-sm text-[#2b1713]" value={filters.kind} onChange={(event) => setFilters((current) => ({ ...current, kind: event.target.value as SpogomiCollectionKind }))}><option value="all">Tous les types</option><option value="collector">Collecte terrain</option><option value="referee">Arbitrage</option><option value="organizer">Organisation</option><option value="podium">Podiums</option></select></label><label className="text-xs font-bold text-[#543b35]">Événement<select className="mt-1 min-h-11 w-full rounded-xl border border-[#dec6bf] bg-white px-3 text-sm text-[#2b1713]" value={filters.eventId} onChange={(event) => setFilters((current) => ({ ...current, eventId: event.target.value }))}><option value="all">Tous les événements</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.year}</option>)}</select></label></div>
      {filteredAwards.length ? <ul className="space-y-3">{filteredAwards.map((award) => <AwardRow key={award.id} award={award} />)}</ul> : <div className="rounded-2xl border border-dashed border-[#d9bdb5] bg-[#fffaf8] p-6 text-center"><p className="font-black text-[#3b2520]">{awards.length ? "Aucune distinction ne correspond à ces filtres." : "Votre collection SPOGOMI est encore vide."}</p><p className="mt-2 text-sm leading-6 text-[#765d57]">{awards.length ? "Essayez une autre année, un autre type ou un autre événement." : "Les badges apparaîtront ici après une participation ou une mission certifiée."}</p></div>}
    </section>
  );
}
