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
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {variantTip}
      </p>
      <div className="max-w-sm">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Type de kit
          <select
            value={packType}
            onChange={(event) =>
              setPackType(event.target.value as "solo" | "team" | "school")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="solo">Solo</option>
            <option value="team">Equipe</option>
            <option value="school">Scolaire</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Materiel recommande
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {packItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            onClick={copyPack}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Copier la checklist
          </button>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Checklist avant depart
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Verifier meteo et parcours.</li>
            <li>Confirmer l&apos;heure, la zone, les roles.</li>
            <li>Preparer la declaration action dans le site.</li>
            <li>Activer trace/polygone si besoin terrain.</li>
          </ol>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Progression kit: {kitProgress}%
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kitChecks.ppe}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, ppe: !prev.ppe }))
                }
              />
              EPI verifies
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kitChecks.bags}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, bags: !prev.bags }))
                }
              />
              Sacs differencies prets
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kitChecks.tools}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, tools: !prev.tools }))
                }
              />
              Outils operationnels
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kitChecks.briefing}
                onChange={() =>
                  setKitChecks((prev) => ({
                    ...prev,
                    briefing: !prev.briefing,
                  }))
                }
              />
              Briefing fait
            </label>
          </div>
        </article>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/actions/new"
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Demarrer une action
        </Link>
        <Link
          href="/actions/map"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Ouvrir la carte
        </Link>
      </div>
    </div>
  );
}
