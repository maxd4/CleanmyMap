import {
  Building,
  Building2,
  Map as MapIcon,
  Trees,
  TrainFront,
  Waves,
} from "lucide-react";
import type { FormState } from "../model";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./action-step-identity.ui";

const PLACE_TYPE_TILE_OPTIONS = [
  {
    values: ["N° Rue/Allée/Villa/Ruelle/Impasse"],
    value: "N° Rue/Allée/Villa/Ruelle/Impasse",
    icon: MapIcon,
    label: "Voirie",
    sub: "Rue, allée, impasse",
  },
  {
    values: ["Bois/Parc/Jardin/Square/Sentier"],
    value: "Bois/Parc/Jardin/Square/Sentier",
    icon: Trees,
    label: "Espace vert",
    sub: "Parc, jardin, sentier",
  },
  {
    values: ["Quai/Pont/Port"],
    value: "Quai/Pont/Port",
    icon: Waves,
    label: "Pont & Quai",
    sub: "Berge, port, pont",
  },
  {
    values: ["N° Boulevard/Avenue/Place"],
    value: "N° Boulevard/Avenue/Place",
    icon: Building2,
    label: "Avenue & Place",
    sub: "Boulevard, place",
  },
  {
    values: ["Gare/Station/Portique"],
    value: "Gare/Station/Portique",
    icon: TrainFront,
    label: "Espace couvert",
    sub: "Gare, station, portique",
  },
  {
    values: ["Galerie/Passage couvert", "Monument"],
    value: "Galerie/Passage couvert",
    icon: Building,
    label: "Galerie & Monument",
    sub: "Passage, galerie, site, monument",
  },
] as const;

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
          "grid grid-cols-2 gap-2 sm:grid-cols-3",
          full ? "xl:grid-cols-3" : "",
        )}
      >
        {PLACE_TYPE_TILE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = option.values.some((value) => value === form.placeType);
          return (
            <button
              key={option.label}
              type="button"
              title={option.sub}
              aria-pressed={isSelected}
              onClick={() => updateField("placeType", option.value)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center",
                full
                  ? "min-h-[92px] transition-all duration-200"
                  : "min-h-[80px] transition-all",
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
                    {option.sub}
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
    </div>
  );
}
