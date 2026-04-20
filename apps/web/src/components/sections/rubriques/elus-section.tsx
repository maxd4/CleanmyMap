"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { KpiMethodBlock } from "@/components/pilotage/kpi-method-block";
import { OperationalPrioritiesPanel } from "@/components/pilotage/operational-priorities-panel";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { PRIORITIZATION_RULESET } from "@/lib/pilotage/constants";

type PilotageOverviewResponse = {
  status: "ok";
  generatedAt: string;
  periodDays: number;
  summary: {
    kpis: Array<{
      label: string;
      value: string;
      previousValue: string;
      deltaAbsolute: string;
      deltaPercent: string;
      interpretation: "positive" | "negative" | "neutral";
    }>;
    alert: {
      severity: "critical" | "high" | "medium" | "low";
      title: string;
      detail: string;
    };
    recommendedAction: { href: string; label: string; reason: string };
  };
  priorities: Array<{
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    score: number;
    reason: string;
    impactEstimate: string;
    suggestedOwner: string;
    recommendedAction: { href: string; label: string };
    evidence: string[];
    engineVersion: string;
  }>;
  methods: Array<{
    id: string;
    kpi: string;
    formula: string;
    source: string;
    recalc: string;
    limits: string;
  }>;
  zones: Array<{
    area: string;
    currentActions: number;
    previousActions: number;
    deltaActionsAbsolute: number;
    currentKg: number;
    previousKg: number;
    deltaKgAbsolute: number;
    deltaActionsPercent: number;
    deltaKgPercent: number;
    currentCoverageRate: number;
    previousCoverageRate: number;
    deltaCoverageRateAbsolute: number;
    deltaCoverageRatePercent: number;
    currentModerationDelayDays: number;
    previousModerationDelayDays: number;
    deltaModerationDelayDaysAbsolute: number;
    deltaModerationDelayDaysPercent: number;
    normalizedScore: number;
    urgency: "critique" | "elevee" | "moderee";
    justification: string;
    recommendedAction: string;
  }>;
};

const fetchOverview = async (
  url: string,
): Promise<PilotageOverviewResponse> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "overview_unavailable");
  }
  return (await response.json()) as PilotageOverviewResponse;
};

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function signedValue(value: number, suffix = ""): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

