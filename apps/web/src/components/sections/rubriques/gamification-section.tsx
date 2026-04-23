"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { BadgeShowcase } from "@/components/gamification/badge-showcase";
import { GamificationImpactMethodologyCard } from "@/components/sections/rubriques/gamification-impact-methodology-card";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ActionMapItem } from "@/lib/actions/types";

type PersonalHistoryItem = {
  id: string;
  actionDate: string;
  locationLabel: string;
  status: "pending" | "approved" | "rejected";
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  qualityScore: number;
  qualityGrade: "A" | "B" | "C";
  latitude: number | null;
  longitude: number | null;
  manualDrawing: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  } | null;
};

type MeResponse = {
  status: "ok";
  progression: {
    userId: string;
    xpTotal: number;
    xpValidated: number;
    xpPending: number;
    currentLevel: number;
    potentialLevel: number;
    badges: string[];
    nextLevel: {
      level: number;
      xpRequired: number;
      xpRemaining: number;
      frozen: boolean;
      requirements: {
        missing: string[];
      };
    };
    impact: {
      waterSavedLiters: number;
      co2AvoidedKg: number;
      surfaceCleanedM2: number;
    };
    impactMethodology: {
      proxyVersion: string;
      qualityRulesVersion: string;
      scope: string;
      pollutionScoreAverage: number;
      formulas: Array<{
        id: string;
        label: string;
        formula: string;
        interpretation: string;
      }>;
      approximations: string[];
      hypotheses: string[];
      errorMargins: {
        waterSavedLitersPct: number;
        co2AvoidedKgPct: number;
        surfaceCleanedM2Pct: number;
        pollutionScoreMeanPoints: number;
      };
    };
    dynamicRanking: {
      rank: number | null;
      total: number;
      percentile: number | null;
      score: number | null;
    };
    history: {
      timeline: PersonalHistoryItem[];
      mapPoints: PersonalHistoryItem[];
    };
  };
};

type IndividualItem = {
  rank: number;
  userId: string;
  actorName: string;
  associationName: string;
  score: number;
  xpValidated: number;
  xpTotal: number;
  currentLevel: number;
  potentialLevel: number;
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
  badges: string[];
};

type CollectiveItem = {
  rank: number;
  associationName: string;
  score: number;
  members: number;
  qualityAverage: number;
  validatedActions: number;
  wasteKg: number;
};

type LeaderboardResponse = {
  status: "ok";
  scope: "individual" | "collective";
  generatedAt: string;
  items: Array<IndividualItem | CollectiveItem>;
};

const ActionsMapCanvas = dynamic(
  () =>
    import("@/components/actions/actions-map-canvas").then(
      (mod) => mod.ActionsMapCanvas,
    ),
  { ssr: false },
);

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Requête API impossible.";
    throw new Error(message);
  }
  return body as T;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}

