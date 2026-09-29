"use client";

import { useCallback, useMemo } from "react";
import { BadgeCheck, Flag, PartyPopper, Play, Target, TrendingUp } from "lucide-react";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildLightCelebrationPreview } from "./light-celebrations-panel";
import { GamificationPanelLoading, SectionLabel } from "./gamification-shell";

type CollectionEntry = {
  id: string;
  kind: "progression" | "milestone";
  label: string;
  description: string;
  state: "not_started" | "in_progress" | "completed";
  isNewSinceLastRulesMigration: boolean;
  currentBadgeLabel?: string | null;
  nextBadgeLabel?: string | null;
  progressPercent?: number;
  currentValue?: number;
  progressCurrent?: number;
  progressTarget?: number;
};

export type CollectionSections = {
  acquired: CollectionEntry[];
  inProgress: CollectionEntry[];
  toDiscover: CollectionEntry[];
};

export function buildCollectionSections(
  summary: GamificationSummary | undefined,
): CollectionSections {
  const entries: CollectionEntry[] = [
    ...(summary?.progressions ?? []).map((item) => ({
      id: `progression:${item.id}`,
      kind: "progression" as const,
      label: item.label,
      description: item.description,
      state: item.state,
      isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
      currentBadgeLabel: item.currentBadge?.label ?? null,
      nextBadgeLabel: item.nextBadge?.label ?? null,
      progressPercent: item.progressPercent,
      currentValue: item.currentValue,
    })),
    ...(summary?.milestones ?? []).map((item) => ({
      id: `milestone:${item.id}`,
      kind: "milestone" as const,
      label: item.label,
      description: item.description,
      state: item.state,
      isNewSinceLastRulesMigration: item.isNewSinceLastRulesMigration,
      progressPercent: item.progressPercent,
      progressCurrent: item.progressCurrent,
      progressTarget: item.progressTarget,
    })),
  ];

  return entries.reduce<CollectionSections>(
    (sections, entry) => {
      if (entry.state === "completed") {
        sections.acquired.push(entry);
      } else if (entry.state === "not_started") {
        sections.toDiscover.push(entry);
      } else {
        sections.inProgress.push(entry);
      }
      return sections;
    },
    { acquired: [], inProgress: [], toDiscover: [] },
  );
}

function stateLabel(state: CollectionEntry["state"], fr: boolean): string {
  if (state === "completed") return fr ? "Acquis" : "Acquired";
  if (state === "in_progress") return fr ? "En progression" : "In progress";
  return fr ? "À découvrir" : "To discover";
}

