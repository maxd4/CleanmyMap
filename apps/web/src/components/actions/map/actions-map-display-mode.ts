import type { CurrentPlaceStateMode } from "@/lib/actions/current-place-state";

export const ACTIONS_MAP_DISPLAY_MODE_OPTIONS: readonly {
  value: CurrentPlaceStateMode;
  label: string;
}[] = [
  { value: "observed", label: "Observé" },
  { value: "projected_today", label: "Projeté aujourd’hui" },
];
