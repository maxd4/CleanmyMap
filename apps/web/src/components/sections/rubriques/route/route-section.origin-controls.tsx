import type { RouteOriginMode, RouteRecommendationOrigin } from "./route-types";

export function RouteOriginControls({
  fr,
  originMode,
  setOriginMode,
  mapOrigin,
  clearMapOrigin,
  originSelectionError,
}: {
  fr: boolean;
  originMode: RouteOriginMode;
  setOriginMode: (mode: RouteOriginMode) => void;
  mapOrigin: RouteRecommendationOrigin | null;
  clearMapOrigin: () => void;
  originSelectionError: boolean;
}) {
  const originMessage = mapOrigin
    ? fr
      ? "Point choisi sur la carte. Vous pouvez le déplacer en cliquant à nouveau."
      : "Point chosen on the map. Click again to move it."
    : fr
      ? "Cliquez sur la carte pour choisir un point de départ avant de calculer."
      : "Click the map to choose a starting point before calculating.";
  return (
    <fieldset className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(11,39,30,0.88)] p-5">
      <legend className="px-1 cmm-text-caption font-black uppercase tracking-[0.28em] text-emerald-100/68">{fr ? "Point de départ" : "Starting point"}</legend>
      <div className="mt-3 grid gap-3">
        <label className="flex items-center gap-3 text-sm font-semibold text-white"><input type="radio" name="route-origin-mode" value="browser" checked={originMode === "browser"} onChange={() => setOriginMode("browser")} className="accent-emerald-300" />{fr ? "Ma position actuelle" : "My current position"}</label>
        <label className="flex items-center gap-3 text-sm font-semibold text-white"><input type="radio" name="route-origin-mode" value="map" checked={originMode === "map"} onChange={() => setOriginMode("map")} className="accent-emerald-300" />{fr ? "Choisir sur la carte" : "Choose on the map"}</label>
      </div>
      {originMode === "map" ? <div role="status" className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${originSelectionError || !mapOrigin ? "border-amber-300/25 bg-amber-500/10 text-amber-50" : "border-emerald-300/20 bg-emerald-500/10 text-emerald-50"}`}>
        {originMessage}
        {mapOrigin ? <button type="button" onClick={clearMapOrigin} className="ml-3 underline underline-offset-2">{fr ? "Réinitialiser" : "Reset"}</button> : null}
      </div> : null}
    </fieldset>
  );
}
