"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";


export function GuideSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [resourceVariant, setResourceVariant] = useState<
    "solo" | "team" | "school" | "weather"
  >("team");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const defaults = {
      briefing: false,
      declaration: false,
      tracing: false,
      moderation: false,
      export: false,
    };
    if (typeof window === "undefined") {
      return defaults;
    }
    try {
      const raw = window.localStorage.getItem("cleanmymap.guide.checklist");
      if (!raw) {
        return defaults;
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });
  const [serverReady, setServerReady] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "cleanmymap.guide.checklist",
        JSON.stringify(checks),
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [checks]);

  useEffect(() => {
    let active = true;
    void fetch("/api/users/checklist-progress?checklistId=guide-main", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          entry?: { checks?: Record<string, boolean> } | null;
        };
        if (active && payload.entry?.checks) {
          setChecks((prev) => ({ ...prev, ...payload.entry?.checks }));
        }
      })
      .finally(() => {
        if (active) {
          setServerReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!serverReady) {
      return;
    }
    void fetch("/api/users/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId: "guide-main", checks }),
    }).catch(() => undefined);
  }, [checks, serverReady]);

  const progress = useMemo(() => {
    const values = Object.values(checks);
    const done = values.filter(Boolean).length;
    return values.length > 0 ? Math.round((done / values.length) * 100) : 0;
  }, [checks]);

  function toggleCheck(key: string): void {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const sop = useMemo(() => {
    if (resourceVariant === "solo") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Brief sécurité, météo et zone ciblée validés."
            : "Safety, weather and target zone briefing validated.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Déclencher mode déclaration rapide, capturer 1 preuve géo minimale."
            : "Trigger quick-declare mode, capture 1 minimal geo proof.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Compléter les champs manquants et publier le récap 5 lignes."
            : "Fill missing fields and publish a 5-line recap.",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Vérifier score qualité et exporter CSV pour suivi local."
            : "Check quality score and export CSV for local follow-up.",
        },
      ];
    }
    if (resourceVariant === "school") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Répartition des rôles élèves/adultes + rappel EPI obligatoire."
            : "Split roles between students/adults + mandatory PPE reminder.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Progression par binômes, pauses cadencées, zone délimitée."
            : "Move in pairs, paced breaks, defined area.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Débrief classe + no-show + incidents sécurité."
            : "Class debrief + no-show + safety incidents.",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Exporter bilan pédagogique + géocouverture + volumes triés."
            : "Export pedagogical summary + geo coverage + sorted volumes.",
        },
      ];
    }
    if (resourceVariant === "weather") {
      return [
        {
          phase: fr ? "Avant sortie" : "Before outing",
          content: fr
            ? "Confirmer niveau risque météo et équipements EPI renforcés."
            : "Confirm weather risk level and reinforced PPE.",
        },
        {
          phase: fr ? "Pendant collecte" : "During collection",
          content: fr
            ? "Limiter durée de rotation, pauses imposées, binômes obligatoires."
            : "Limit rotation time, enforced breaks, mandatory pairs.",
        },
        {
          phase: fr ? "Après action" : "After action",
          content: fr
            ? "Tracer contraintes terrain subies (pluie, vent, chaleur, froid)."
            : "Record weather-related constraints (rain, wind, heat, cold).",
        },
        {
          phase: fr ? "Qualité / export" : "Quality / export",
          content: fr
            ? "Tagger l'action météo-défavorable pour lecture KPI robuste."
            : "Tag the weather-disrupted action for robust KPI reading.",
        },
      ];
    }
    return [
      {
        phase: fr ? "Avant sortie" : "Before outing",
        content: fr
          ? "Assignation des rôles équipe, vérification kit, rappel sécurité."
          : "Assign team roles, verify kit, safety reminder.",
      },
      {
        phase: fr ? "Pendant collecte" : "During collection",
        content: fr
          ? "Déclaration rapide sur mobile + trace/polygone par zone."
          : "Quick mobile declaration + trace/polygon per area.",
      },
      {
        phase: fr ? "Après action" : "After action",
        content: fr
          ? "Consolidation des volumes, contrôle cohérence et relance corrections."
          : "Consolidate volumes, check consistency, chase corrections.",
      },
      {
        phase: fr ? "Qualité / export" : "Quality / export",
        content: fr
          ? "Validation score qualité et export partenaire/collectivité."
          : "Validate quality score and export partner/local-authority report.",
      },
    ];
  }, [resourceVariant]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      <article className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            {fr ? "Bibliothèque ressources terrain" : "Field resource library"}
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            {fr ? "Variante" : "Variant"}
            <select
              value={resourceVariant}
              onChange={(event) =>
                setResourceVariant(
                  event.target.value as "solo" | "team" | "school" | "weather",
                )
              }
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none transition focus:border-emerald-500"
            >
              <option value="solo">Solo</option>
              <option value="team">{fr ? "Equipe" : "Team"}</option>
              <option value="school">{fr ? "Scolaire" : "School"}</option>
              <option value="weather">{fr ? "Météo défavorable" : "Bad weather"}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3">
          {sop.map((step) => (
            <article
              key={step.phase}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {step.phase}
              </p>
              <p className="mt-1 text-sm text-slate-700">{step.content}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/actions/new"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            {fr ? "Déclarer une action" : "Declare an action"}
          </Link>
          <Link
            href="/actions/history"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {fr ? "Corriger qualité" : "Fix quality"}
          </Link>
          <Link
            href="/reports"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {fr ? "Exporter reporting" : "Export reporting"}
          </Link>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">
            {fr ? "Mode opératoire bénévole (web)" : "Volunteer playbook (web)"}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {fr ? "Progression" : "Progress"} {progress}%
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 mb-4">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="space-y-4">
          <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="checkbox"
              checked={checks.briefing}
              onChange={() => toggleCheck("briefing")}
              className="mt-1 flex-shrink-0"
            />
            <span className="font-medium text-slate-800">
              {fr
                ? "Briefing équipe, météo et sécurité validés."
                : "Team, weather and safety briefing validated."}
            </span>
          </li>
          <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="checkbox"
              checked={checks.declaration}
              onChange={() => toggleCheck("declaration")}
              className="mt-1 flex-shrink-0"
            />
            <span className="font-medium text-slate-800">
              {fr
                ? "Déclaration créée avec lieu, date, quantités."
                : "Declaration created with place, date and quantities."}
            </span>
          </li>
          <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="checkbox"
              checked={checks.tracing}
              onChange={() => toggleCheck("tracing")}
              className="mt-1 flex-shrink-0"
            />
            <span className="font-medium text-slate-800">
              {fr
                ? "Trace ou polygone capturés pour la zone nettoyée."
                : "Trace or polygon captured for the cleaned area."}
            </span>
          </li>
          <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="checkbox"
              checked={checks.moderation}
              onChange={() => toggleCheck("moderation")}
              className="mt-1 flex-shrink-0"
            />
            <span className="font-medium text-slate-800">
              {fr
                ? "Modération suivie pour fiabiliser la donnée."
                : "Moderation followed to make the data reliable."}
            </span>
          </li>
          <li className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="checkbox"
              checked={checks.export}
              onChange={() => toggleCheck("export")}
              className="mt-1 flex-shrink-0"
            />
            <span className="font-medium text-slate-800">
              {fr
                ? "Export CSV/JSON réalisé pour exploitation terrain/collectivités."
                : "CSV/JSON export produced for field use and local authorities."}
            </span>
          </li>
        </ul>
      </article>
    </div>
  );
}
