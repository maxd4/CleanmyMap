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
    <div className="space-y-4">
      <ThirtySecondsSummary
        kpis={summaryKpis}
        alert={data?.summary.alert}
        recommendedAction={{
          href: data?.summary.recommendedAction.href ?? "/reports",
          label: data?.summary.recommendedAction.label ?? "Ouvrir le reporting",
        }}
        recommendedReason={data?.summary.recommendedAction.reason}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Dossier elu 1-clic
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Pack institutionnel pret a partager: KPI cles, comparatifs N-1,
          priorites territoriales et methode.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/api/reports/elus-dossier?days=${periodDays}&format=pdf`}
            className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Telecharger le dossier PDF
          </a>
          <a
            href={`/api/reports/elus-dossier?days=${periodDays}&format=md`}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Telecharger le dossier partageable
          </a>
          <a
            href={`/api/reports/elus-dossier?days=${periodDays}&format=json`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Telecharger les donnees JSON
          </a>
          <Link
            href="/reports"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ouvrir le rapport web
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Export 1-clic: version methode incluse, priorites territoriales
          justifiees et limites d&apos;interpretation.
        </p>
      </div>

      <div className="max-w-xs">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fenetre d&apos;observation
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Methode de priorisation territoriale
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Variables: actions/km2, kg/km2, participation, densite territoriale.
          </li>
          <li>
            Ponderations: impact 35%, volume 35%, participation 20%, pression
            10%.
          </li>
          <li>
            Frequence: recalcul dynamique a chaque chargement de la fenetre
            courante.
          </li>
          <li>Version moteur: {PRIORITIZATION_RULESET.version}.</li>
          <li>
            Limites: indicateur d&apos;aide a la decision, ne remplace pas un
            audit terrain in situ.
          </li>
          <li>
            Dernier recalcul:{" "}
            {data ? new Date(data.generatedAt).toLocaleString("fr-FR") : "n/a"}.
          </li>
        </ul>
      </div>

      {data ? (
        <OperationalPrioritiesPanel
          priorities={data.priorities}
          title="Top priorites actionnables"
        />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Top zones a traiter
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Lecture actionnable: urgence, justification terrain et action
          recommandee par zone.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {(data?.zones ?? []).slice(0, 5).map((zone) => (
            <li
              key={`zone-top-${zone.area}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-semibold">
                {zone.area} - urgence {zone.urgency.toUpperCase()}
              </p>
              <p className="text-xs text-slate-600">{zone.justification}</p>
              <p className="mt-1 text-xs">
                <span className="font-semibold">Action recommandee:</span>{" "}
                {zone.recommendedAction}
              </p>
            </li>
          ))}
          {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
            <li className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
              Aucune zone prioritaire exploitable sur cette fenetre.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Comparaison par zone: periode courante vs precedente
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">Urgence</th>
                <th className="px-3 py-2">Actions (N)</th>
                <th className="px-3 py-2">Actions (N-1)</th>
                <th className="px-3 py-2">Delta actions (abs/%)</th>
                <th className="px-3 py-2">Kg (N)</th>
                <th className="px-3 py-2">Kg (N-1)</th>
                <th className="px-3 py-2">Delta kg (abs/%)</th>
                <th className="px-3 py-2">Couverture (N/N-1)</th>
                <th className="px-3 py-2">Delta couverture</th>
                <th className="px-3 py-2">Delai moderation (N/N-1)</th>
                <th className="px-3 py-2">Delta delai moderation</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Justification</th>
              </tr>
            </thead>
            <tbody>
              {(data?.zones ?? []).map((zone) => (
                <tr
                  key={zone.area}
                  className="border-t border-slate-100 text-slate-700"
                >
                  <td className="px-3 py-2 font-semibold">{zone.area}</td>
                  <td className="px-3 py-2 uppercase">{zone.urgency}</td>
                  <td className="px-3 py-2">{zone.currentActions}</td>
                  <td className="px-3 py-2">{zone.previousActions}</td>
                  <td className="px-3 py-2">
                    {signedValue(zone.deltaActionsAbsolute)} |{" "}
                    {signedPercent(zone.deltaActionsPercent)}
                  </td>
                  <td className="px-3 py-2">{zone.currentKg.toFixed(1)}</td>
                  <td className="px-3 py-2">{zone.previousKg.toFixed(1)}</td>
                  <td className="px-3 py-2">
                    {signedValue(zone.deltaKgAbsolute, " kg")} |{" "}
                    {signedPercent(zone.deltaKgPercent)}
                  </td>
                  <td className="px-3 py-2">
                    {zone.currentCoverageRate.toFixed(1)}% /{" "}
                    {zone.previousCoverageRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    {signedValue(zone.deltaCoverageRateAbsolute, " pt")} |{" "}
                    {signedPercent(zone.deltaCoverageRatePercent)}
                  </td>
                  <td className="px-3 py-2">
                    {zone.currentModerationDelayDays.toFixed(1)} j /{" "}
                    {zone.previousModerationDelayDays.toFixed(1)} j
                  </td>
                  <td className="px-3 py-2">
                    {signedValue(zone.deltaModerationDelayDaysAbsolute, " j")} |{" "}
                    {signedPercent(zone.deltaModerationDelayDaysPercent)}
                  </td>
                  <td className="px-3 py-2">
                    {zone.normalizedScore.toFixed(1)}
                  </td>
                  <td className="px-3 py-2">{zone.justification}</td>
                </tr>
              ))}
              {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
                <tr className="border-t border-slate-100 text-slate-600">
                  <td className="px-3 py-3" colSpan={14}>
                    Aucune zone prioritaire detectee sur la fenetre choisie.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {data ? (
        <KpiMethodBlock methods={data.methods} title="Methode KPI" />
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement des KPI...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">KPI indisponibles.</p>
      ) : null}
    </div>
  );
}

export { ElusSection };
