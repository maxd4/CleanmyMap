"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import useSWR from "swr";
import { ActionsMapFeed } from "@/components/actions/actions-map-feed";
import { ActionsMapTable } from "@/components/actions/actions-map-table";
import { ActionsVisualizationPanel } from "@/components/actions/actions-visualization-panel";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import type { ActionStatus, ActionImpactLevel } from "@/lib/actions/types";
import { mapItemWasteKg, mapItemCigaretteButts } from "@/lib/actions/data-contract";
import { BarChart3, MapPinned, Table2 } from "lucide-react";

const INITIAL_DAYS = Math.ceil(
  (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
    (1000 * 60 * 60 * 24),
);

export default function ActionsMapPage() {
  // --- TOUR DE CONTRÔLE (ÉTAT GLOBAL) ---
  const [days, setDays] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("cmm_dashboard_days");
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return Math.ceil(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
        (1000 * 60 * 60 * 24),
    );
  });
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cmm_dashboard_days", String(days));
    }
  }, [days]);

  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("approved");
  const [impactFilter, setImpactFilter] = useState<ActionImpactLevel | "all">("all");
  const [qualityMin, setQualityMin] = useState<number>(0);
  
  // Rôle Utilisateur pour CTA dynamique
  const { user } = useUser();
  const isAuthenticated = Boolean(user?.id);
  const role = user?.publicMetadata?.role || "volunteer";
  const isPublicVisitor = !isAuthenticated;
  
  const [railTab, setRailTab] = useState<"insights" | "journal">("insights");

  // --- RÉCUPÉRATION DES DONNÉES POUR LES KPI UNIFIÉS ---
  const mapDataQuery = useSWR(["map-page-kpis-map", days, statusFilter, impactFilter, qualityMin], () =>
    fetchMapActions({ 
      status: statusFilter, 
      days, 
      impact: impactFilter === "all" ? undefined : impactFilter,
      qualityMin: qualityMin > 0 ? qualityMin : undefined,
      limit: 300 
    })
  );

  const actionsDataQuery = useSWR(
    isAuthenticated ? ["map-page-kpis-actions", days, statusFilter] : null,
    () => fetchActions({ status: statusFilter, days, limit: 100 }),
  );

  const stats = useMemo(() => {
    const items = mapDataQuery.data?.items ?? [];
    const actionItems = actionsDataQuery.data?.items ?? [];

    const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
    const totalButts = items.reduce((acc, item) => acc + (mapItemCigaretteButts(item) ?? 0), 0);
    
    let volunteers = 0;
    let citizenHours = 0;
    if (isAuthenticated) {
      for (const item of actionItems) {
        const count = Number(item.volunteers_count || 0);
        const minutes = Number(item.duration_minutes || 0);
        volunteers += count;
        citizenHours += (count * Math.max(0, minutes)) / 60;
      }
    } else {
      for (const item of items) {
        const count = Number(item.contract?.metadata.volunteersCount || 0);
        const minutes = Number(item.contract?.metadata.durationMinutes || 0);
        volunteers += count;
        citizenHours += (count * Math.max(0, minutes)) / 60;
      }
    }

    const geolocated = items.filter(i => i.latitude !== null && i.longitude !== null).length;

    return {
      actions: items.length,
      wasteKg: totalKg,
      butts: totalButts,
      volunteers,
      citizenHours,
      geocoverage: items.length > 0 ? Math.round((geolocated / items.length) * 100) : 0,
    };
  }, [isAuthenticated, mapDataQuery.data, actionsDataQuery.data]);

  const kpiRibbon = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions terrain</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.actions}</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 w-full opacity-60"></div>
        </div>
      </article>
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Déchets (kg)</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.wasteKg.toFixed(1)}</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-600 w-full"></div>
        </div>
      </article>
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mégots collectés</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{Math.round(stats.butts)}</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-amber-500 w-full"></div>
        </div>
      </article>
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bénévoles mobilisés</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.volunteers}</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-sky-500 w-full"></div>
        </div>
      </article>
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Heures citoyennes</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.citizenHours.toFixed(0)}</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-indigo-500 w-full"></div>
        </div>
      </article>
      <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Géo-couverture</p>
          <Link href="/methodologie" className="text-[10px] text-emerald-600 opacity-0 group-hover:opacity-100 transition">ⓘ</Link>
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900">{stats.geocoverage}%</p>
        <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: `${stats.geocoverage}%` }}></div>
        </div>
      </article>
    </div>
  );

  const controlTower = (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/50 backdrop-blur-sm p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Fenêtre temporelle
          <select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="90">90 derniers jours</option>
            <option value={String(Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)))}>
              Année 2026 (YTD)
            </option>
            <option value="3650">Historique complet</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Statut de validation
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ActionStatus | "all")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente (Pending)</option>
            <option value="approved">Validés (Approved)</option>
            <option value="rejected">Rejetés (Rejected)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Impact terrain min.
          <select
            value={impactFilter}
            onChange={(event) => setImpactFilter(event.target.value as ActionImpactLevel | "all")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Tous les impacts</option>
            <option value="faible">Faible et +</option>
            <option value="moyen">Moyen et +</option>
            <option value="fort">Fort et +</option>
            <option value="critique">Critique uniquement</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
          Fiabilité data min.
          <select
            value={String(qualityMin)}
            onChange={(event) => setQualityMin(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="0">Toutes qualités</option>
            <option value="60">Grade B et + (&gt;=60)</option>
            <option value="80">Grade A (&gt;=80)</option>
          </select>
        </label>

        <div className="flex items-end">
          <button
            onClick={() => {
              setDays(INITIAL_DAYS);
              setStatusFilter("approved");
              setImpactFilter("all");
              setQualityMin(0);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span>🔄</span> Réinitialiser
          </button>
        </div>
      </div>
    </section>
  );

  const page = (
    <div data-rubrique-report-root className="space-y-6">
      <DecisionPageHeader
        context="Profil terrain"
        title="Cockpit de Pilotage Cartographique"
        objective="Superviser l'impact terrain, la mobilisation citoyenne et la fiabilité des données en temps réel."
        actions={
          role === "politician" || role === "admin"
            ? [
                { href: "/reports", label: "Générer Rapport", tone: "primary" },
                { href: "/actions/history", label: "Auditer Qualité" },
              ]
            : [
                { href: "/actions/new", label: "Déclarer une action", tone: "primary" },
                { href: "/actions/history", label: "Historique" },
              ]
        }
      />

      {isPublicVisitor ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              La carte est consultable librement. Connecte-toi uniquement pour
              déclarer une action, suivre ton historique ou exporter un rapport.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              Se connecter
            </Link>
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {/* TOUR DE CONTRÔLE UNIQUE */}
        {controlTower}
      </div>

      {/* CŒUR DE PAGE : CARTE DOMINANTE + RAIL SECONDIARE */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_22rem]">
        <section className="min-w-0 xl:sticky xl:top-6 self-start">
          <ActionsMapFeed
            presentation="immersive"
            days={days}
            statusFilter={statusFilter}
            impactFilter={impactFilter}
            qualityMin={qualityMin}
          />
        </section>

        <aside className="min-w-0 self-start xl:sticky xl:top-6">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl">
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setRailTab("insights")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  railTab === "insights"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Insights</span>
              </button>
              <button
                type="button"
                onClick={() => setRailTab("journal")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  railTab === "journal"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Table2 className="h-4 w-4" />
                <span>Journal</span>
              </button>
            </div>

            <div className="mt-4">
              {railTab === "insights" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                    <MapPinned className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        Lecture active
                      </p>
                      <p className="text-sm text-emerald-950/80">
                        La carte domine, les analyses restent secondaires.
                      </p>
                    </div>
                  </div>
                  <ActionsVisualizationPanel days={days} status={statusFilter} compact />
                </div>
              ) : (
                <ActionsMapTable items={mapDataQuery.data?.items ?? []} compact />
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* RUBAN KPI UNIFIÉ */}
      {kpiRibbon}

      {/* SUPERVISION TECHNIQUE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Visualiser la carte</h2>
            <p className="text-sm text-slate-600">
              Espace dédié pour tester la carte et retrouver la sandbox de découverte.
            </p>
          </div>
          <RubriquePdfExportButton rubriqueTitle="Cockpit terrain complet" />
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm text-sky-900">
            La sandbox complète est maintenant disponible dans la rubrique dédiée du
            bloc Visualiser.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/sections/sandbox"
              className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
            >
              Ouvrir la sandbox
            </Link>
            <Link
              href="/actions/new"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Déclarer une action
            </Link>
          </div>
        </div>
      </section>

      <footer className="pt-6 border-t border-slate-200">
        <div className="space-y-2 text-xs text-slate-500">
          <p>
            Horodatage: {new Date().toLocaleString("fr-FR")} | Sources: Unified Map Endpoint & Data Connectors.
          </p>
          <p>
            Méthode: Agrégation dynamique basée sur la sélection temporelle.
          </p>
        </div>
      </footer>
    </div>
  );

  return page;
}
