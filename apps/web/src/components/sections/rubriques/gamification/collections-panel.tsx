"use client";

import { memo } from "react";
import { BadgeCheck, MapPin, ScrollText, Sparkles, Trophy } from "lucide-react";
import { AnimatedCounter } from "@/components/gamification/animated-counter";
import { getGamificationBadgeIconName } from "@/components/gamification/badge-icon";
import { IdentityBadge } from "@/components/ui/identity-badge";
import type { MeResponse } from "./gamification-types";

type CollectionsPanelProps = {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
};

type CollectionSummary = {
  badgeCount: number;
  zoneCount: number;
  approvedActionCount: number;
  latestActionDate: string | null;
  sampleBadges: string[];
  sampleZones: string[];
};

function uniqueTrimmed(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

function formatDate(value: string | null, locale: string): string {
  if (!value) {
    return locale === "fr" ? "Aucune action" : "No action yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function buildCollectionSummary(
  progression: MeResponse["progression"] | undefined,
): CollectionSummary {
  const badges = progression?.badges ?? [];
  const zones = uniqueTrimmed(
    progression?.history.mapPoints.map((point) => point.locationLabel) ?? [],
  );
  const approvedTimeline = progression?.history.timeline.filter(
    (item) => item.status === "approved",
  ) ?? [];

  const latestActionDate =
    approvedTimeline
      .map((item) => item.actionDate)
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return {
    badgeCount: badges.length,
    zoneCount: zones.length,
    approvedActionCount: approvedTimeline.length,
    latestActionDate,
    sampleBadges: badges.slice(0, 6),
    sampleZones: zones.slice(0, 4),
  };
}

export const CollectionsPanel = memo(function CollectionsPanel({
  progression,
  loading,
  error,
  locale,
}: CollectionsPanelProps) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-44 rounded-full bg-white/5" />
          <div className="h-8 w-64 rounded-full bg-white/5" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-44 rounded-[2rem] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !progression) {
    return (
      <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
            <BadgeCheck size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
              {fr ? "Collections" : "Collections"}
            </p>
            <p className="text-sm font-semibold text-white">
              {fr
                ? "La vitrine de collections n'est pas disponible pour le moment."
                : "The collection showcase is not available right now."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const summary = buildCollectionSummary(progression);

  return (
    <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Collections" : "Collections"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Une vitrine de ce qui a déjà été acquis: badges, lieux et traces validées."
              : "A showcase of what has already been accumulated: badges, places and validated traces."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {fr ? "Complétion" : "Completion"}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <Trophy size={12} />
            {fr ? "Badges collectés" : "Collected badges"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={summary.badgeCount} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "galerie débloquée" : "unlocked gallery"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.sampleBadges.length > 0 ? (
              summary.sampleBadges.map((badge) => (
                <IdentityBadge
                  key={badge}
                  icon={getGamificationBadgeIconName(badge)}
                  label={badge}
                  tone="gamification"
                />
              ))
            ) : (
              <span className="text-[10px] font-semibold text-slate-500">
                {fr ? "Aucun badge débloqué" : "No badge unlocked yet"}
              </span>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <MapPin size={12} />
            {fr ? "Lieux distincts" : "Distinct places"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={summary.zoneCount} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "territoire parcouru" : "territory explored"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.sampleZones.length > 0 ? (
              summary.sampleZones.map((zone) => (
                <span
                  key={zone}
                  className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300"
                >
                  {zone}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-semibold text-slate-500">
                {fr ? "Aucun lieu encore ajouté" : "No place added yet"}
              </span>
            )}
          </div>
        </article>

        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <ScrollText size={12} />
            {fr ? "Traces archivées" : "Archived traces"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={summary.approvedActionCount} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "actions validées" : "validated actions"}
          </p>
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {fr ? "Dernière trace" : "Latest trace"}
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              {formatDate(summary.latestActionDate, locale)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {fr
                ? "Chaque action validée rejoint l'album personnel."
                : "Each validated action joins the personal album."}
            </p>
          </div>
        </article>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
          <Sparkles size={12} className="text-red-300" />
          {fr ? "Vitrine de complétion" : "Completion showcase"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
          <BadgeCheck size={12} className="text-red-300" />
          {fr ? "Contenu validé uniquement" : "Validated content only"}
        </span>
      </div>
    </section>
  );
});
