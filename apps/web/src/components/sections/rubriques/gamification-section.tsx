"use client";

import dynamic from"next/dynamic";
import { useMemo, useState } from"react";
import useSWR from"swr";
import { BadgeShowcase } from"@/components/gamification/badge-showcase";
import { GamificationImpactMethodologyCard } from"@/components/sections/rubriques/gamification-impact-methodology-card";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import type { ActionMapItem } from"@/lib/actions/types";

type PersonalHistoryItem = {
 id: string;
 actionDate: string;
 locationLabel: string;
 status:"pending" |"approved" |"rejected";
 wasteKg: number;
 cigaretteButts: number;
 volunteersCount: number;
 durationMinutes: number;
 qualityScore: number;
 qualityGrade:"A" |"B" |"C";
 latitude: number | null;
 longitude: number | null;
 manualDrawing: {
 kind:"polyline" |"polygon";
 coordinates: [number, number][];
 } | null;
};

type MeResponse = {
 status:"ok";
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
 status:"ok";
 scope:"individual" |"collective";
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
 const response = await fetch(url, { method:"GET", cache:"no-store" });
 const body = await response.json().catch(() => null);
 if (!response.ok) {
 const message =
 body && typeof body ==="object" &&"error" in body
 ? String((body as { error: unknown }).error)
 :"Requête API impossible.";
 throw new Error(message);
 }
 return body as T;
}

function formatDate(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(parsed);
}