function ElusSection() {
  const [periodDays, setPeriodDays] = useState<number>(30);
  const { data, isLoading, error } = useSWR(
    `/api/pilotage/overview?days=${periodDays}&limit=2000`,
    fetchOverview,
  );

  const summaryKpis = useMemo(() => {
    const kpis = data?.summary.kpis ?? [];
    if (kpis.length >= 3) {
      return [
        {
          label: kpis[0].label,
          value: kpis[0].value,
          previousValue: kpis[0].previousValue,
          deltaAbsolute: kpis[0].deltaAbsolute,
          deltaPercent: kpis[0].deltaPercent,
          interpretation: kpis[0].interpretation,
        },
        {
          label: kpis[1].label,
          value: kpis[1].value,
          previousValue: kpis[1].previousValue,
          deltaAbsolute: kpis[1].deltaAbsolute,
          deltaPercent: kpis[1].deltaPercent,
          interpretation: kpis[1].interpretation,
        },
        {
          label: kpis[2].label,
          value: kpis[2].value,
          previousValue: kpis[2].previousValue,
          deltaAbsolute: kpis[2].deltaAbsolute,
          deltaPercent: kpis[2].deltaPercent,
          interpretation: kpis[2].interpretation,
        },
      ] as const;
    }

    return [
      {
        label: "Impact terrain",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Mobilisation",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
      {
        label: "Qualite data",
        value: "n/a",
        previousValue: "n/a",
        deltaAbsolute: "n/a",
        deltaPercent: "n/a",
        interpretation: "neutral",
      },
    ] as const;
  }, [data?.summary.kpis]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* GAUCHE : KPI, Synthèse et Exports */}
      <div className="space-y-4">
        <div className="max-w-xs">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Fenêtre d&apos;observation
            <select
              value={String(periodDays)}
              onChange={(event) => setPeriodDays(Number(event.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
            >
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="180">180 jours</option>
            </select>
          </label>
        </div>

        <ThirtySecondsSummary
          kpis={summaryKpis}
          alert={data?.summary.alert}
          recommendedAction={{
            href: data?.summary.recommendedAction.href ?? "/reports",
            label: data?.summary.recommendedAction.label ?? "Ouvrir le reporting",
          }}
          recommendedReason={data?.summary.recommendedAction.reason}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Dossier élu 1-clic
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Pack institutionnel prêt à partager: KPI clés, comparatifs N-1,
            priorités territoriales et méthode.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`/api/reports/elus-dossier?days=${periodDays}&format=pdf`}
              className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white text-center transition hover:bg-emerald-700"
            >
              Télécharger le dossier PDF
            </a>
            <a
              href={`/api/reports/elus-dossier?days=${periodDays}&format=md`}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 text-center transition hover:bg-emerald-100"
            >
              Télécharger le dossier partageable
            </a>
            <a
              href={`/api/reports/elus-dossier?days=${periodDays}&format=json`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 text-center transition hover:bg-slate-100"
            >
              Télécharger les données JSON
            </a>
            <Link
              href="/reports"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 text-center transition hover:bg-slate-100"
            >
              Ouvrir le rapport web complet
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Export 1-clic: inclut la méthode technique et la justification des interprétations.
          </p>
        </div>
        
        {data ? (
          <KpiMethodBlock methods={data.methods} title="Méthode KPI" />
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-500">Chargement des KPI...</p>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-700">KPI indisponibles.</p>
        ) : null}
      </div>

      {/* DROITE : Priorités et Data */}
      <div className="space-y-4">
        {data ? (
          <OperationalPrioritiesPanel
            priorities={data.priorities}
            title="Top priorités actionnables"
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Top zones à traiter
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Urgences et justifications terrain.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(data?.zones ?? []).slice(0, 5).map((zone) => (
                <li
                  key={`zone-top-${zone.area}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="font-semibold text-slate-900">
                    {zone.area} - urgence {zone.urgency.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{zone.justification}</p>
                  <p className="mt-1 text-xs">
                    <span className="font-semibold text-slate-700">Recommandation:</span>{" "}
                    {zone.recommendedAction}
                  </p>
                </li>
              ))}
              {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
                <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                  Aucune zone prioritaire exploitable sur cette fenêtre.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Méthode de priorisation
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-slate-700">
              <li>Variables: actions/km2, kg/km2, participation.</li>
              <li>Pondérations: impact 35%, volume 35%, participation 20%, pression 10%.</li>
              <li>Fréquence: calculé sur chaque rafraichissement.</li>
              <li>Modèle de ciblage v.{PRIORITIZATION_RULESET.version}.</li>
              <li>Dernier passage: {data ? new Date(data.generatedAt).toLocaleString("fr-FR") : "n/a"}.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Comparaison par zone: période courante vs précédente
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Zone</th>
                  <th className="px-3 py-2 font-semibold">Urgence</th>
                  <th className="px-3 py-2 font-semibold">Actions (N)</th>
                  <th className="px-3 py-2 font-semibold">Delta actions</th>
                  <th className="px-3 py-2 font-semibold">Kg (N)</th>
                  <th className="px-3 py-2 font-semibold">Delta kg</th>
                  <th className="px-3 py-2 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.zones ?? []).map((zone) => (
                  <tr key={zone.area} className="text-slate-700 hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold">{zone.area}</td>
                    <td className="px-3 py-2 uppercase">{zone.urgency}</td>
                    <td className="px-3 py-2">{zone.currentActions}</td>
                    <td className="px-3 py-2">
                      {signedValue(zone.deltaActionsAbsolute)} | {signedPercent(zone.deltaActionsPercent)}
                    </td>
                    <td className="px-3 py-2">{zone.currentKg.toFixed(1)}</td>
                    <td className="px-3 py-2">
                      {signedValue(zone.deltaKgAbsolute, "kg")} | {signedPercent(zone.deltaKgPercent)}
                    </td>
                    <td className="px-3 py-2 font-medium">{zone.normalizedScore.toFixed(1)}</td>
                  </tr>
                ))}
                {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
                  <tr className="text-slate-600">
                    <td className="px-3 py-3 text-center" colSpan={7}>
                      Aucune zone détectée.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ElusSection };
