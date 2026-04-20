"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";


export function KitSection() {
  const [packType, setPackType] = useState<"solo" | "team" | "school">("team");
  const [kitChecks, setKitChecks] = useState<Record<string, boolean>>({
    ppe: false,
    bags: false,
    tools: false,
    briefing: false,
  });
  const [kitReady, setKitReady] = useState<boolean>(false);

  const resourceVariant = packType;

  const packItems = useMemo(() => {
    if (packType === "solo") {
      return [
        "1 paire de gants",
        "2 sacs differencies",
        "1 pince",
        "1 bouteille d'eau",
        "telephone charge",
      ];
    }
    if (packType === "school") {
      return [
        "20 paires de gants",
        "40 sacs differencies",
        "6 pinces",
        "kit signaletique",
        "briefing securite imprime",
      ];
    }
    return [
      "10 paires de gants",
      "20 sacs differencies",
      "4 pinces",
      "2 contenants megots",
      "gilet haute visibilite x5",
    ];
  }, [packType]);

  const variantTip = useMemo(() => {
    if (resourceVariant === "solo") {
      return "Mode solo: privilegier des sorties courtes et des zones compactes.";
    }
    if (resourceVariant === "school") {
      return "Mode scolaire: renforcer supervision adulte et balisage de zone.";
    }
    return "Mode equipe: structurer les binomes pour maximiser couverture + qualite.";
  }, [resourceVariant]);

  function copyPack(): void {
    const text = `Kit ${packType}\n- ${packItems.join("\n- ")}`;
    void navigator.clipboard?.writeText(text);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/users/checklist-progress?checklistId=kit-main", {
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
          setKitChecks((prev) => ({ ...prev, ...payload.entry?.checks }));
        }
      })
      .finally(() => {
        if (active) {
          setKitReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!kitReady) {
      return;
    }
    void fetch("/api/users/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId: "kit-main", checks: kitChecks }),
    }).catch(() => undefined);
  }, [kitChecks, kitReady]);

  const kitProgress = Math.round(
    (Object.values(kitChecks).filter(Boolean).length /
      Object.values(kitChecks).length) *
      100,
  );

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
      {/* Colonne Gauche : Configuration et Matériel */}
      <div className="space-y-4">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm">
          {variantTip}
        </p>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 mb-4">
            Configuration du kit
            <select
              value={packType}
              onChange={(event) =>
                setPackType(event.target.value as "solo" | "team" | "school")
              }
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-emerald-500 font-normal mt-1"
            >
              <option value="solo">Solo</option>
              <option value="team">Equipe</option>
              <option value="school">Scolaire</option>
            </select>
          </label>
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Materiel recommande
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {packItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button
              onClick={copyPack}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              Copier au presse-papier
            </button>
          </div>
        </article>
      </div>

      {/* Colonne Droite : Checklist Opérationnelle */}
      <div className="space-y-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Checklist avant depart
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded">
              Progression kit: {kitProgress}%
            </p>
          </div>

          <div className="mb-4 space-y-3">
            <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.ppe}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, ppe: !prev.ppe }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">EPI verifies et adaptes a la zone</span>
            </label>
            <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.bags}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, bags: !prev.bags }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">Sacs differencies prepares (recyclable/tout-venant)</span>
            </label>
            <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.tools}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, tools: !prev.tools }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">Outils de collecte (pinces, cendriers)</span>
            </label>
            <label className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.briefing}
                onChange={() =>
                  setKitChecks((prev) => ({
                    ...prev,
                    briefing: !prev.briefing,
                  }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">Briefing securite et parcours diffuse</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Actions logistiques</h3>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600 mb-4">
              <li>Verifier l&apos;etat de la meteo en temps reel.</li>
              <li>Confirmer l&apos;heure, la zone et le lieu de dechargement.</li>
              <li>Ouvrir la carte de priorisation avant depart.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/actions/new"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
              >
                Declarer l'action
              </Link>
              <Link
                href="/actions/map"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Ouvrir la roadmap
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
    </div>
  );
}
