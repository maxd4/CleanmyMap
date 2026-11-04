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
  return (
    <div>
      <SectionTitle color="bg-emerald-500">Environnement de collecte</SectionTitle>
      <div
        className={cn(
          "flex flex-wrap gap-2",
        )}
      >
        {PLACE_TYPE_CATALOG.map((option) => {
          const Icon = PLACE_TYPE_ICONS[option.icon];
          const isSelected = option.value === form.placeType;
          return (
            <button
              key={option.label}
              type="button"
              title={option.description}
              aria-pressed={isSelected}
              onClick={() => updateField("placeType", option.value)}
              className={cn(
                "relative flex min-w-[9.25rem] flex-1 basis-[9.25rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                full
                  ? "min-h-[72px] transition-all duration-200"
                  : "min-h-[64px] transition-all",
                isSelected
                  ? "border-emerald-300 bg-[#ECF8EF] shadow-sm"
                  : "border-emerald-200/70 bg-[#F3FBF6] hover:border-emerald-300 hover:bg-[#EAF7EF]",
              )}
            >
              {full ? (
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                    isSelected
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  <Icon size={16} />
                </div>
              ) : (
                <Icon
                  size={16}
                  className={isSelected ? "text-emerald-700" : "text-emerald-600/70"}
                />
              )}
              {full ? (
                <div>
                  <p
                    className={cn(
                      "cmm-text-small font-semibold leading-tight",
                      isSelected ? "text-emerald-950" : "text-emerald-900/70",
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="mt-0.5 hidden cmm-text-small leading-tight text-emerald-900/45 sm:block">
                    {option.description}
                  </p>
                </div>
              ) : (
                <span
                  className={cn(
                    "text-xs font-semibold leading-tight",
                    isSelected ? "text-emerald-950" : "text-emerald-900/70",
                  )}
                >
                  {option.label}
                </span>
              )}
              {full && isSelected ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
              ) : null}
            </button>
          );
        })}
      </div>
      {form.placeType && !PLACE_TYPE_CATALOG.some((option) => option.value === form.placeType) ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-950">
          Valeur historique conservée : <strong>{form.placeType}</strong>. Choisissez une catégorie pour reclasser explicitement cette action.
        </p>
      ) : null}
      <button
        type="button"
        aria-pressed={form.placeType === ""}
        onClick={() => updateField("placeType", "")}
        className={cn(
          "mt-3 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
          form.placeType === ""
            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60",
        )}
      >
        Type d’environnement non renseigné
      </button>
    </div>
  );
}
