"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import type { ActionMapItem } from "@/lib/actions/types";
import { LeaderboardTable } from "./leaderboard-table";
import { ContributorRecognitionPanel } from "./contributor-recognition-panel";
import { PersonalProgress } from "./personal-progress";
import type { LeaderboardResponse, MeResponse } from "./gamification-types";
import { motion } from "framer-motion";
import { Trophy, Zap, ShieldCheck, Map as MapIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CmmButton } from "@/components/ui/cmm-button";

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

export function GamificationSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [scope, setScope] = useState<"individual" | "collective">("individual");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = useSWR("gamification-me", () => fetchJson<MeResponse>("/api/gamification/me"));

  const progression = meData?.progression;
  const userId = progression?.userId;

  const {
    data: badgeTotalsData,
    isLoading: badgeTotalsLoading,
    error: badgeTotalsError,
  } = useSWR(
    userId ? ["gamification-badge-totals", userId] : null,
    () => fetchJson<{ status: "ok"; totals: { wasteKg: number; butts: number } }>(
      `/api/gamification/badges/${userId}`,
    ),
  );

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
  const recognition = leaderboardData?.recognition;
  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    if (scope === "individual") {
      return rows.filter((item) => {
        const individual = item as LeaderboardResponse["items"][number] & {
          actorName?: string;
          associationName?: string;
        };
        const actor = (individual.actorName ?? "").toLowerCase();
        const association = (individual.associationName ?? "").toLowerCase();
        return actor.includes(query) || association.includes(query);
      });
    }

    return rows.filter((item) => {
      const collective = item as LeaderboardResponse["items"][number] & {
        associationName?: string;
      };
      return (collective.associationName ?? "").toLowerCase().includes(query);
    });
  }, [rows, scope, searchQuery]);

  return (
    <SectionShell
      id="gamification"
      title={fr ? "Écosystème & Gamification" : "Ecosystem & Gamification"}
      subtitle={fr ? "Engagement communautaire et impact validé" : "Community engagement and validated impact"}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Personal Progress */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3 mb-2 px-2">
            <Zap className="text-red-400" size={18} />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
              {fr ? "Profil de Performance" : "Performance Profile"}
            </h3>
          </div>
          <PersonalProgress
            progression={progression}
            progressToNext={progressToNext}
            loading={meLoading}
            error={meError}
            locale={locale}
            badgeTotals={badgeTotalsData?.totals}
            badgeTotalsLoading={badgeTotalsLoading}
            badgeTotalsError={badgeTotalsError}
          />
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-8 space-y-8">
          {/* Leaderboard Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
              <div className="flex items-center gap-3">
                <Trophy className="text-red-400" size={18} />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                  {fr ? "Classement Global" : "Global Leaderboard"}
                </h3>
              </div>

              <div className="flex p-1.5 rounded-[1.5rem] bg-slate-950/50 border border-white/5 backdrop-blur-3xl shadow-inner">
                <CmmButton
                  onClick={() => setScope("individual")}
                  tone={scope === "individual" ? "primary" : "tertiary"}
                  variant="pill"
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                    scope === "individual" 
                      ? "bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {fr ? "Comptes" : "Accounts"}
                </CmmButton>
                <CmmButton
                  onClick={() => setScope("collective")}
                  tone={scope === "collective" ? "primary" : "tertiary"}
                  variant="pill"
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                    scope === "collective" 
                      ? "bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                      : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {fr ? "Structures" : "Organizations"}
                </CmmButton>
              </div>
            </div>

            <div className="space-y-2 px-2">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    scope === "individual"
                      ? fr
                        ? "Rechercher un compte (nom, structure)..."
                        : "Search an account (name, organization)..."
                      : fr
                        ? "Rechercher une structure..."
                        : "Search an organization..."
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/45 py-3 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-red-400/40 focus:outline-none"
                />
                {searchQuery.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 transition hover:border-red-400/30 hover:text-white"
                    aria-label={fr ? "Effacer la recherche" : "Clear search"}
                    title={fr ? "Effacer" : "Clear"}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {fr ? "Résultats" : "Results"}: {filteredRows.length} / {rows.length}
              </p>
            </div>

            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <LeaderboardTable
                rows={filteredRows}
                scope={scope}
                loading={leaderboardLoading}
                error={leaderboardError}
              />
            </motion.div>
          </div>

          <ContributorRecognitionPanel
            recognition={recognition}
            locale={locale}
            loading={leaderboardLoading}
          />

          {/* Personal Map */}
          {progression && personalMapItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <MapIcon className="text-red-400" size={18} />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
                  {fr ? "Empreinte Personnelle" : "Personal Footprint"}
                </h3>
              </div>
              <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-4 overflow-hidden shadow-2xl relative group">
              <div className="absolute inset-0 bg-red-500/5 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />
                <div className="h-[350px] rounded-[2rem] overflow-hidden border border-white/5">
                  <ActionsMapCanvas items={personalMapItems.slice(0, 50)} />
                </div>
              </div>
            </div>
          )}

          {/* Information / Methodology */}
          <div className="p-8 rounded-[3rem] border border-red-500/10 bg-red-500/5 backdrop-blur-3xl flex items-start gap-6">
            <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
               <ShieldCheck size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-widest">
                {fr ? "Algorithme d'Impact Vérifié" : "Verified Impact Algorithm"}
              </h4>
              <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
                {fr 
                  ? "La progression (XP) reflète uniquement des objectifs validés. L'impact affiché (kg, mégots, surface, etc.) est un indicateur séparé, issu d'estimations et de données vérifiées selon une méthodologie explicitée."
                  : "Progression (XP) reflects validated objectives only. Displayed impact (kg, butts, surface, etc.) is a separate indicator based on verified data and an explicit methodology."}
              </p>
            </div>
          </div>
        </main>
      </div>
    </SectionShell>
  );
}

export default GamificationSection;
