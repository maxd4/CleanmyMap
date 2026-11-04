import { useState } from "react";
import { MapPin } from "lucide-react";
import { ActionAddressAutocomplete } from "@/components/actions/action-declaration/action-address-autocomplete";
import { buildBoundedRouteStartZone } from "@/lib/route/route-start-location";
import type { RouteOptions, RouteOriginMode, RouteRecommendationOrigin } from "./route-types";

export function RouteOriginControls({
  fr, options, setOptions,
  originMode,
  setOriginMode,
  mapOrigin,
  clearMapOrigin,
  originSelectionError,
}: {
  fr: boolean;
  options: RouteOptions;
  setOptions: React.Dispatch<React.SetStateAction<RouteOptions>>;
  originMode: RouteOriginMode;
  setOriginMode: (mode: RouteOriginMode) => void;
  mapOrigin: RouteRecommendationOrigin | null;
  clearMapOrigin: () => void;
  originSelectionError: boolean;
}) {
  const [gpsInput, setGpsInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [zoneInput, setZoneInput] = useState("");
  const startMode = originMode === "zone" ? "zone" : options.startLocation?.mode ?? "precise";
  const preciseLabel = options.startLocation?.mode === "precise" ? options.startLocation.label : "";
  const zone = options.startLocation?.mode === "zone" ? options.startLocation.zone : null;
  const originMessage = mapOrigin
    ? fr
      ? "Point choisi sur la carte. Vous pouvez le déplacer en cliquant à nouveau."
      : "Point chosen on the map. Click again to move it."
    : fr
      ? "Cliquez sur la carte pour choisir un point de départ avant de calculer."
      : "Click the map to choose a starting point before calculating.";
  const selectStartMode = (mode: "precise" | "zone") => {
    if (mode === "zone") {
      setOriginMode("zone");
      return;
    }
    setOriginMode(options.startLocation?.mode === "precise" ? options.startLocation.origin.source : "browser");
  };
  const setPreciseAddress = (label: string, coordinates?: { latitude: number; longitude: number } | null) => {
    setAddressInput(label);
    setOptions((previous) => ({
      ...previous,
      startLocation: coordinates
        ? { mode: "precise", label, origin: { ...coordinates, source: "address" } }
        : undefined,
    }));
  };
  const setGps = (value: string) => {
    setGpsInput(value);
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/);
    const latitude = match ? Number(match[1]) : NaN;
    const longitude = match ? Number(match[2]) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setOptions((previous) => ({ ...previous, startLocation: undefined }));
      return;
    }
    setOptions((previous) => ({
      ...previous,
      startLocation: { mode: "precise", label: `GPS ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, origin: { latitude, longitude, source: "gps" } },
    }));
  };
  const setZoneRadius = (radiusKm: number) => {
    if (!zone) return;
    const nextZone = buildBoundedRouteStartZone(zone.label, zone.center, radiusKm, zone.source);
    setOptions((previous) => ({ ...previous, startLocation: { mode: "zone", label: zone.label, zone: { ...nextZone, confirmed: false } } }));
  };
  return (
    <fieldset className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <legend className="px-1 cmm-text-caption font-black uppercase tracking-[0.2em] text-emerald-800">{fr ? "D'où partir ?" : "Where to start?"}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950"><input type="radio" name="route-start-mode" value="precise" checked={startMode === "precise"} onChange={() => selectStartMode("precise")} className="accent-emerald-600" />{fr ? "Adresse précise" : "Precise address"}</label>
        <label className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-950"><input type="radio" name="route-start-mode" value="zone" checked={startMode === "zone"} onChange={() => selectStartMode("zone")} className="accent-emerald-600" />{fr ? "Zone" : "Area"}</label>
      </div>
      {startMode === "precise" ? <div className="mt-3 space-y-2">
        <label className="flex items-center gap-3 text-sm font-semibold text-emerald-950"><input type="radio" name="route-precise-source" checked={originMode === "browser"} onChange={() => setOriginMode("browser")} className="accent-emerald-600" />{fr ? "Ma position actuelle" : "My current position"}</label>
        <label className="flex items-center gap-3 text-sm font-semibold text-emerald-950"><input type="radio" name="route-precise-source" checked={originMode === "map"} onChange={() => setOriginMode("map")} className="accent-emerald-600" />{fr ? "Choisir sur la carte" : "Choose on the map"}</label>
        <label className="flex items-center gap-3 text-sm font-semibold text-emerald-950"><input type="radio" name="route-precise-source" checked={originMode === "address" || originMode === "gps"} onChange={() => setOriginMode("address")} className="accent-emerald-600" />{fr ? "Adresse ou coordonnées GPS" : "Address or GPS coordinates"}</label>
        {originMode === "address" || originMode === "gps" ? <>
          <ActionAddressAutocomplete id="route-start-address" icon={MapPin} label={fr ? "Lieu résolu" : "Resolved place"} placeholder={fr ? "Adresse postale…" : "Postal address…"} value={addressInput || preciseLabel} onChange={setPreciseAddress} helperText={fr ? "Sélectionnez un résultat géocodé" : "Select a geocoded result"} />
          <label className="block text-xs font-semibold text-emerald-900"><span>{fr ? "Ou latitude, longitude" : "Or latitude, longitude"}</span><input value={gpsInput} onChange={(event) => { setOriginMode("gps"); setGps(event.target.value); }} placeholder="48.8566, 2.3522" className="mt-1 h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950" inputMode="decimal" /></label>
        </> : null}
        {originMode === "map" ? <div role="status" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${originSelectionError || !mapOrigin ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
        {originMessage}
        {mapOrigin ? <button type="button" onClick={clearMapOrigin} className="ml-3 underline underline-offset-2">{fr ? "Réinitialiser" : "Reset"}</button> : null}
        </div> : null}
        {originMode === "address" || originMode === "gps" ? <p role="status" className={`rounded-xl border px-3 py-2 text-xs font-semibold ${originSelectionError || !options.startLocation ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>{options.startLocation?.mode === "precise" ? `${fr ? "Départ imposé : " : "Fixed departure: "}${options.startLocation.label}` : (fr ? "Sélectionnez une adresse ou des coordonnées valides avant de générer." : "Select a valid address or coordinates before generating.")}</p> : null}
      </div> : null}
      {startMode === "zone" ? <div className="mt-3 space-y-2">
        <ActionAddressAutocomplete id="route-start-zone" icon={MapPin} label={fr ? "Zone de départ" : "Starting area"} placeholder={fr ? "Ville, arrondissement, quartier ou lieu-dit…" : "City, district, neighborhood or locality…"} value={(zoneInput || zone?.label) ?? ""} onChange={(label, coordinates) => { setZoneInput(label); if (!coordinates) { setOptions((previous) => ({ ...previous, startLocation: undefined })); return; } const nextZone = buildBoundedRouteStartZone(label, coordinates, zone?.radiusKm ?? 2, "user"); setOptions((previous) => ({ ...previous, startLocation: { mode: "zone", label, zone: nextZone } })); }} helperText={fr ? "Sélectionnez une emprise réelle ou bornée" : "Select a real or bounded area"} />
        {zone ? <>
          <label className="block text-xs font-semibold text-emerald-900"><span>{fr ? "Rayon de recherche (km)" : "Search radius (km)"}</span><input type="number" min="0.1" max="25" step="0.1" value={zone.radiusKm} onChange={(event) => setZoneRadius(Number(event.target.value))} className="mt-1 h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-emerald-950" /></label>
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">{fr ? `Emprise bornée autour de ${zone.center.latitude.toFixed(4)}, ${zone.center.longitude.toFixed(4)} · ${zone.radiusKm.toFixed(1)} km.` : `Bounded area around ${zone.center.latitude.toFixed(4)}, ${zone.center.longitude.toFixed(4)} · ${zone.radiusKm.toFixed(1)} km.`}</p>
          <button type="button" onClick={() => setOptions((previous) => ({ ...previous, startLocation: previous.startLocation?.mode === "zone" ? { ...previous.startLocation, zone: { ...previous.startLocation.zone, confirmed: true } } : previous.startLocation }))} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-black text-emerald-900 transition hover:bg-emerald-50">{zone.confirmed ? (fr ? "Emprise confirmée" : "Area confirmed") : (fr ? "Confirmer cette emprise" : "Confirm this area")}</button>
        </> : <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">{fr ? "Sélectionnez une zone puis confirmez son emprise sur la carte." : "Select an area, then confirm its bounds on the map."}</p>}
      </div> : null}
    </fieldset>
  );
}
