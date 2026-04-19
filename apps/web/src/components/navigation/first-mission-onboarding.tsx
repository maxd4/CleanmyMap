"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AppProfile } from "@/lib/profiles";

type OnboardingStep = {
  id: string;
  label: string;
  hint: string;
  href: string;
};

const PROFILE_ONBOARDING: Record<AppProfile, OnboardingStep[]> = {
  benevole: [
    {
      id: "brief",
      label: "Lire le brief mission",
      hint: "2 min - objectifs + securite",
      href: "/sections/guide",
    },
    {
      id: "kit",
      label: "Verifier le kit terrain",
      hint: "1 min - gants, sacs, pince",
      href: "/sections/kit",
    },
    {
      id: "declare",
      label: "Creer la declaration rapide",
      hint: "moins de 60 sec",
      href: "/actions/new?mode=quick",
    },
    {
      id: "map",
      label: "Verifier la carte avant sortie",
      hint: "zone + points prioritaires",
      href: "/actions/map",
    },
  ],
  coordinateur: [
    {
      id: "agenda",
      label: "Verifier les evenements a venir",
      hint: "capacite + RSVP",
      href: "/sections/community",
    },
    {
      id: "zones",
      label: "Definir les zones de campagne",
      hint: "priorites 30 jours",
      href: "/sections/actors",
    },
    {
      id: "dashboard",
      label: "Valider les alertes metier",
      hint: "zones critiques + backlog",
      href: "/dashboard",
    },
    {
      id: "launch",
      label: "Lancer la mission",
      hint: "communiquer le plan a l'equipe",
      href: "/actions/new?mode=quick",
    },
  ],
  scientifique: [
    {
      id: "baseline",
      label: "Verifier la baseline de donnees",
      hint: "qualite et couverture",
      href: "/reports",
    },
    {
      id: "compare",
      label: "Comparer les zones prioritaires",
      hint: "brut vs normalise",
      href: "/sections/climate",
    },
    {
      id: "climate",
      label: "Croiser avec le contexte climat",
      hint: "signal meteo-climat",
      href: "/sections/climate",
    },
    {
      id: "insight",
      label: "Partager un insight actionnable",
      hint: "1 recommandation argumentee",
      href: "/dashboard",
    },
  ],
  elu: [
    {
      id: "overview",
      label: "Ouvrir la synthese decisionnelle",
      hint: "3 KPI + alerte",
      href: "/reports",
    },
    {
      id: "zones",
      label: "Verifier priorites territoriales",
      hint: "zones a traiter",
      href: "/sections/elus",
    },
    {
      id: "compare",
      label: "Comparer les zones",
      hint: "brut vs normalise",
      href: "/sections/climate",
    },
    {
      id: "action",
      label: "Valider l'action de la semaine",
      hint: "allocation terrain",
      href: "/dashboard",
    },
  ],
  admin: [
    {
      id: "alerts",
      label: "Analyser les alertes metier",
      hint: "backlog + zones critiques",
      href: "/admin",
    },
    {
      id: "moderation",
      label: "Traiter le backlog moderation",
      hint: "priorite haute d'abord",
      href: "/reports",
    },
    {
      id: "quality",
      label: "Verifier fiabilite data",
      hint: "scores A/B/C + incoherences",
      href: "/actions/history",
    },
    {
      id: "journal",
      label: "Journaliser les operations",
      hint: "traceabilite admin",
      href: "/admin",
    },
  ],
};

function storageKey(profile: AppProfile): string {
  return `cleanmymap.onboarding.first-mission.${profile}`;
}

export function FirstMissionOnboarding({ profile }: { profile: AppProfile }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(storageKey(profile));
      if (!raw) {
        return {};
      }
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const steps = PROFILE_ONBOARDING[profile];

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(profile), JSON.stringify(checked));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [checked, profile]);

  const progress = useMemo(() => {
    const done = steps.filter((step) => checked[step.id]).length;
    const ratio = steps.length > 0 ? done / steps.length : 0;
    return {
      done,
      total: steps.length,
      percent: Math.round(ratio * 100),
      next: steps.find((step) => !checked[step.id]) ?? null,
    };
  }, [checked, steps]);

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Premiere mission
          </p>
          <h2 className="mt-1 text-base font-semibold text-emerald-900">
            Onboarding court (moins de 10 minutes)
          </h2>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          {progress.done}/{progress.total} etapes
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className="rounded-lg border border-emerald-200 bg-white p-2 text-sm text-slate-700"
          >
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={Boolean(checked[step.id])}
                onChange={() =>
                  setChecked((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                }
                className="mt-1"
              />
              <span>
                <span className="font-semibold text-slate-900">
                  {step.label}
                </span>
                <span className="block text-xs text-slate-500">
                  {step.hint}
                </span>
              </span>
            </label>
            <Link
              href={step.href}
              className="mt-2 inline-flex text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ouvrir l&apos;etape
            </Link>
          </li>
        ))}
      </ul>

      {progress.next ? (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-900">
          Prochaine etape recommandee:{" "}
          <span className="font-semibold">{progress.next.label}</span>.
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900">
          Mission prete a lancer.
        </div>
      )}
    </section>
  );
}
