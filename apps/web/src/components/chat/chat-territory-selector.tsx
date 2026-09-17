"use client";

import { getSupportedChatTerritoryOptions } from "@/lib/chat/channels";
import { extractParisArrondissementFromLabel } from "@/lib/geo/paris-arrondissements";

const TERRITORY_OPTIONS = getSupportedChatTerritoryOptions();

export function ChatTerritorySelector({
  currentZone,
  profileDefaultZone,
  onChange,
  tone = "dark",
  compact = false,
}: {
  currentZone: string;
  profileDefaultZone: string;
  onChange: (zoneName: string) => void;
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const isLight = tone === "light";
  const currentArrondissement = extractParisArrondissementFromLabel(currentZone);
  const currentOptionValue =
    TERRITORY_OPTIONS.find((option) => option.value === currentZone)?.value ??
    TERRITORY_OPTIONS.find((option) => option.arrondissementId === currentArrondissement)?.value ??
    "";

  return (
    <div className={`${compact ? "space-y-1 rounded-xl p-2" : "space-y-2 rounded-2xl p-3"} border border-slate-200/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-900/60`}>
      <label className={compact ? "block space-y-1" : "block space-y-1.5"}>
        <span className={`block cmm-text-caption font-black uppercase tracking-[0.16em] ${isLight ? "text-slate-500" : "text-slate-500"}`}>
          {compact ? "Zone active" : "Territoire consulté"}
        </span>
        <select
          value={currentOptionValue}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-400 ${isLight ? "border-slate-200 bg-white text-slate-800" : "border-slate-700 bg-slate-950 text-slate-100"}`}
        >
          <option value="">Choisir une zone</option>
          {TERRITORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="cmm-text-caption leading-4 text-slate-500">
        {profileDefaultZone
          ? compact
            ? `Défaut : ${profileDefaultZone}`
            : `Territoire par défaut : ${profileDefaultZone}. Ce choix ponctuel ne modifie pas votre profil.`
          : "Choisissez une zone valide pour consulter et écrire dans son fil."}
      </p>
    </div>
  );
}
