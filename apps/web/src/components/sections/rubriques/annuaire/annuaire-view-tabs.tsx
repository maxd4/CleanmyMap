"use client";

import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export const ANNUAIRE_VIEWS = ["organization", "directory", "map", "network"] as const;
export type AnnuaireView = (typeof ANNUAIRE_VIEWS)[number];

export const annuaireTabId = (view: AnnuaireView) => `annuaire-tab-${view}`;
export const annuairePanelId = (view: AnnuaireView) => `annuaire-panel-${view}`;

const LABELS: Record<AnnuaireView, { fr: string; en: string }> = {
  organization: { fr: "Services publics", en: "Public services" },
  directory: { fr: "Annuaire", en: "Directory" },
  map: { fr: "Carte", en: "Map" },
  network: { fr: "Réseau 3D", en: "3D network" },
};

/** Navigation principale unique de l'Annuaire (roving tabindex, flèches, Début/Fin). */
export function AnnuaireViewTabs({
  fr,
  view,
  onChange,
}: {
  fr: boolean;
  view: AnnuaireView;
  onChange: (view: AnnuaireView) => void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const index = ANNUAIRE_VIEWS.indexOf(view);
    const last = ANNUAIRE_VIEWS.length - 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? last
          : event.key === "ArrowRight"
            ? (index + 1) % ANNUAIRE_VIEWS.length
            : (index - 1 + ANNUAIRE_VIEWS.length) % ANNUAIRE_VIEWS.length;
    event.preventDefault();
    const next = ANNUAIRE_VIEWS[nextIndex];
    onChange(next);
    document.getElementById(annuaireTabId(next))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      aria-label={fr ? "Vues de l'Annuaire" : "Directory views"}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2 border-b border-[var(--cmm-surface-border)] pb-3"
    >
      {ANNUAIRE_VIEWS.map((item) => (
        <button
          key={item}
          id={annuaireTabId(item)}
          type="button"
          role="tab"
          aria-selected={view === item}
          aria-controls={annuairePanelId(item)}
          tabIndex={view === item ? 0 : -1}
          onClick={() => onChange(item)}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500",
            view === item
              ? "border-violet-500 bg-violet-500/10 cmm-text-primary"
              : "border-[var(--cmm-surface-border)] cmm-text-secondary",
          )}
        >
          {fr ? LABELS[item].fr : LABELS[item].en}
        </button>
      ))}
    </div>
  );
}