export function GamificationSection() {
 const { locale } = useSitePreferences();
 const [scope, setScope] = useState<"individual" |"collective">("individual");

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
 record_type:"action",
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
      <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4 cmm-text-small text-emerald-400 backdrop-blur-sm">
        <span className="font-bold">Progression durable :</span> l&apos;impact vérifié, la qualité des données et la
        contribution collective sont privilégiés sur le simple volume.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
        {/* GAUCHE : Progression personnelle */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-md p-4">
            <h3 className="cmm-text-small font-bold cmm-text-primary uppercase tracking-widest">
              {locale === "fr" ? "Ta progression" : "Your progression"}
            </h3>
            {meLoading ? (
              <p className="mt-2 cmm-text-small cmm-text-muted italic">Chargement progression...</p>
            ) : null}
            {meError ? (
              <p className="mt-2 cmm-text-small text-rose-400">
                Progression indisponible pour le moment.
              </p>
            ) : null}
            {progression ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 grid-cols-2">
                  <article className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
                    <p className="cmm-text-caption uppercase tracking-wider cmm-text-muted font-bold">Niveau actuel</p>
                    <p className="mt-1 text-3xl font-black cmm-text-primary tracking-tight">
                      {progression.currentLevel}
                    </p>
                    {progression.potentialLevel > progression.currentLevel ? (
                      <p className="cmm-text-caption text-amber-400/80 mt-1 font-medium">Potentiel : {progression.potentialLevel}</p>
                    ) : null}
                  </article>
                  <article className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
                    <p className="cmm-text-caption uppercase tracking-wider cmm-text-muted font-bold">Ranking</p>
                    <p className="mt-1 text-3xl font-black cmm-text-primary tracking-tight">
                      {progression.dynamicRanking.rank ? `#${progression.dynamicRanking.rank}` : "n/a"}
                    </p>
                    <p className="cmm-text-caption cmm-text-muted mt-1 font-medium">
                      {progression.dynamicRanking.percentile
                        ? `Top ${progression.dynamicRanking.percentile}%`
                        : "En cours"}
                    </p>
                  </article>
                </div>

                <div className="grid gap-3 grid-cols-2">
                  <article className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 shadow-inner">
                    <p className="cmm-text-caption uppercase tracking-wider text-emerald-500/80 font-bold">XP validée</p>
                    <p className="mt-1 text-2xl font-black text-emerald-400">
                      {progression.xpValidated}
                    </p>
                  </article>
                  <article className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 shadow-inner">
                    <p className="cmm-text-caption uppercase tracking-wider text-amber-500/80 font-bold">XP en attente</p>
                    <p className="mt-1 text-2xl font-black text-amber-400">
                      {progression.xpPending}
                    </p>
                  </article>
                </div>

                <details className="group rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 transition-all">
                  <summary className="cursor-pointer cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted list-none flex items-center justify-between">
                    Méthodologie d&apos;impact
                    <span className="text-xs transition-transform group-open:rotate-180">↓</span>
                  </summary>
                  <div className="mt-3">
                    <GamificationImpactMethodologyCard
                      methodology={progression.impactMethodology}
                    />
                  </div>
                </details>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <p className="cmm-text-caption font-bold cmm-text-secondary uppercase tracking-wider">Objectif niveau {progression.nextLevel.level}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-all shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                  <p className="mt-2 cmm-text-caption cmm-text-secondary font-medium">
                    Reste {progression.nextLevel.xpRemaining} XP.
                  </p>
                  
                  {progression.nextLevel.frozen ? (
                    <p className="mt-2 cmm-text-caption font-bold text-amber-500">
                      Niveau gelé : des prérequis bloquent le passage.
                    </p>
                  ) : null}

                  {progression.nextLevel.requirements.missing.length > 0 ? (
                    <ul className="mt-2 list-disc pl-4 cmm-text-caption text-amber-400/80 font-medium">
                      {progression.nextLevel.requirements.missing.map((missing) => (
                        <li key={missing}>{missing}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3">
                  <p className="cmm-text-caption uppercase tracking-widest cmm-text-muted font-bold mb-3">Badges et récompenses</p>
                  <BadgeShowcase badges={progression.badges} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* DROITE : Classements et Cartographie */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-md p-4">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <button
                className={`rounded-full px-5 py-2 cmm-text-small font-bold tracking-tight transition-all ${
                  scope === "individual"
                    ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-slate-950/60 cmm-text-secondary hover:bg-slate-900 border border-slate-800/40"
                }`}
                onClick={() => setScope("individual")}
              >
                Contributeurs
              </button>
              <button
                className={`rounded-full px-5 py-2 cmm-text-small font-bold tracking-tight transition-all ${
                  scope === "collective"
                    ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-slate-950/60 cmm-text-secondary hover:bg-slate-900 border border-slate-800/40"
                }`}
                onClick={() => setScope("collective")}
              >
                Collectifs
              </button>
            </div>

            {leaderboardLoading ? (
              <p className="cmm-text-small cmm-text-muted italic">Synchronisation du classement global...</p>
            ) : null}
            {leaderboardError ? (
              <p className="cmm-text-small text-rose-400 font-medium">
                Moteur de classement indisponible.
              </p>
            ) : null}

            {!leaderboardLoading && !leaderboardError ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20">
                <table className="min-w-full text-left cmm-text-small">
                  <thead className="bg-slate-900/60 cmm-text-secondary">
                    {scope === "individual" ? (
                      <tr>
                        <th className="px-4 py-3 w-10 text-center font-bold uppercase tracking-widest text-[10px]">#</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Identité</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-widest text-[10px]">Niv.</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-widest text-[10px]">XP</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-widest text-[10px]">Qualité</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-widest text-[10px]">Score</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3 w-10 text-center font-bold uppercase tracking-widest text-[10px]">#</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-widest text-[10px]">Collectif</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-widest text-[10px]">Membres</th>
                        <th className="px-4 py-3 text-center font-bold uppercase tracking-widest text-[10px]">Actions</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-widest text-[10px]">Qualité</th>
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-widest text-[10px]">Score</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {scope === "individual"
                      ? individualRows.map((row) => (
                          <tr
                            key={`${row.userId}-${row.rank}`}
                            className="hover:bg-slate-900/40 transition-colors group"
                          >
                            <td className="px-4 py-3 font-black cmm-text-muted text-center opacity-60 group-hover:opacity-100">{row.rank}</td>
                            <td className="px-4 py-3 font-bold cmm-text-primary">
                              {row.actorName}
                              {row.associationName ? <span className="block font-medium cmm-text-caption cmm-text-muted mt-0.5">{row.associationName}</span> : null}
                            </td>
                            <td className="px-4 py-3 text-center font-black cmm-text-primary">
                              {row.currentLevel}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-bold">{row.xpValidated}</td>
                            <td className="px-4 py-3 text-right cmm-text-caption font-medium">A {row.qualityAverage}/100</td>
                            <td className="px-4 py-3 text-right font-black cmm-text-primary">{row.score.toFixed(0)}</td>
                          </tr>
                        )
                      )
                      : collectiveRows.map((row) => (
                          <tr
                            key={`${row.associationName}-${row.rank}`}
                            className="hover:bg-slate-900/40 transition-colors group"
                          >
                            <td className="px-4 py-3 font-black cmm-text-muted text-center opacity-60 group-hover:opacity-100">{row.rank}</td>
                            <td className="px-4 py-3 font-bold cmm-text-primary">{row.associationName}</td>
                            <td className="px-4 py-3 text-center font-medium">{row.members}</td>
                            <td className="px-4 py-3 text-center font-medium">{row.validatedActions}</td>
                            <td className="px-4 py-3 text-right cmm-text-caption font-medium">A {row.qualityAverage}/100</td>
                            <td className="px-4 py-3 text-right font-black cmm-text-primary">{row.score.toFixed(0)}</td>
                          </tr>
                        )
                      )}
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-10 text-center cmm-text-muted italic font-medium"
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
            <div className="rounded-xl border border-slate-800/40 bg-slate-900/40 backdrop-blur-md p-4">
              <h3 className="cmm-text-small font-bold cmm-text-primary mb-4 uppercase tracking-widest">Carte personnelle</h3>
              <div className="overflow-hidden rounded-xl border border-slate-800/60 h-[300px] shadow-inner relative group">
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none group-hover:bg-emerald-500/0 transition-all" />
                <ActionsMapCanvas items={personalMapItems.slice(0, 50)} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>

 );
}
