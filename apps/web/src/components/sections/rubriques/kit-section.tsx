"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";


export function KitSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
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
        fr ? "1 paire de gants" : "1 pair of gloves",
        fr ? "2 sacs différenciés" : "2 separate bags",
        fr ? "1 pince" : "1 picker",
        fr ? "1 bouteille d'eau" : "1 water bottle",
        fr ? "téléphone chargé" : "charged phone",
      ];
    }
    if (packType === "school") {
      return [
        fr ? "20 paires de gants" : "20 pairs of gloves",
        fr ? "40 sacs différenciés" : "40 separate bags",
        fr ? "6 pinces" : "6 pickers",
        fr ? "kit signalétique" : "signage kit",
        fr ? "briefing sécurité imprimé" : "printed safety briefing",
      ];
    }
    return [
      fr ? "10 paires de gants" : "10 pairs of gloves",
      fr ? "20 sacs différenciés" : "20 separate bags",
      fr ? "4 pinces" : "4 pickers",
      fr ? "2 contenants mégots" : "2 butt containers",
      fr ? "gilet haute visibilité x5" : "5 high-visibility vests",
    ];
  }, [packType]);

  const variantTip = useMemo(() => {
    if (resourceVariant === "solo") {
      return fr ? "Mode solo: privilégier des sorties courtes et des zones compactes." : "Solo mode: favor short outings and compact areas.";
    }
    if (resourceVariant === "school") {
      return fr ? "Mode scolaire: renforcer supervision adulte et balisage de zone." : "School mode: strengthen adult supervision and area marking.";
    }
    return fr ? "Mode équipe: structurer les binômes pour maximiser couverture + qualité." : "Team mode: structure pairs to maximize coverage and quality.";
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
        <p className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700 shadow-sm">
          {variantTip}
        </p>
        <article className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-md">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-900 mb-4">
            {fr ? "Configuration du kit" : "Kit configuration"}
            <select
              value={packType}
              onChange={(event) =>
                setPackType(event.target.value as "solo" | "team" | "school")
              }
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none transition focus:border-emerald-500 font-normal mt-1"
            >
              <option value="solo">{fr ? "Solo" : "Solo"}</option>
              <option value="team">{fr ? "Équipe" : "Team"}</option>
              <option value="school">{fr ? "Scolaire" : "School"}</option>
            </select>
          </label>
          <div className="pt-2 border-t border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              {fr ? "Matériel recommandé" : "Recommended equipment"}
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
              {fr ? "Copier au presse-papier" : "Copy to clipboard"}
            </button>
          </div>
        </article>
      </div>

      {/* Colonne Droite : Checklist Opérationnelle */}
      <div className="space-y-4">
        <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {fr ? "Checklist avant départ" : "Pre-departure checklist"}
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded">
              {fr ? "Progression kit" : "Kit progress"}: {kitProgress}%
            </p>
          </div>

          <div className="mb-4 space-y-3">
            <label className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.ppe}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, ppe: !prev.ppe }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">{fr ? "EPI vérifiés et adaptés à la zone" : "PPE checked and adapted to the area"}</span>
            </label>
            <label className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.bags}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, bags: !prev.bags }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">{fr ? "Sacs différenciés préparés (recyclable/tout-venant)" : "Separate bags prepared (recyclables/general waste)"}</span>
            </label>
            <label className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                checked={kitChecks.tools}
                onChange={() =>
                  setKitChecks((prev) => ({ ...prev, tools: !prev.tools }))
                }
                className="flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-800">{fr ? "Outils de collecte (pinces, cendriers)" : "Collection tools (pickers, ashtrays)"}</span>
            </label>
            <label className="flex items-center gap-3 bg-white/90 p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors">
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
              <span className="text-sm font-medium text-slate-800">{fr ? "Briefing sécurité et parcours diffusé" : "Safety briefing and route shared"}</span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{fr ? "Actions logistiques" : "Logistics actions"}</h3>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600 mb-4">
              <li>{fr ? "Vérifier l'état de la météo en temps réel." : "Check the weather status in real time."}</li>
              <li>{fr ? "Confirmer l'heure, la zone et le lieu de déchargement." : "Confirm time, zone and drop-off point."}</li>
              <li>{fr ? "Ouvrir la carte de priorisation avant départ." : "Open the prioritization map before departure."}</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/actions/new"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
              >
                {fr ? "Déclarer l'action" : "Declare action"}
              </Link>
              <Link
                href="/actions/map"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {fr ? "Ouvrir la roadmap" : "Open roadmap"}
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
    </div>
  );
}