export function GamificationSection() {
  const { locale } = useSitePreferences();
  const [scope, setScope] = useState<"individual" | "collective">("individual");

  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = useSWR("gamification-me", () => fetchJson<MeResponse>("/api/gamification/me"));

  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useSWR(
    ["gamification-leaderboard", scope],
    () =>
      fetchJson<LeaderboardResponse>(
        `/api/gamification/leaderboard?scope=${scope}`,
      ),
  );

  const progression = meData?.progression;
  const progressToNext = useMemo(() => {
    if (!progression) {
      return 0;
    }
    const consumed = progression.nextLevel.xpRequired - progression.nextLevel.xpRemaining;
    if (progression.nextLevel.xpRequired <= 0) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(100, Math.round((consumed / progression.nextLevel.xpRequired) * 100)),
    );
  }, [progression]);

  const personalMapItems = useMemo<ActionMapItem[]>(() => {
    const points = progression?.history.mapPoints ?? [];
    return points.map((point) => ({
      id: point.id,
      action_date: point.actionDate,
      location_label: point.locationLabel,
      latitude: point.latitude,
      longitude: point.longitude,
      waste_kg: point.wasteKg,
      cigarette_butts: point.cigaretteButts,
      status: point.status,
      record_type: "action",
      manual_drawing: point.manualDrawing,
      quality_score: point.qualityScore,
      quality_grade: point.qualityGrade,
    }));
  }, [progression?.history.mapPoints]);

  const rows = leaderboardData?.items ?? [];
  const individualRows = rows as IndividualItem[];
  const collectiveRows = rows as CollectiveItem[];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Progression durable: l&apos;impact vérifié, la qualité des données et la
        contribution collective sont privilégiés sur le simple volume.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
        {/* GAUCHE : Progression personnelle */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {locale === "fr" ? "Ta progression" : "Your progression"}
            </h3>
            {meLoading ? (
              <p className="mt-2 text-sm text-slate-500">Chargement progression...</p>
            ) : null}
            {meError ? (
              <p className="mt-2 text-sm text-rose-700">
                Progression indisponible pour le moment.
              </p>
            ) : null}
            {progression ? (
              <div className="mt-3 space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Niveau actuel</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {progression.currentLevel}
                    </p>
                    {progression.potentialLevel > progression.currentLevel ? (
                      <p className="text-[10px] text-amber-700 mt-1">Potentiel: {progression.potentialLevel}</p>
                    ) : null}
                  </article>
                  <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Ranking</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {progression.dynamicRanking.rank ? `#${progression.dynamicRanking.rank}` : "n/a"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {progression.dynamicRanking.percentile
                        ? `Top ${progression.dynamicRanking.percentile}%`
                        : "En cours"}
                    </p>
                  </article>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <article className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">XP validée</p>
                    <p className="mt-1 text-xl font-bold text-emerald-900">
                      {progression.xpValidated}
                    </p>
                  </article>
                  <article className="rounded-lg border border-amber-100 bg-amber-50 p-3 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-amber-700">XP en attente</p>
                    <p className="mt-1 text-xl font-bold text-amber-900">
                      {progression.xpPending}
                    </p>
                  </article>
                </div>

                <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Méthodologie d&apos;impact
                  </summary>
                  <div className="mt-3">
                    <GamificationImpactMethodologyCard
                      methodology={progression.impactMethodology}
                    />
                  </div>
                </details>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Objectif niveau {progression.nextLevel.level}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Reste {progression.nextLevel.xpRemaining} XP.
                  </p>
                  
                  {progression.nextLevel.frozen ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Niveau gelé : des prérequis bloquent le passage.
                    </p>
                  ) : null}

                  {progression.nextLevel.requirements.missing.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-amber-800">
                      {progression.nextLevel.requirements.missing.map((missing) => (
                        <li key={missing}>{missing}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Badges et récompenses</p>
                  <BadgeShowcase badges={progression.badges} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* DROITE : Classements et Cartographie */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  scope === "individual"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setScope("individual")}
              >
                Classement contributeurs
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  scope === "collective"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setScope("collective")}
              >
                Classement collectifs
              </button>
            </div>

            {leaderboardLoading ? (
              <p className="text-sm text-slate-500">Synchronisation du classement global...</p>
            ) : null}
            {leaderboardError ? (
              <p className="text-sm text-rose-700">
                Moteur de classement indisponible.
              </p>
            ) : null}

            {!leaderboardLoading && !leaderboardError ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    {scope === "individual" ? (
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">#</th>
                        <th className="px-3 py-2">Identité</th>
                        <th className="px-3 py-2 text-center">Niv.</th>
                        <th className="px-3 py-2 text-right">XP</th>
                        <th className="px-3 py-2 text-right">Qualité</th>
                        <th className="px-3 py-2 text-right">Durable</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">#</th>
                        <th className="px-3 py-2">Collectif</th>
                        <th className="px-3 py-2 text-center">Membres</th>
                        <th className="px-3 py-2 text-center">Actions</th>
                        <th className="px-3 py-2 text-right">Qualité</th>
                        <th className="px-3 py-2 text-right">Durable</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scope === "individual"
                      ? individualRows.map((row) => (
                          <tr
                            key={`${row.userId}-${row.rank}`}
                            className="bg-white hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-3 py-2 font-bold text-slate-400 text-center">{row.rank}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">
                              {row.actorName}
                              {row.associationName ? <span className="block font-normal text-[10px] text-slate-500">{row.associationName}</span> : null}
                            </td>
                            <td className="px-3 py-2 text-center font-medium">
                              {row.currentLevel}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-medium">{row.xpValidated}</td>
                            <td className="px-3 py-2 text-right text-xs">A {row.qualityAverage}/100</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">{row.score.toFixed(0)}</td>
                          </tr>
                        ))
                      : collectiveRows.map((row) => (
                          <tr
                            key={`${row.associationName}-${row.rank}`}
                            className="bg-white hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-3 py-2 font-bold text-slate-400 text-center">{row.rank}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{row.associationName}</td>
                            <td className="px-3 py-2 text-center">{row.members}</td>
                            <td className="px-3 py-2 text-center">{row.validatedActions}</td>
                            <td className="px-3 py-2 text-right text-xs">A {row.qualityAverage}/100</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">{row.score.toFixed(0)}</td>
                          </tr>
                        ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-8 text-center text-slate-500 italic"
                          colSpan={6}
                        >
                          Aucune donnée qualifiée pour cette catégorie.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {progression && personalMapItems.length > 0 ? (
             <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Carte personnelle</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 h-[300px]">
                <ActionsMapCanvas items={personalMapItems.slice(0, 50)} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
