"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";


export function GuideSection() {
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
          phase: "Avant sortie",
          content: "Brief securite, meteo et zone ciblee valides.",
        },
        {
          phase: "Pendant collecte",
          content:
            "Declencher mode declaration rapide, capturer 1 preuve geo minimale.",
        },
        {
          phase: "Apres action",
          content:
            "Completer les champs manquants et publier le recap 5 lignes.",
        },
        {
          phase: "Qualite / export",
          content: "Verifier score qualite et exporter CSV pour suivi local.",
        },
      ];
    }
    if (resourceVariant === "school") {
      return [
        {
          phase: "Avant sortie",
          content:
            "Repartition des roles eleves/adultes + rappel EPI obligatoire.",
        },
        {
          phase: "Pendant collecte",
          content: "Progression par binomes, pauses cadencees, zone delimitee.",
        },
        {
          phase: "Apres action",
          content: "Debrief classe + no-show + incidents securite.",
        },
        {
          phase: "Qualite / export",
          content:
            "Exporter bilan pedagogique + geocouverture + volumes tries.",
        },
      ];
    }
    if (resourceVariant === "weather") {
      return [
        {
          phase: "Avant sortie",
          content:
            "Confirmer niveau risque meteo et equipements EPI renforces.",
        },
        {
          phase: "Pendant collecte",
          content:
            "Limiter duree de rotation, pauses imposees, binomes obligatoires.",
        },
        {
          phase: "Apres action",
          content:
            "Tracer contraintes terrain subies (pluie, vent, chaleur, froid).",
        },
        {
          phase: "Qualite / export",
          content:
            "Tagger l'action meteo-defavorable pour lecture KPI robuste.",
        },
      ];
    }
    return [
      {
        phase: "Avant sortie",
        content:
          "Assignation des roles equipe, verification kit, rappel securite.",
      },
      {
        phase: "Pendant collecte",
        content: "Declaration rapide sur mobile + trace/polygone par zone.",
      },
      {
        phase: "Apres action",
        content:
          "Consolidation des volumes, controle coherence et relance corrections.",
      },
      {
        phase: "Qualite / export",
        content: "Validation score qualite et export partenaire/collectivite.",
      },
    ];
  }, [resourceVariant]);

  return (
    <div className="space-y-4">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Bibliotheque ressources terrain
          </h2>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            Variante
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
              <option value="team">Equipe</option>
              <option value="school">Scolaire</option>
              <option value="weather">Meteo defavorable</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/actions/new"
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Declarer une action
          </Link>
          <Link
            href="/actions/history"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Corriger qualite
          </Link>
          <Link
            href="/reports"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Exporter reporting
          </Link>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">
            Mode operatoire benevole (web)
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Progression {progress}%
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checks.briefing}
              onChange={() => toggleCheck("briefing")}
              className="mt-1"
            />
            <span>Briefing equipe, meteo et securite valides.</span>
          </li>
          <li className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checks.declaration}
              onChange={() => toggleCheck("declaration")}
              className="mt-1"
            />
            <span>Declaration creee avec lieu, date, quantites.</span>
          </li>
          <li className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checks.tracing}
              onChange={() => toggleCheck("tracing")}
              className="mt-1"
            />
            <span>Trace ou polygone captures pour la zone nettoyee.</span>
          </li>
          <li className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checks.moderation}
              onChange={() => toggleCheck("moderation")}
              className="mt-1"
            />
            <span>Moderation suivie pour fiabiliser la donnee.</span>
          </li>
          <li className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={checks.export}
              onChange={() => toggleCheck("export")}
              className="mt-1"
            />
            <span>
              Export CSV/JSON realise pour exploitation terrain/collectivites.
            </span>
          </li>
        </ul>
      </article>
    </div>
  );
}
