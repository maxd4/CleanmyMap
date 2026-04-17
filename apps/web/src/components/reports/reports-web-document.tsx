"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemType,
  mapItemWasteKg,
} from "@/lib/actions/data-contract";
import type { ActionListItem, ActionMapItem } from "@/lib/actions/types";
import { fetchCommunityEvents } from "@/lib/community/http";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  extractArrondissement,
  monthKey,
} from "@/components/sections/rubriques/helpers";

type ChapterDef = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  audience: "terrain" | "strategie" | "mixte";
};

type AreaStats = {
  area: string;
  actions: number;
  kg: number;
  butts: number;
  recurrence: number;
  score: number;
};

type RouteStep = {
  index: number;
  label: string;
  kg: number;
  butts: number;
  segmentKm: number;
  latitude: number;
  longitude: number;
};

type MonthRow = {
  month: string;
  actions: number;
  kg: number;
  butts: number;
  volunteers: number;
  minutes: number;
};

const CHAPTERS: ChapterDef[] = [
  {
    id: "sommaire",
    kicker: "Navigation",
    title: "Sommaire dynamique",
    subtitle: "Accès direct à chaque partie du rapport web.",
    audience: "mixte",
  },
  {
    id: "executif",
    kicker: "Partie 1",
    title: "Synthèse exécutive",
    subtitle:
      "Vue d'ensemble immédiate pour piloter sans perdre le niveau de détail.",
    audience: "mixte",
  },
  {
    id: "pilotage",
    kicker: "Partie 2",
    title: "Bloc Pilotage",
    subtitle: "KPI cœur, qualité de données, modération et priorisation élus.",
    audience: "strategie",
  },
  {
    id: "terrain",
    kicker: "Partie 3",
    title: "Bloc Terrain",
    subtitle:
      "Traçabilité opérationnelle, itinéraire, tri et couverture cartographique.",
    audience: "terrain",
  },
  {
    id: "contexte",
    kicker: "Partie 4",
    title: "Bloc Analyse contexte",
    subtitle: "Climat, météo opérationnelle et benchmark inter-zones.",
    audience: "mixte",
  },
  {
    id: "communaute",
    kicker: "Partie 5",
    title: "Bloc Communauté",
    subtitle: "Événements, gamification et acteurs engagés.",
    audience: "mixte",
  },
  {
    id: "gouvernance",
    kicker: "Partie 6",
    title: "Bloc Gouvernance",
    subtitle: "Méthodologie, journal de version et cadre d'interprétation.",
    audience: "strategie",
  },
  {
    id: "calendrier",
    kicker: "Partie 7",
    title: "Calendrier prévisionnel",
    subtitle:
      "Feuille de route opérationnelle et institutionnelle des prochains cycles.",
    audience: "mixte",
  },
  {
    id: "glossaire",
    kicker: "Partie 8",
    title: "Glossaire simplifié",
    subtitle: "Traduction claire des termes techniques pour tous les publics.",
    audience: "mixte",
  },
  {
    id: "annexes",
    kicker: "Partie 9",
    title: "Annexes et exploitation",
    subtitle:
      "Tables de référence, liens d'action et réutilisation terrain/décideurs.",
    audience: "mixte",
  },
];

const GLOSSARY_ROWS = [
  [
    "Action",
    "Intervention de nettoyage effectuée sur le terrain et enregistrée dans la plateforme.",
  ],
  ["Spot", "Point signalé comme problématique (zone sale ou à surveiller)."],
  ["Clean place", "Lieu vérifié comme propre après passage ou contrôle."],
  ["KPI", "Indicateur chiffré utilisé pour suivre l'évolution des résultats."],
  [
    "Géocouverture",
    "Part des actions avec coordonnées valides et exploitables sur carte.",
  ],
  [
    "Trace cartographique",
    "Parcours ou zone dessinée (ligne/polygone) pour prouver la couverture terrain.",
  ],
  [
    "Récurrence",
    "Retour fréquent des dépôts dans une même zone malgré les actions précédentes.",
  ],
  [
    "Modération",
    "Validation administrative d'une donnée avant usage dans le pilotage officiel.",
  ],
  ["RSVP", "Réponse à un événement: oui, peut-être, non."],
  [
    "Proxy d'impact",
    "Estimation utile pour décider, sans remplacer une mesure instrumentale.",
  ],
  [
    "Funnel de modération",
    "Chemin de traitement des données: pending → approved/rejected.",
  ],
  [
    "Data quality",
    "Niveau de fiabilité des données (complétude, cohérence, fraîcheur, géolocalisation).",
  ],
] as const;

function toFrNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function toFrInt(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function toFrDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0)
    return (ordered[middle - 1] + ordered[middle]) / 2;
  return ordered[middle];
}

function normalizeListType(
  item: ActionListItem,
): "action" | "spot" | "clean_place" {
  if (item.contract?.type) return item.contract.type;
  if (item.record_type === "clean_place") return "clean_place";
  if (item.record_type === "other") return "spot";
  return "action";
}

function scoreAction(kg: number, butts: number): number {
  return kg * 10 + butts * 0.05;
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = a.latitude - b.latitude;
  const dLon = a.longitude - b.longitude;
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111;
}

