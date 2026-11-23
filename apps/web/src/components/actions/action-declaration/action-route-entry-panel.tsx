"use client";

import { useState, type ReactNode } from "react";

type EntryMode = "describe" | "gpx" | "image";

export function ActionRouteEntryPanel({
  intent,
  description,
  onDescriptionChange,
  gpxContent,
  imageContent,
}: {
  intent: "planned" | "observed";
  description: string;
  onDescriptionChange: (value: string) => void;
  gpxContent: ReactNode;
  imageContent: ReactNode;
}) {
  const [mode, setMode] = useState<EntryMode>("describe");
  const title = intent === "planned" ? "Parcours prévu" : "Parcours réellement effectué";
  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5" aria-label={`Saisie du ${title.toLowerCase()}`}>
      <div><h3 className="font-black text-emerald-950">{title}</h3><p className="mt-1 text-sm text-emerald-900/70">Le texte, le GPX et l’image restent des données distinctes.</p></div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Méthode de saisie · ${title}`}>
        {(["describe", "gpx", "image"] as const).map((item) => {
          const label = item === "describe" ? "Décrire" : item === "gpx" ? "Importer GPX" : "Ajouter une image";
          return <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:text-sm ${mode === item ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-950"}`}>{label}</button>;
        })}
      </div>
      {mode === "describe" ? <div className="space-y-2"><label htmlFor={`route-description-${intent}`} className="text-sm font-semibold text-emerald-950">Description {intent === "planned" ? "du parcours prévu" : "du parcours effectué"}</label><textarea id={`route-description-${intent}`} value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" placeholder="Décrivez les rues ou les étapes principales…" /><p className="text-xs text-slate-600">Cette description ne crée aucune géométrie observée.</p></div> : null}
      {mode === "gpx" ? <div className="min-w-0">{gpxContent}</div> : null}
      {mode === "image" ? <div className="min-w-0">{imageContent}</div> : null}
    </section>
  );
}