function CollectionEntryCard({ entry, fr }: { entry: CollectionEntry; fr: boolean }) {
  return (
    <article className="rounded-[1.35rem] border border-[#f1dfd8] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {entry.kind === "progression" ? <TrendingUp size={15} className="text-[#c51f1f]" /> : <Flag size={15} className="text-[#c51f1f]" />}
            <h4 className="text-sm font-black text-[#2c1a17]">{entry.label}</h4>
            {entry.isNewSinceLastRulesMigration ? (
              <span className="rounded-full bg-[#2c1a17] px-2 py-0.5 text-xs font-black uppercase tracking-[0.16em] text-white">
                {fr ? "Nouveau" : "New"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#806b65]">{entry.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[#e4d7d2] bg-[#fffaf8] px-2.5 py-1 text-xs font-bold text-[#806b65]">
          {stateLabel(entry.state, fr)}
        </span>
      </div>

      {entry.kind === "progression" ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#765f59]">
            <span>{entry.currentBadgeLabel ?? (fr ? "Observateur" : "Observer")}</span>
            <span>{entry.nextBadgeLabel ?? (fr ? "Palier suivant" : "Next tier")}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5e7e2]" aria-label={`${entry.progressPercent ?? 0}%`}>
            <div className="h-full rounded-full bg-[#cf3b34]" style={{ width: `${entry.progressPercent ?? 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#a48d86]">
            {fr ? `${entry.currentValue ?? 0} contribution(s) · cette progression continue.` : `${entry.currentValue ?? 0} contribution(s) · this progression continues.`}
          </p>
        </div>
      ) : entry.progressCurrent !== undefined && entry.progressTarget !== undefined ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#765f59]">
            <span>{fr ? "Progression du jalon" : "Milestone progress"}</span>
            <span>{entry.progressCurrent}/{entry.progressTarget}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f5e7e2]">
            <div className="h-full rounded-full bg-[#cf3b34]" style={{ width: `${entry.progressPercent ?? 0}%` }} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CollectionGroup({
  title,
  entries,
  emptyLabel,
  fr,
}: {
  title: string;
  entries: CollectionEntry[];
  emptyLabel: string;
  fr: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#a48d86]">
        <Target size={14} /> {title}
      </div>
      {entries.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((entry) => <CollectionEntryCard key={entry.id} entry={entry} fr={fr} />)}
        </div>
      ) : (
        <p className="rounded-[1.35rem] border border-dashed border-[#ead8d2] bg-[#fffaf8] p-4 text-sm text-[#806b65]">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

export function CollectionsPanel(props: {
  summary: GamificationSummary | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
}) {
  const { summary, loading, error, locale } = props;
  const fr = locale === "fr";
  if (loading) {
    return <GamificationPanelLoading ariaLabel={fr ? "Chargement des collections" : "Loading collections"} headingWidth="w-64" cardHeight="h-28" />;
  }

  if (error || !summary) {
    return (
      <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
        <SectionLabel icon={BadgeCheck} title={fr ? "Collections personnelles" : "Personal collections"} subtitle={fr ? "Les distinctions CURRENT sont lues depuis le registre utilisateur." : "CURRENT distinctions are read from the user registry."} />
        <p role="alert" className="mt-6 rounded-[1.35rem] border border-[#f1c1b7] bg-[#fff5f2] p-5 text-sm leading-6 text-[#8c3f38]">
          {fr ? "Les collections ne sont pas disponibles pour le moment." : "Collections are not available right now."}
        </p>
      </section>
    );
  }

  const sections = buildCollectionSections(summary);
  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <SectionLabel
        icon={BadgeCheck}
        title={fr ? "Collections personnelles" : "Personal collections"}
        subtitle={fr ? "Les distinctions, progressions et jalons restent reliés aux mécaniques CURRENT." : "Distinctions, progressions and milestones stay connected to CURRENT mechanics."}
      />
      <div className="mt-6 space-y-7">
        <CollectionGroup title={fr ? "Acquis" : "Acquired"} entries={sections.acquired} emptyLabel={fr ? "Aucune distinction acquise pour le moment." : "No distinction acquired yet."} fr={fr} />
        <CollectionGroup title={fr ? "En progression" : "In progress"} entries={sections.inProgress} emptyLabel={fr ? "Aucune progression en cours." : "No progression in progress."} fr={fr} />
        <CollectionGroup title={fr ? "À découvrir" : "To discover"} entries={sections.toDiscover} emptyLabel={fr ? "Toutes les mécaniques applicables sont déjà commencées." : "All applicable mechanics have already started."} fr={fr} />
      </div>
    </section>
  );
}

export function CelebrationsPanel({ locale }: { locale: string }) {
  const fr = locale === "fr";
  const preview = useMemo(() => buildLightCelebrationPreview(locale), [locale]);

  const handlePreview = useCallback(() => {
    announceGamificationGain(preview);
  }, [preview]);

  return (
    <section className="rounded-[2.25rem] border border-[#ead8d2] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <SectionLabel
          icon={PartyPopper}
          title={fr ? "Célébrations légères" : "Light celebrations"}
          subtitle={fr ? "Un retour visuel discret apparaît quand un palier est atteint." : "A discreet visual cue appears when a milestone is reached."}
        />
        <span className="inline-flex items-center rounded-full border border-[#efb0a9] bg-[#fff1ef] px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#bb362f]">
          {fr ? "Aperçu" : "Preview"}
        </span>
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-[#f1dfd8] bg-[#fff8f6] p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-2 top-3 h-20 w-20 rounded-[1.15rem] border border-[#f1c1b7] bg-[#ffd9d4] shadow-[0_14px_30px_rgba(197,31,31,0.12)]" />
              <div className="absolute right-2 top-0 h-10 w-10 rounded-[0.95rem] bg-[#cf3b34] shadow-[0_10px_26px_rgba(197,31,31,0.22)]" />
              <div className="absolute bottom-1 left-12 h-12 w-12 rounded-[0.95rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute z-10 h-12 w-12 rounded-[1rem] bg-white text-[#c51f1f] shadow-[0_12px_30px_rgba(197,31,31,0.12)]" />
            </div>
          </div>
          <div className="flex min-h-40 items-center justify-center rounded-[1.5rem] border border-[#f1dfd8] bg-white">
            <div className="relative flex h-28 w-44 items-center justify-center">
              <div className="absolute left-8 top-7 h-11 w-11 rounded-[0.95rem] bg-[#ff8f86] shadow-[0_12px_26px_rgba(197,31,31,0.18)]" />
              <div className="absolute right-7 top-10 h-14 w-14 rounded-[1.15rem] border border-[#f1c1b7] bg-[#fff0ed]" />
              <div className="absolute bottom-2 left-6 h-12 w-24 rounded-[1rem] bg-[#ffd9d4]" />
              <div className="absolute z-10 h-10 w-10 rounded-[0.9rem] bg-[#cf3b34] shadow-[0_12px_30px_rgba(197,31,31,0.18)]" />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[13px] leading-7 text-[#7b615c]">
          {fr
            ? "Toast discret, confetti léger et son bref quand un palier tombe."
            : "Discreet toast, light confetti and a short sound when a milestone lands."}
        </p>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-[1.1rem] border border-[#cf3b34] bg-white px-8 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#bb362f] shadow-[0_10px_24px_rgba(197,31,31,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fff7f5]"
          >
            <Play size={14} fill="currentColor" />
            {fr ? "Tester l'aperçu" : "Test preview"}
          </button>
        </div>
      </div>
    </section>
  );
}