function buildRouteSteps(
  items: ActionMapItem[],
  maxStops: number,
): RouteStep[] {
  const geolocated = items
    .map((item) => {
      const coordinates = mapItemCoordinates(item);
      return {
        item,
        label: mapItemLocationLabel(item),
        kg: mapItemWasteKg(item),
        butts: mapItemCigaretteButts(item),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        item: ActionMapItem;
        label: string;
        kg: number;
        butts: number;
        latitude: number;
        longitude: number;
      } => {
        return entry.latitude !== null && entry.longitude !== null;
      },
    )
    .sort((a, b) => scoreAction(b.kg, b.butts) - scoreAction(a.kg, a.butts))
    .slice(0, Math.max(maxStops * 2, 10));

  if (geolocated.length === 0) return [];

  const remaining = [...geolocated];
  const route = [remaining.shift()!];
  while (remaining.length > 0 && route.length < maxStops) {
    const current = route[route.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const candidateDistance = distanceKm(current, candidate);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        bestIndex = index;
      }
    }
    route.push(remaining.splice(bestIndex, 1)[0]);
  }

  return route.map((entry, index) => ({
    index: index + 1,
    label: entry.label,
    kg: entry.kg,
    butts: entry.butts,
    segmentKm: index === 0 ? 0 : distanceKm(route[index - 1], entry),
    latitude: entry.latitude,
    longitude: entry.longitude,
  }));
}

function buildMonthRows(items: ActionListItem[]): MonthRow[] {
  const buckets = new Map<string, MonthRow>();
  for (const item of items) {
    const month = monthKey(item.action_date);
    const current = buckets.get(month) ?? {
      month,
      actions: 0,
      kg: 0,
      butts: 0,
      volunteers: 0,
      minutes: 0,
    };
    current.actions += 1;
    current.kg += Number(item.waste_kg || 0);
    current.butts += Number(item.cigarette_butts || 0);
    current.volunteers += Number(item.volunteers_count || 0);
    current.minutes += Number(item.duration_minutes || 0);
    buckets.set(month, current);
  }
  return [...buckets.values()].sort((a, b) => (a.month > b.month ? 1 : -1));
}

function buildCalendarRows(now: Date): Array<[string, string, string, string]> {
  const entries: Array<[string, string, string, string]> = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    const monthLabel = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(start);
    const slot = `${toFrDate(start.toISOString())} → ${toFrDate(end.toISOString())}`;
    if (offset === 0) {
      entries.push([
        `Sprint 1 - ${monthLabel}`,
        slot,
        "Stabiliser data-quality (scoring complet + workflows correction).",
        "Ops + Data + Admin",
      ]);
      continue;
    }
    if (offset === 1) {
      entries.push([
        `Sprint 2 - ${monthLabel}`,
        slot,
        "Renforcer campagnes terrain (route, météo, tri, zones prioritaires).",
        "Terrain + Réseau associatif",
      ]);
      continue;
    }
    if (offset === 2) {
      entries.push([
        `Sprint 3 - ${monthLabel}`,
        slot,
        "Pack élus/institutions (benchmark, annexes, dossier budgétaire).",
        "Pilotage + Collectivités",
      ]);
      continue;
    }
    entries.push([
      `Sprint 4 - ${monthLabel}`,
      slot,
      "Diffusion nationale et boucle d'amélioration continue du rapport web.",
      "Produit + Communication",
    ]);
  }
  return entries;
}

function ReportPage(props: {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  audience: ChapterDef["audience"];
  children: React.ReactNode;
}) {
  const audienceBadge =
    props.audience === "terrain"
      ? "Usage terrain"
      : props.audience === "strategie"
        ? "Usage décideur"
        : "Usage terrain + décideur";

  return (
    <section
      id={props.id}
      className="scroll-mt-28 break-after-page rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)] last:break-after-auto"
    >
      <div className="border-b border-slate-200 bg-gradient-to-r from-[#0f4c5c] via-[#1f5d7f] to-[#24426f] p-[1cm] text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
          {props.kicker}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold leading-tight">
            {props.title}
          </h2>
          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
            {audienceBadge}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-100/90">
          {props.subtitle}
        </p>
      </div>
      <div className="space-y-5 p-[1cm]">{props.children}</div>
    </section>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  hint?: string;
  tone?: "base" | "accent" | "danger";
}) {
  const toneClass =
    props.tone === "accent"
      ? "border-[#3f7f95] bg-[#edf7fa]"
      : props.tone === "danger"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-[#f8fafc]";

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {props.value}
      </p>
      {props.hint ? (
        <p className="mt-1 text-xs text-slate-600">{props.hint}</p>
      ) : null}
    </article>
  );
}

