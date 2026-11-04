import {
  CircleHelp,
  Map as MapIcon,
  ParkingSquare,
  Route,
  Trees,
  TrainFront,
  Waves,
} from "lucide-react";
import type { FormState } from "../model";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./action-step-identity.ui";
import { PLACE_TYPE_CATALOG, type PlaceTypeIcon } from "@/lib/actions/place-type-options";

const PLACE_TYPE_ICONS: Record<PlaceTypeIcon, typeof MapIcon> = {
  urban: MapIcon,
  parks: Trees,
  forest: Trees,
  water: Waves,
  coast: Waves,
  covered: TrainFront,
  activity: ParkingSquare,
  roadside: Route,
  other: CircleHelp,
};

export function ActionCollectionSection({
  form,
  updateField,
  variant,
}: {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  variant: "compact" | "full";
}) {
  const full = variant === "full";
  const gridClassName = full
    ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
    : "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div>
      <SectionTitle color="bg-emerald-500">Environnement de collecte</SectionTitle>
      <div className={gridClassName} role="group" aria-label="Environnements de collecte">
        {PLACE_TYPE_CATALOG.map((option) => {
          const Icon = PLACE_TYPE_ICONS[option.icon];
          const isSelected = option.value === form.placeType;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => updateField("placeType", option.value)}
              className={cn(
                "flex min-h-11 w-full items-center justify-start gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:text-sm",
                isSelected
                  ? "border-emerald-950 bg-emerald-900 text-white shadow-sm hover:border-emerald-950 hover:bg-emerald-800"
                  : "border-emerald-200/80 bg-white text-emerald-950 hover:border-emerald-400 hover:bg-emerald-50",
              )}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0">{option.label}</span>
            </button>
          );
        })}
      </div>
      {form.placeType && !PLACE_TYPE_CATALOG.some((option) => option.value === form.placeType) ? (
        <p role="note" className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-950">
          Valeur historique conservée : <strong>{form.placeType}</strong>. Choisissez une catégorie pour reclasser explicitement cette action.
        </p>
      ) : null}
      {form.placeType === "roadside_areas" ? (
        <p role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
          Ne pas accéder aux zones de circulation. Respectez les restrictions et autorisations applicables.
        </p>
      ) : null}
      <button
        type="button"
        aria-pressed={form.placeType === ""}
        onClick={() => updateField("placeType", "")}
        className={cn(
          "mt-2 inline-flex min-h-10 items-center rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          form.placeType === ""
            ? "border-emerald-950 bg-emerald-900 text-white"
            : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50",
        )}
      >
        Type d’environnement non renseigné
      </button>
    </div>
  );
}
