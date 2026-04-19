"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import useSWR from "swr";
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
        : "Requete API impossible.";
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
        Progression durable: l&apos;impact verifie, la qualite des donnees et la
        contribution collective sont privilegies sur le simple volume.
      </div>

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
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Niveau actuel</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {progression.currentLevel}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Niveau potentiel
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {progression.potentialLevel}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">XP validee</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {progression.xpValidated}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">XP en attente</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {progression.xpPending}
                </p>
              </article>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ton impact - eau</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {progression.impact.waterSavedLiters.toLocaleString("fr-FR")} L
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ton impact - CO2</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {progression.impact.co2AvoidedKg.toLocaleString("fr-FR")} kg
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Ton impact - surface
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {progression.impact.surfaceCleanedM2.toLocaleString("fr-FR")} m2
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ranking dynamique</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {progression.dynamicRanking.rank ? `#${progression.dynamicRanking.rank}` : "n/a"}
                </p>
                <p className="text-xs text-slate-500">
                  {progression.dynamicRanking.percentile
                    ? `Top ${progression.dynamicRanking.percentile}%`
                    : "Classement en cours"}
                </p>
              </article>
            </div>

            <GamificationImpactMethodologyCard
              methodology={progression.impactMethodology}
            />

            <div>
              <p className="text-xs text-slate-600">
                Progression vers le niveau {progression.nextLevel.level}:{" "}
                {progression.nextLevel.xpRemaining} XP restantes.
              </p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
              {progression.nextLevel.frozen ? (
                <p className="mt-2 text-xs text-amber-700">
                  Niveau gele: tes XP continuent de s&apos;accumuler, il manque des
                  prerequis pour debloquer le palier.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Prerequis restants
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {progression.nextLevel.requirements.missing.length === 0 ? (
                    <li>Prerequis valides pour le prochain niveau.</li>
                  ) : (
                    progression.nextLevel.requirements.missing.map((missing) => (
                      <li key={missing}>{missing}</li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Badges</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {progression.badges.length === 0 ? (
                    <li>Aucun badge pour le moment.</li>
                  ) : (
                    progression.badges.map((badge) => <li key={badge}>{badge}</li>)
                  )}
                </ul>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Timeline personnelle
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {progression.history.timeline.length === 0 ? (
                    <li>Aucune action personnelle enregistree.</li>
                  ) : (
                    progression.history.timeline.slice(0, 8).map((item) => (
                      <li key={item.id} className="rounded-md border border-slate-200 bg-white p-2">
                        <p className="font-semibold text-slate-800">
                          {formatDate(item.actionDate)} - {item.locationLabel}
                        </p>
                        <p className="text-xs text-slate-600">
                          {item.wasteKg.toFixed(1)} kg, {item.cigaretteButts} megots, qualite{" "}
                          {item.qualityGrade} ({item.qualityScore}/100)
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Carte personnelle
                </p>
                {personalMapItems.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Ajoute des actions geolocalisees pour afficher ta carte personnelle.
                  </p>
                ) : (
                  <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                    <ActionsMapCanvas items={personalMapItems.slice(0, 50)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              scope === "individual"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => setScope("individual")}
          >
            Contributeurs
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              scope === "collective"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => setScope("collective")}
          >
            Collectifs / associations
          </button>
        </div>

        {leaderboardLoading ? (
          <p className="mt-3 text-sm text-slate-500">Chargement du classement...</p>
        ) : null}
        {leaderboardError ? (
          <p className="mt-3 text-sm text-rose-700">
            Impossible de charger le classement durable.
          </p>
        ) : null}

        {!leaderboardLoading && !leaderboardError ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                {scope === "individual" ? (
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Contributeur</th>
                    <th className="px-3 py-2">Association</th>
                    <th className="px-3 py-2">Niveau</th>
                    <th className="px-3 py-2">XP validee</th>
                    <th className="px-3 py-2">Qualite</th>
                    <th className="px-3 py-2">Impact (kg)</th>
                    <th className="px-3 py-2">Score durable</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Collectif</th>
                    <th className="px-3 py-2">Membres</th>
                    <th className="px-3 py-2">Qualite</th>
                    <th className="px-3 py-2">Actions validees</th>
                    <th className="px-3 py-2">Impact (kg)</th>
                    <th className="px-3 py-2">Score durable</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {scope === "individual"
                  ? individualRows.map((row) => (
                      <tr
                        key={`${row.userId}-${row.rank}`}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-3 py-2 font-semibold">{row.rank}</td>
                        <td className="px-3 py-2">{row.actorName}</td>
                        <td className="px-3 py-2">{row.associationName}</td>
                        <td className="px-3 py-2">
                          {row.currentLevel}
                          {row.potentialLevel > row.currentLevel ? (
                            <span className="text-xs text-amber-700">
                              {" "}
                              (pot. {row.potentialLevel})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.xpValidated}</td>
                        <td className="px-3 py-2">{row.qualityAverage}/100</td>
                        <td className="px-3 py-2">{row.wasteKg.toFixed(1)}</td>
                        <td className="px-3 py-2">{row.score.toFixed(1)}</td>
                      </tr>
                    ))
                  : collectiveRows.map((row) => (
                      <tr
                        key={`${row.associationName}-${row.rank}`}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-3 py-2 font-semibold">{row.rank}</td>
                        <td className="px-3 py-2">{row.associationName}</td>
                        <td className="px-3 py-2">{row.members}</td>
                        <td className="px-3 py-2">{row.qualityAverage}/100</td>
                        <td className="px-3 py-2">{row.validatedActions}</td>
                        <td className="px-3 py-2">{row.wasteKg.toFixed(1)}</td>
                        <td className="px-3 py-2">{row.score.toFixed(1)}</td>
                      </tr>
                    ))}
                {rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-slate-500"
                      colSpan={scope === "individual" ? 8 : 7}
                    >
                      Aucun resultat disponible.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