function InsightBox(props: { title: string; lines: string[] }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
      <h3 className="text-sm font-semibold text-slate-900">{props.title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
        {props.lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
    </article>
  );
}

function ReportTable(props: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#1e3a67] text-slate-100">
          <tr>
            {props.headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr
              key={`${row[0]}-${index}`}
              className={`border-t border-slate-200 text-slate-700 ${index % 2 === 0 ? "bg-[#f8fbfe]" : "bg-white"}`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cellIndex}-${cell}`}
                  className={`px-3 py-2 ${cellIndex === 0 ? "font-semibold" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyBars(props: { rows: MonthRow[] }) {
  const maxKg = Math.max(1, ...props.rows.map((row) => row.kg));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Série mensuelle (kg collectés)
      </h3>
      <div className="mt-3 space-y-2">
        {props.rows.map((row) => (
          <div
            key={row.month}
            className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-xs text-slate-700"
          >
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              {row.month}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2b6d89] to-[#62a4b8]"
                style={{
                  width: `${Math.max(4, Math.round((row.kg / maxKg) * 100))}%`,
                }}
              />
            </div>
            <span className="font-semibold">{toFrNumber(row.kg)} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeoCoverageRing(props: {
  coveragePercent: number;
  tracePercent: number;
}) {
  const pct = Math.max(0, Math.min(100, props.coveragePercent));
  const circumference = 2 * Math.PI * 48;
  const dash = (pct / 100) * circumference;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Couverture spatiale
      </h3>
      <div className="mt-3 flex items-center gap-4">
        <svg
          width="116"
          height="116"
          viewBox="0 0 116 116"
          role="img"
          aria-label="Couverture géographique"
        >
          <circle
            cx="58"
            cy="58"
            r="48"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          <circle
            cx="58"
            cy="58"
            r="48"
            fill="none"
            stroke="#1f6d86"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 58 58)"
          />
          <text
            x="58"
            y="58"
            textAnchor="middle"
            dy="0.2em"
            className="fill-slate-900 text-[18px] font-semibold"
          >
            {Math.round(pct)}%
          </text>
        </svg>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Taux géolocalisation:{" "}
            <span className="font-semibold">{toFrNumber(pct, 0)}%</span>
          </p>
          <p>
            Taux de traces/polygones:{" "}
            <span className="font-semibold">
              {toFrNumber(Math.max(0, Math.min(100, props.tracePercent)), 0)}%
            </span>
          </p>
          <p className="text-xs text-slate-500">
            Mesure clé pour piloter les zones de récurrence et la preuve
            d&apos;impact.
          </p>
        </div>
      </div>
    </article>
  );
}

export function ReportsWebDocument() {
  const [associationFilter, setAssociationFilter] = useState<string>("all");

  const actionsAll = useSWR(
    ["report-web-actions-all", associationFilter],
    () =>
      fetchActions({
        status: "all",
        limit: 200,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const actionsApproved = useSWR(
    ["report-web-actions-approved", associationFilter],
    () =>
      fetchActions({
        status: "approved",
        limit: 200,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const mapAll = useSWR(
    ["report-web-map-all", associationFilter],
    () =>
      fetchMapActions({
        status: "all",
        limit: 300,
        days: 365,
        types: "all",
        association: associationFilter,
      }),
    swrRecentViewOptions,
  );
  const community = useSWR(
    ["report-web-community-events"],
    () => fetchCommunityEvents({ limit: 240 }),
    swrRecentViewOptions,
  );
  const weather = useSWR(["report-web-weather"], async () => {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis",
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error("weather_unavailable");
    }
    return (await response.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
      };
    };
  });

  const isLoading =
    actionsAll.isLoading ||
    actionsApproved.isLoading ||
    mapAll.isLoading ||
    community.isLoading;
  const hasError = Boolean(
    actionsAll.error ||
    actionsApproved.error ||
    mapAll.error ||
    community.error,
  );
  const associationOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of actionsAll.data?.items ?? []) {
      const value = item.association_name?.trim();
      if (value) {
        names.add(value);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [actionsAll.data?.items]);
  const activeScopeLabel =
    associationFilter === "all"
      ? "Global (toutes associations)"
      : associationFilter;

  const report = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const allItems = actionsAll.data?.items ?? [];
    const approvedItems = actionsApproved.data?.items ?? [];
    const mapItems = mapAll.data?.items ?? [];
    const events = community.data?.items ?? [];

    const approvedActions = approvedItems.filter(
      (item) => normalizeListType(item) === "action",
    );
    const allStatuses = {
      pending: allItems.filter((item) => item.status === "pending").length,
      approved: allItems.filter((item) => item.status === "approved").length,
      rejected: allItems.filter((item) => item.status === "rejected").length,
    };

    const totalKg = approvedActions.reduce(
      (sum, item) => sum + Number(item.waste_kg || 0),
      0,
    );
    const totalButts = approvedActions.reduce(
      (sum, item) => sum + Number(item.cigarette_butts || 0),
      0,
    );
    const totalVolunteers = approvedActions.reduce(
      (sum, item) => sum + Number(item.volunteers_count || 0),
      0,
    );
    const totalHours = approvedActions.reduce(
      (sum, item) =>
        sum +
        (Number(item.duration_minutes || 0) *
          Number(item.volunteers_count || 0)) /
          60,
      0,
    );

    const mapApproved = mapItems.filter((item) => item.status === "approved");
    const mapApprovedActions = mapApproved.filter(
      (item) => mapItemType(item) === "action",
    );
    const mapSpots = mapItems.filter((item) => mapItemType(item) === "spot");
    const mapCleanPlaces = mapItems.filter(
      (item) => mapItemType(item) === "clean_place",
    );

    const geolocatedCount = mapApproved.filter((item) => {
      const coordinates = mapItemCoordinates(item);
      return coordinates.latitude !== null && coordinates.longitude !== null;
    }).length;

    const traceCount = mapApproved.filter((item) => {
      return Boolean(
        item.manual_drawing ||
        item.manual_drawing_geojson ||
        item.contract?.geometry.kind !== "point",
      );
    }).length;

    const polylineCount = mapApproved.filter((item) => {
      const kind =
        item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
      return kind === "polyline";
    }).length;

    const polygonCount = mapApproved.filter((item) => {
      const kind =
        item.contract?.geometry.kind ?? item.manual_drawing?.kind ?? null;
      return kind === "polygon";
    }).length;

    const geoCoverage =
      mapApproved.length > 0 ? (geolocatedCount / mapApproved.length) * 100 : 0;
    const traceCoverage =
      mapApproved.length > 0 ? (traceCount / mapApproved.length) * 100 : 0;

    const moderationProcessed = allStatuses.approved + allStatuses.rejected;
    const moderationConversion =
      moderationProcessed > 0
        ? (allStatuses.approved / moderationProcessed) * 100
        : 0;

    const moderationDelayDays = allItems
      .map((item) => {
        const created = item.contract?.dates.createdAt ?? item.created_at;
        const validated = item.contract?.dates.validatedAt ?? null;
        if (!created || !validated) return null;
        const createdMs = new Date(created).getTime();
        const validatedMs = new Date(validated).getTime();
        if (
          !Number.isFinite(createdMs) ||
          !Number.isFinite(validatedMs) ||
          validatedMs < createdMs
        )
          return null;
        return (validatedMs - createdMs) / (24 * 60 * 60 * 1000);
      })
      .filter((value): value is number => value !== null);

    const completenessChecks = approvedActions.map((item) => {
      const hasDate = Boolean(item.action_date);
      const hasLocation = item.location_label.trim().length > 2;
      const hasDuration = Number(item.duration_minutes || 0) > 0;
      const hasVolunteers = Number(item.volunteers_count || 0) > 0;
      const hasWaste = Number(item.waste_kg || 0) >= 0;
      return hasDate && hasLocation && hasDuration && hasVolunteers && hasWaste;
    });
    const completenessScore =
      completenessChecks.length > 0
        ? (completenessChecks.filter(Boolean).length /
            completenessChecks.length) *
          100
        : 0;

    const coherenceChecks = approvedActions.map((item) => {
      const waste = Number(item.waste_kg || 0);
      const butts = Number(item.cigarette_butts || 0);
      const volunteers = Number(item.volunteers_count || 0);
      const minutes = Number(item.duration_minutes || 0);
      return waste >= 0 && butts >= 0 && volunteers >= 1 && minutes >= 5;
    });
    const coherenceScore =
      coherenceChecks.length > 0
        ? (coherenceChecks.filter(Boolean).length / coherenceChecks.length) *
          100
        : 0;

    const freshnessDays = median(
      approvedActions
        .map((item) => {
          const timestamp = new Date(item.action_date).getTime();
          if (!Number.isFinite(timestamp)) return null;
          return (nowMs - timestamp) / (24 * 60 * 60 * 1000);
        })
        .filter((value): value is number => value !== null && value >= 0),
    );

    const byAreaMap = new Map<
      string,
      { actions: number; kg: number; butts: number; labels: Set<string> }
    >();
    for (const item of mapApprovedActions) {
      const area = extractArrondissement(mapItemLocationLabel(item));
      const previous = byAreaMap.get(area) ?? {
        actions: 0,
        kg: 0,
        butts: 0,
        labels: new Set<string>(),
      };
      previous.actions += 1;
      previous.kg += mapItemWasteKg(item);
      previous.butts += mapItemCigaretteButts(item);
      previous.labels.add(mapItemLocationLabel(item).trim().toLowerCase());
      byAreaMap.set(area, previous);
    }

    const byArea: AreaStats[] = [...byAreaMap.entries()]
      .map(([area, stats]) => {
        const recurrence = Math.max(0, stats.actions - stats.labels.size);
        const score =
          stats.kg * 1.4 +
          stats.actions * 2 +
          stats.butts * 0.01 +
          recurrence * 5;
        return {
          area,
          actions: stats.actions,
          kg: stats.kg,
          butts: stats.butts,
          recurrence,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const currentFloor = nowMs - 30 * 24 * 60 * 60 * 1000;
    const previousFloor = nowMs - 60 * 24 * 60 * 60 * 1000;
    const currentActions = approvedActions.filter((item) => {
      const timestamp = new Date(item.action_date).getTime();
      return Number.isFinite(timestamp) && timestamp >= currentFloor;
    });
    const previousActions = approvedActions.filter((item) => {
      const timestamp = new Date(item.action_date).getTime();
      return (
        Number.isFinite(timestamp) &&
        timestamp >= previousFloor &&
        timestamp < currentFloor
      );
    });
    const trendPercent =
      previousActions.length > 0
        ? ((currentActions.length - previousActions.length) /
            previousActions.length) *
          100
        : currentActions.length > 0
          ? 100
          : 0;

    const monthRows = buildMonthRows(approvedActions);
    const monthRows6 = monthRows.slice(-6);
    const monthRows12 = monthRows.slice(-12);

    const routeSteps = buildRouteSteps(mapApprovedActions, 6);
    const routeDistance = routeSteps.reduce(
      (sum, step) => sum + step.segmentKm,
      0,
    );

    const recyclableKg = totalKg * 0.55;
    const triIndex =
      totalKg > 0
        ? Math.max(
            0,
            Math.min(100, 100 - (totalButts / Math.max(totalKg, 1)) * 0.7),
          )
        : 0;

    const sixMonthsFloor = nowMs - 183 * 24 * 60 * 60 * 1000;
    const twelveMonthsFloor = nowMs - 365 * 24 * 60 * 60 * 1000;
    const sixMonthsItems = approvedActions.filter((item) => {
      const timestamp = new Date(item.action_date).getTime();
      return Number.isFinite(timestamp) && timestamp >= sixMonthsFloor;
    });
    const twelveMonthsItems = approvedActions.filter((item) => {
      const timestamp = new Date(item.action_date).getTime();
      return Number.isFinite(timestamp) && timestamp >= twelveMonthsFloor;
    });

    const climate6 = {
      actions: sixMonthsItems.length,
      kg: sixMonthsItems.reduce(
        (sum, item) => sum + Number(item.waste_kg || 0),
        0,
      ),
      butts: sixMonthsItems.reduce(
        (sum, item) => sum + Number(item.cigarette_butts || 0),
        0,
      ),
    };
    const climate12 = {
      actions: twelveMonthsItems.length,
      kg: twelveMonthsItems.reduce(
        (sum, item) => sum + Number(item.waste_kg || 0),
        0,
      ),
      butts: twelveMonthsItems.reduce(
        (sum, item) => sum + Number(item.cigarette_butts || 0),
        0,
      ),
    };

    const waterProtectedLiters = Math.round(totalButts * 500);
    const co2AvoidedKg = totalButts * 0.0014;

    const eventUpcoming = events.filter(
      (event) => event.eventDate >= now.toISOString().slice(0, 10),
    );
    const eventPast = events.filter(
      (event) => event.eventDate < now.toISOString().slice(0, 10),
    );
    const rsvp = events.reduce(
      (acc, event) => {
        acc.yes += event.rsvpCounts.yes;
        acc.maybe += event.rsvpCounts.maybe;
        acc.no += event.rsvpCounts.no;
        return acc;
      },
      { yes: 0, maybe: 0, no: 0 },
    );
    const rsvpTotal = rsvp.yes + rsvp.maybe + rsvp.no;
    const participationRate = rsvpTotal > 0 ? (rsvp.yes / rsvpTotal) * 100 : 0;

    const leaderboard = [...approvedActions]
      .reduce((map, item) => {
        const actor = item.actor_name?.trim() || "Anonyme";
        const previous = map.get(actor) ?? { actions: 0, kg: 0, butts: 0 };
        map.set(actor, {
          actions: previous.actions + 1,
          kg: previous.kg + Number(item.waste_kg || 0),
          butts: previous.butts + Number(item.cigarette_butts || 0),
        });
        return map;
      }, new Map<string, { actions: number; kg: number; butts: number }>())
      .entries();

    const topLeaderboard = [...leaderboard]
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.actions - a.actions || b.kg - a.kg)
      .slice(0, 8);

    const badgeConfirmed = topLeaderboard.filter(
      (entry) => entry.actions >= 5,
    ).length;
    const badgeExpert = topLeaderboard.filter(
      (entry) => entry.actions >= 10,
    ).length;

    const sourceBuckets = allItems.reduce(
      (acc, item) => {
        const source = (
          item.source ??
          item.contract?.source ??
          "web_form"
        ).toLowerCase();
        if (source.includes("community")) {
          acc.associatif += 1;
        } else if (source.includes("admin") || source.includes("import")) {
          acc.institutionnel += 1;
        } else {
          acc.citoyen += 1;
        }
        return acc;
      },
      { citoyen: 0, associatif: 0, institutionnel: 0 },
    );

    const annualRows = byArea
      .slice(0, 8)
      .map((row) => [
        row.area,
        toFrInt(row.actions),
        `${toFrNumber(row.kg)} kg`,
        toFrInt(row.butts),
        `${toFrNumber(row.actions > 0 ? row.kg / row.actions : 0, 2)} kg/action`,
      ]);

    const calendar = buildCalendarRows(now);

    return {
      generatedAt: new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(now),
      totals: {
        actions: approvedActions.length,
        kg: totalKg,
        butts: totalButts,
        volunteers: totalVolunteers,
        hours: totalHours,
      },
      map: {
        points: geolocatedCount,
        traces: traceCount,
        polylines: polylineCount,
        polygons: polygonCount,
        geoCoverage,
        traceCoverage,
      },
      moderation: {
        ...allStatuses,
        conversion: moderationConversion,
        delayDays: average(moderationDelayDays),
      },
      quality: {
        completenessScore,
        coherenceScore,
        freshnessDays,
        geolocRate: geoCoverage,
      },
      areas: byArea,
      trendPercent,
      monthRows6,
      monthRows12,
      routeSteps,
      routeDistance,
      terrain: {
        actionCount: mapApprovedActions.length,
        spotCount: mapSpots.length,
        cleanPlaceCount: mapCleanPlaces.length,
      },
      recycling: { recyclableKg, triIndex },
      climate: {
        six: climate6,
        twelve: climate12,
        waterProtectedLiters,
        co2AvoidedKg,
      },
      community: {
        totalEvents: events.length,
        upcomingEvents: eventUpcoming.length,
        pastEvents: eventPast.length,
        rsvp,
        participationRate,
        topLeaderboard,
        badgeConfirmed,
        badgeExpert,
        sourceBuckets,
      },
      annualRows,
      calendar,
    };
  }, [
    actionsAll.data?.items,
    actionsApproved.data?.items,
    community.data?.items,
    mapAll.data?.items,
  ]);

  const weatherAdvice = useMemo(() => {
    const temperature = Number(weather.data?.current?.temperature_2m ?? 0);
    const rain = Number(weather.data?.current?.precipitation ?? 0);
    const wind = Number(weather.data?.current?.wind_speed_10m ?? 0);

    if (rain >= 3 || wind >= 40)
      return "Niveau météo prudent: renforcer EPI, réduire durée et sécuriser les points d'appui.";
    if (temperature >= 28)
      return "Niveau météo chaud: prévoir eau, pauses et roulement de l'équipe.";
    if (temperature <= 3)
      return "Niveau météo froid: cycles courts et protection renforcée des mains.";
    return "Niveau météo favorable: fenêtre opérationnelle standard.";
  }, [weather.data]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-[#f7fafd] to-white shadow-sm">
      <header className="border-b border-slate-200 bg-white/90 p-6 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#21506f]">
          Rapport web intégré
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">
          Rapport institutionnel web - version exhaustive
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Version web complète branchée à la rubrique{" "}
          <span className="font-semibold">Reporting</span>, fidèle au fond du
          PDF et optimisée pour une double lecture: opérationnelle terrain et
          pilotage stratégique.
        </p>
        <div className="mt-4 grid max-w-md gap-1">
          <label
            htmlFor="report-web-association-filter"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Périmètre
          </label>
          <select
            id="report-web-association-filter"
            value={associationFilter}
            onChange={(event) => setAssociationFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Global (toutes associations)</option>
            {associationOptions.map((association) => (
              <option key={association} value={association}>
                {association}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Contexte du rapport:{" "}
          <span className="font-semibold">Périmètre: {activeScopeLabel}</span>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Dernière génération: {report.generatedAt}
        </p>
      </header>

      <div className="grid gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sommaire cliquable
          </p>
          <nav className="mt-3 space-y-1.5 text-sm text-slate-700">
            {CHAPTERS.map((chapter) => (
              <a
                key={chapter.id}
                href={`#${chapter.id}`}
                className="block rounded-lg px-2 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <span className="text-xs text-slate-500">{chapter.kicker}</span>
                <span className="block font-medium">{chapter.title}</span>
              </a>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-[#c7d3e4] bg-[#f5f8fd] p-3 text-xs text-slate-600">
            Navigation rapide: clique un chapitre pour y aller instantanément.
          </div>
        </aside>

        <div className="space-y-8">
          <ReportPage {...CHAPTERS[0]}>
            <div className="grid gap-3 md:grid-cols-2">
              <InsightBox
                title="Lecture terrain"
                lines={[
                  "Priorités opérationnelles, itinéraires, météo et checklists lisibles en moins de 2 minutes.",
                  "Zones à traiter, volumes estimés et points de vigilance directement exploitables.",
                ]}
              />
              <InsightBox
                title="Lecture décideur"
                lines={[
                  "KPI consolidés, qualité des données, tendances et priorisation territoriale.",
                  "Bloc gouvernance + annexes pour arbitrage budgétaire et diffusion institutionnelle.",
                ]}
              />
            </div>
            <ReportTable
              headers={["Partie", "Objectif", "Public principal"]}
              rows={CHAPTERS.slice(1).map((chapter) => [
                chapter.title,
                chapter.subtitle,
                chapter.audience === "terrain"
                  ? "Bénévoles"
                  : chapter.audience === "strategie"
                    ? "Décideurs"
                    : "Mixte",
              ])}
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[1]}>
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Actions validées"
                value={toFrInt(report.totals.actions)}
                hint="Périmètre: 12 derniers mois"
              />
              <MetricCard
                label="Volume collecté"
                value={`${toFrNumber(report.totals.kg)} kg`}
                tone="accent"
              />
              <MetricCard
                label="Mégots retirés"
                value={toFrInt(report.totals.butts)}
                tone="accent"
              />
              <MetricCard
                label="Bénévoles mobilisés"
                value={toFrInt(report.totals.volunteers)}
              />
              <MetricCard
                label="Heures bénévoles"
                value={`${toFrNumber(report.totals.hours)} h`}
              />
              <MetricCard
                label="Tendance 30j"
                value={`${report.trendPercent >= 0 ? "+" : ""}${toFrNumber(report.trendPercent)}%`}
                hint="vs période précédente"
                tone={report.trendPercent > 0 ? "danger" : "base"}
              />
            </div>
            <MonthlyBars rows={report.monthRows6} />
          </ReportPage>

          <ReportPage {...CHAPTERS[2]}>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="Pending"
                value={toFrInt(report.moderation.pending)}
              />
              <MetricCard
                label="Approved"
                value={toFrInt(report.moderation.approved)}
              />
              <MetricCard
                label="Rejected"
                value={toFrInt(report.moderation.rejected)}
              />
              <MetricCard
                label="Conversion modération"
                value={`${toFrNumber(report.moderation.conversion)}%`}
                tone="accent"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InsightBox
                title="Qualité de données"
                lines={[
                  `Complétude: ${toFrNumber(report.quality.completenessScore)}%`,
                  `Cohérence: ${toFrNumber(report.quality.coherenceScore)}%`,
                  `Fraîcheur médiane: ${toFrNumber(report.quality.freshnessDays)} jours`,
                  `Taux de géolocalisation: ${toFrNumber(report.quality.geolocRate)}%`,
                ]}
              />
              <InsightBox
                title="Priorités décisionnelles"
                lines={[
                  "Cibler en priorité les 3 zones avec score de récurrence le plus élevé.",
                  "Stabiliser un délai de modération court pour fiabiliser la publication.",
                  "Exploiter la tendance glissante 30 jours pour arbitrage hebdomadaire.",
                ]}
              />
            </div>
            <ReportTable
              headers={["Zone", "Actions", "Kg", "Récurrence", "Score"]}
              rows={report.areas
                .slice(0, 8)
                .map((row) => [
                  row.area,
                  toFrInt(row.actions),
                  toFrNumber(row.kg),
                  toFrInt(row.recurrence),
                  toFrNumber(row.score),
                ])}
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[3]}>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="Actions terrain"
                value={toFrInt(report.terrain.actionCount)}
              />
              <MetricCard
                label="Spots signalés"
                value={toFrInt(report.terrain.spotCount)}
              />
              <MetricCard
                label="Lieux propres"
                value={toFrInt(report.terrain.cleanPlaceCount)}
              />
              <MetricCard
                label="Distance itinéraire"
                value={`${toFrNumber(report.routeDistance)} km`}
                tone="accent"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <GeoCoverageRing
                coveragePercent={report.map.geoCoverage}
                tracePercent={report.map.traceCoverage}
              />
              <InsightBox
                title="Recommandations opérationnelles"
                lines={[
                  "Passer en priorité par les étapes à score kg+mégots le plus élevé.",
                  "Capturer une trace/polygone quand l'action couvre plusieurs segments.",
                  "Documenter les zones de tri dès la collecte pour accélérer la valorisation.",
                ]}
              />
            </div>
            <ReportTable
              headers={[
                "Étape",
                "Zone",
                "Kg",
                "Mégots",
                "Segment",
                "Navigation",
              ]}
              rows={
                report.routeSteps.length > 0
                  ? report.routeSteps.map((step) => [
                      `#${step.index}`,
                      step.label,
                      `${toFrNumber(step.kg)} kg`,
                      toFrInt(step.butts),
                      `${toFrNumber(step.segmentKm)} km`,
                      `${toFrNumber(step.latitude, 4)}, ${toFrNumber(step.longitude, 4)}`,
                    ])
                  : [["-", "Aucune étape calculable", "-", "-", "-", "-"]]
              }
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[4]}>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="6 mois - actions"
                value={toFrInt(report.climate.six.actions)}
              />
              <MetricCard
                label="6 mois - kg"
                value={`${toFrNumber(report.climate.six.kg)} kg`}
              />
              <MetricCard
                label="12 mois - actions"
                value={toFrInt(report.climate.twelve.actions)}
              />
              <MetricCard
                label="12 mois - kg"
                value={`${toFrNumber(report.climate.twelve.kg)} kg`}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InsightBox
                title="Impacts estimés"
                lines={[
                  `Eau potentiellement protégée: ${toFrInt(report.climate.waterProtectedLiters)} L`,
                  `CO2e évité (proxy): ${toFrNumber(report.climate.co2AvoidedKg)} kg`,
                  `Indice de tri propre: ${toFrNumber(report.recycling.triIndex)} / 100`,
                  `Volume triable (proxy): ${toFrNumber(report.recycling.recyclableKg)} kg`,
                ]}
              />
              <InsightBox
                title="Météo opérationnelle"
                lines={[
                  weatherAdvice,
                  `Température: ${weather.data?.current?.temperature_2m ?? "n/a"} °C`,
                  `Précipitations: ${weather.data?.current?.precipitation ?? "n/a"} mm`,
                  `Vent: ${weather.data?.current?.wind_speed_10m ?? "n/a"} km/h`,
                ]}
              />
            </div>
            <ReportTable
              headers={["Zone", "Actions", "Kg", "Mégots", "Kg/action"]}
              rows={
                report.annualRows.length > 0
                  ? report.annualRows
                  : [["n/a", "0", "0", "0", "0"]]
              }
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[5]}>
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="Événements créés"
                value={toFrInt(report.community.totalEvents)}
              />
              <MetricCard
                label="À venir"
                value={toFrInt(report.community.upcomingEvents)}
              />
              <MetricCard
                label="Passés"
                value={toFrInt(report.community.pastEvents)}
              />
              <MetricCard
                label="Taux RSVP oui"
                value={`${toFrNumber(report.community.participationRate)}%`}
                tone="accent"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ReportTable
                headers={["Indicateur", "Valeur", "Lecture"]}
                rows={[
                  [
                    "RSVP oui / maybe / non",
                    `${toFrInt(report.community.rsvp.yes)} / ${toFrInt(report.community.rsvp.maybe)} / ${toFrInt(report.community.rsvp.no)}`,
                    "Niveau d'engagement des événements",
                  ],
                  [
                    "Badges confirmés (5+)",
                    toFrInt(report.community.badgeConfirmed),
                    "Progression régulière des contributeurs",
                  ],
                  [
                    "Badges experts (10+)",
                    toFrInt(report.community.badgeExpert),
                    "Noyau bénévole structurant",
                  ],
                  [
                    "Répartition citoyen/asso/institution",
                    `${toFrInt(report.community.sourceBuckets.citoyen)} / ${toFrInt(report.community.sourceBuckets.associatif)} / ${toFrInt(report.community.sourceBuckets.institutionnel)}`,
                    "Équilibre de l'écosystème",
                  ],
                ]}
              />
              <InsightBox
                title="Actions recommandées"
                lines={[
                  "Caler les campagnes terrain sur les événements à plus fort RSVP oui.",
                  "Rendre les paliers de badges visibles dans les parcours bénévoles.",
                  "Activer des partenariats commerçants/entreprises sur les zones de récurrence.",
                ]}
              />
            </div>
            <ReportTable
              headers={["Rang", "Contributeur", "Actions", "Kg", "Mégots"]}
              rows={
                report.community.topLeaderboard.length > 0
                  ? report.community.topLeaderboard.map((entry, index) => [
                      `#${index + 1}`,
                      entry.name,
                      toFrInt(entry.actions),
                      toFrNumber(entry.kg),
                      toFrInt(entry.butts),
                    ])
                  : [["-", "Aucune donnée", "0", "0", "0"]]
              }
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[6]}>
            <div className="grid gap-3 md:grid-cols-2">
              <InsightBox
                title="Encadré méthodologie"
                lines={[
                  "Sources: actions validées, carte, événements communauté, météo opérationnelle.",
                  "Définitions: les KPI sont recalculés en direct sur la fenêtre de données affichée.",
                  "Limites: impacts climat/eau/CO2 sont des proxys d'aide à la décision.",
                  "Règle qualité: publication externe recommandée seulement si complétude > 85%.",
                ]}
              />
              <ReportTable
                headers={["Version", "Date", "Périmètre", "Auteur"]}
                rows={[
                  [
                    "v3.0 web-report",
                    report.generatedAt,
                    "Rubrique reports (web native exhaustive)",
                    "Équipe CleanMyMap",
                  ],
                  [
                    "v2.x PDF",
                    "Pipeline back-office",
                    "Rapport PDF institutionnel",
                    "Équipe data",
                  ],
                ]}
              />
            </div>
            <ReportTable
              headers={["Contrôle", "Valeur", "Interprétation"]}
              rows={[
                [
                  "Complétude",
                  `${toFrNumber(report.quality.completenessScore)}%`,
                  "Présence des champs clés",
                ],
                [
                  "Cohérence",
                  `${toFrNumber(report.quality.coherenceScore)}%`,
                  "Valeurs plausibles et non négatives",
                ],
                [
                  "Fraîcheur médiane",
                  `${toFrNumber(report.quality.freshnessDays)} j`,
                  "Délai médian entre action et consultation",
                ],
                [
                  "Géolocalisation",
                  `${toFrNumber(report.quality.geolocRate)}%`,
                  "Taux de preuves spatiales exploitables",
                ],
                [
                  "Délai modération moyen",
                  `${toFrNumber(report.moderation.delayDays)} j`,
                  "Vitesse de publication validée",
                ],
              ]}
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[7]}>
            <ReportTable
              headers={[
                "Sprint",
                "Période",
                "Objectif principal",
                "Responsables",
              ]}
              rows={report.calendar}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <InsightBox
                title="Lecture bénévoles"
                lines={[
                  "Sprint 2 priorise la lisibilité des zones, parcours et checklists opérationnelles.",
                  "Sprint 4 diffuse les bonnes pratiques pour montée en charge nationale.",
                ]}
              />
              <InsightBox
                title="Lecture décideurs"
                lines={[
                  "Sprint 1 sécurise la fiabilité data avant tout arbitrage public.",
                  "Sprint 3 structure la preuve d'impact pour les budgets et infrastructures environnementales.",
                ]}
              />
            </div>
          </ReportPage>

          <ReportPage {...CHAPTERS[8]}>
            <ReportTable
              headers={["Terme", "Définition claire"]}
              rows={GLOSSARY_ROWS.map((row) => [...row])}
            />
          </ReportPage>

          <ReportPage {...CHAPTERS[9]}>
            <div className="grid gap-3 md:grid-cols-2">
              <ReportTable
                headers={["Bloc", "Donnée clé", "Usage"]}
                rows={[
                  [
                    "Pilotage",
                    `${toFrInt(report.totals.actions)} actions / ${toFrNumber(report.totals.kg)} kg`,
                    "Arbitrage de priorités et suivi des performances",
                  ],
                  [
                    "Terrain",
                    `${toFrNumber(report.routeDistance)} km de circuit recommandé`,
                    "Préparation opérationnelle des équipes",
                  ],
                  [
                    "Contexte",
                    `${toFrInt(report.climate.waterProtectedLiters)} L eau protégée (proxy)`,
                    "Plaidoyer et communication institutionnelle",
                  ],
                  [
                    "Communauté",
                    `${toFrInt(report.community.totalEvents)} événements`,
                    "Activation réseau bénévole et partenaires",
                  ],
                ]}
              />
              <article className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Liens d&apos;action immédiate
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/actions/new"
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    Déclarer une action
                  </Link>
                  <Link
                    href="/actions/map"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ouvrir la carte
                  </Link>
                  <Link
                    href="/actions/history"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Historique validé
                  </Link>
                  <a
                    href="#sommaire"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Retour au sommaire
                  </a>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Les exports CSV/JSON et la modération admin restent
                  disponibles dans le panneau opérationnel en bas de page.
                </p>
              </article>
            </div>
          </ReportPage>

          {isLoading ? (
            <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">
              Mise à jour du rapport web en cours...
            </p>
          ) : null}
          {hasError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Certaines sources n&apos;ont pas pu être chargées. Le rapport
              reste visible avec les données disponibles.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
