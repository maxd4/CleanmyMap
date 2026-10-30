"use client";

import { AlertCircle, CheckCircle2, Crosshair, Loader2, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionAddressAutocomplete } from "./action-address-autocomplete";
import type { ActionGeometryMethod } from "@/lib/actions/types";
import type { ActionLocationInputProps } from "./action-location.types";

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={cn("h-1 w-5 rounded-full", color)} />
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-900/60">{children}</h3>
    </div>
  );
}

function GpsButton({
  gpsStatus: status,
  gpsMessage: message,
  onAutofillGps: onAutofill,
}: Pick<ActionLocationInputProps, "gpsStatus" | "gpsMessage" | "onAutofillGps">) {
  const isLocating = status === "locating";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onAutofill}
        disabled={isLocating}
        aria-label="Utiliser la position actuelle de mon appareil"
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30",
          isSuccess
            ? "border-emerald-300 bg-[#ECF8EF] text-emerald-800 hover:bg-[#E0F4E6]"
            : isError
              ? "border-rose-200 bg-[#FFF7F8] text-rose-700 hover:bg-[#FFEFF2]"
              : "border-sky-200 bg-[#EFFAF3] text-sky-800 hover:bg-[#EAF7EF]",
          isLocating && "cursor-not-allowed opacity-70",
        )}
      >
        {isLocating ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 size={16} />
        ) : isError ? (
          <AlertCircle size={16} />
        ) : (
          <Crosshair size={16} />
        )}
        {isLocating
          ? "Localisation en cours…"
          : isSuccess
            ? "Position détectée"
            : isError
              ? "Réessayer la géolocalisation"
              : "Utiliser la position actuelle de mon appareil"}
      </button>

      {message ? (
        <p className={cn("px-1 text-xs", isError ? "text-rose-600" : "text-emerald-900/45")}>
          {isError && "⚠ "}
          {message}
        </p>
      ) : null}
      {isError && !message ? (
        <p className="px-1 text-xs text-rose-500">
          Accès à la position refusé. Activez la géolocalisation dans les paramètres du navigateur.
        </p>
      ) : null}
    </div>
  );
}

export function RouteTopologyFieldset({
  form,
  updateField,
}: Pick<ActionLocationInputProps, "form" | "updateField">) {
  return (
    <fieldset className="mt-4 rounded-xl border border-sky-200/80 bg-white p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-sky-900/65">Type de parcours</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          { value: "loop" as const, title: "Boucle", description: "Retour explicite au point de départ." },
          { value: "point_to_point" as const, title: "Départ → arrivée", description: "Arrivée obligatoire, sans retour automatique." },
        ].map((option) => {
          const selected = form.routeTopology === option.value;
          return (
            <label htmlFor={`route-topology-${option.value}`} key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition", selected ? "border-sky-400 bg-sky-50 ring-2 ring-sky-500/15" : "border-slate-200 bg-white hover:border-sky-300")}>
              <input id={`route-topology-${option.value}`} type="radio" name="route-topology" value={option.value} aria-label={option.title} checked={selected} onChange={() => updateField("routeTopology", option.value)} className="mt-1 accent-sky-600" />
              <span><span className="block text-sm font-semibold text-sky-950">{option.title}</span><span className="mt-0.5 block text-xs text-sky-900/60">{option.description}</span></span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function resolveGeometryMethod({
  form,
  manualDrawingSource,
  routePreviewSource,
  gpxImport,
}: Pick<ActionLocationInputProps, "form" | "manualDrawingSource" | "routePreviewSource" | "gpxImport">): ActionGeometryMethod {
  if (form.geometryMethod) return form.geometryMethod;
  if (gpxImport || manualDrawingSource === "gpx_import") return "gpx_import";
  if (manualDrawingSource === "manual") return "manual";
  if (form.operationalRoute) return "generator";
  if (routePreviewSource) return "automatic";
  return "automatic";
}

function GeometryMethodFieldset({
  form,
  updateField,
  manualDrawingSource,
  routePreviewSource,
  gpxImport,
}: Pick<ActionLocationInputProps, "form" | "updateField" | "manualDrawingSource" | "routePreviewSource" | "gpxImport">) {
  const selected = resolveGeometryMethod({ form, manualDrawingSource, routePreviewSource, gpxImport });
  const options: Array<{ value: ActionGeometryMethod; title: string; description: string }> = [
    { value: "automatic", title: "Proposition automatique", description: "Reconstruction serveur sur le réseau piéton quand elle est disponible." },
    { value: "generator", title: "Parcours du générateur", description: "Conserve le parcours opérationnel préparé par le générateur." },
    { value: "manual", title: "Dessin manuel", description: "Déclarez une ligne ou une zone ; aucun routage automatique n’est ajouté." },
    { value: "gpx_import", title: "Import GPX", description: "Conserve les traces importées et leur provenance, sans les recoller." },
    { value: "location_only", title: "Localisation seule", description: "Conserve le point sans fabriquer de parcours." },
  ];
  const hasGeneratorRoute = Boolean(form.operationalRoute?.routes.length);
  const hasGpx = Boolean(gpxImport);

  return (
    <fieldset className="mt-4 rounded-xl border border-emerald-200/80 bg-white p-4">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-900/65">Source du repère cartographique</legend>
      <p className="mt-1 text-xs leading-5 text-emerald-900/60">Ce choix organise l’aperçu. Une trace GPS ou GPX déjà observée reste prioritaire et ne peut pas être remplacée par une reconstruction.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const isSelected = selected === option.value;
          const missingSource =
            (option.value === "generator" && !hasGeneratorRoute) ||
            (option.value === "gpx_import" && !hasGpx);
          return (
            <label htmlFor={`geometry-method-${option.value}`} key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition", isSelected ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500/15" : "border-slate-200 bg-white hover:border-emerald-300")}>
              <input id={`geometry-method-${option.value}`} type="radio" name="geometry-method" value={option.value} aria-label={option.title} checked={isSelected} onChange={() => updateField("geometryMethod", option.value)} className="mt-1 accent-emerald-600" />
              <span><span className="block text-sm font-semibold text-emerald-950">{option.title}</span><span className="mt-0.5 block text-xs text-emerald-900/60">{option.description}</span>{missingSource ? <span className="mt-1 block text-xs font-medium text-amber-700">Source à fournir dans le formulaire.</span> : null}</span>
            </label>
          );
        })}
      </div>
      {selected === "location_only" ? <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">Aucune ligne ne sera construite automatiquement ; la position saisie reste le repère.</p> : null}
      {selected === "gpx_import" && hasGpx ? <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900">Les candidats GPX restent locaux jusqu’à la création et conservent leurs fichiers, segments et erreurs.</p> : null}
    </fieldset>
  );
}

export function ActionLocationInputs({
  form,
  updateField,
  updateFields,
  recordType,
  gpsStatus,
  gpsMessage,
  onAutofillGps,
  manualDrawingSource,
  routePreviewSource,
  gpxImport,
  mode = "all",
}: ActionLocationInputProps) {
  const isCleanPlaceMode = recordType === "clean_place";
  const departureInput = (
    <ActionAddressAutocomplete
      id="departure"
      icon={MapPin}
      label={isCleanPlaceMode ? "Adresse du lieu" : "Départ"}
      placeholder={isCleanPlaceMode ? "Ex : Square des Batignolles" : "Ex : Rue de Rivoli, Paris"}
      value={form.departureLocationLabel}
      onChange={(value, coordinates) => {
        updateFields({
          departureLocationLabel: value,
          latitude: coordinates ? String(coordinates.latitude) : "",
          longitude: coordinates ? String(coordinates.longitude) : "",
        });
      }}
      helperText={isCleanPlaceMode ? "Adresse exacte du lieu" : "Adresse exacte du départ"}
    />
  );

  if (mode === "primary") {
    return <div className="rounded-2xl border border-emerald-200/70 bg-white p-4 shadow-sm">{departureInput}</div>;
  }

  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] p-5 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.18)]">
      <SectionTitle color="bg-sky-500">
        {isCleanPlaceMode ? "Géolocalisation du lieu" : "Localisation de collecte"}
      </SectionTitle>

      <p className="-mt-2 text-xs leading-5 text-emerald-900/50">
        {isCleanPlaceMode
          ? "Indiquez l'adresse du lieu ou utilisez la position actuelle de l'appareil."
          : "Indiquez l'adresse du lieu ou utilisez la position actuelle de l'appareil. Pour une action passée, cette position peut différer du lieu de l'action."}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {mode !== "details" ? departureInput : null}
        <ActionAddressAutocomplete
          id="midpoint"
          icon={MapPin}
          label="Mi-parcours"
          placeholder="Zone intermédiaire (optionnel)"
          value={form.midRouteLocationLabel ?? ""}
          onChange={(value, coordinates) => {
            updateFields({
              midRouteLocationLabel: value,
              midRouteCoordinates: coordinates ?? null,
            });
          }}
          optional
          helperText="Zone intermédiaire de l'action"
        />
        {(isCleanPlaceMode || form.routeTopology === "point_to_point") ? (
          <ActionAddressAutocomplete
            id="arrival"
            icon={Navigation}
            label={isCleanPlaceMode ? "Complément" : "Arrivée"}
            placeholder={isCleanPlaceMode ? "Précision (optionnel)" : "Ex : Place de la République"}
            value={form.arrivalLocationLabel}
            onChange={(value, coordinates) => {
              updateFields({
                arrivalLocationLabel: value,
                arrivalCoordinates: coordinates ?? null,
              });
            }}
            optional={isCleanPlaceMode}
            helperText={isCleanPlaceMode ? "Complément géographique exact" : "Adresse exacte de l’arrivée"}
          />
        ) : null}
      </div>

      {!isCleanPlaceMode ? <RouteTopologyFieldset form={form} updateField={updateField} /> : null}
      {!isCleanPlaceMode ? <GeometryMethodFieldset form={form} updateField={updateField} manualDrawingSource={manualDrawingSource} routePreviewSource={routePreviewSource} gpxImport={gpxImport} /> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GpsButton gpsStatus={gpsStatus} gpsMessage={gpsMessage} onAutofillGps={onAutofillGps} />
        {!isCleanPlaceMode ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-[#ECF8EF] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-emerald-700">Topologie sélectionnée</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-900">
                {form.routeTopology === "point_to_point" ? "Départ → arrivée" : "Boucle · retour au départ"}
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 cmm-text-caption font-black uppercase tracking-[0.16em] text-emerald-700">
              Actif
            </span>
          </div>
        ) : null}
      </div>

      {!isCleanPlaceMode ? (
        <div className="mt-4 rounded-xl border border-sky-200/80 bg-white px-4 py-3">
          <label htmlFor="route-target-distance" className="block text-sm font-semibold text-sky-950">
            Distance cible du parcours (km)
          </label>
          <input
            id="route-target-distance"
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputMode="decimal"
            value={form.routeTargetDistanceKm}
            onChange={(event) => updateField("routeTargetDistanceKm", event.target.value)}
            className="mt-2 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-sky-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 sm:max-w-xs"
          />
          <p className="mt-1 text-xs leading-5 text-sky-800/70">Repère de planification, par défaut 1 km par heure d’action. Modifiable ; il ne mesure pas une distance parcourue.</p>
        </div>
      ) : null}
    </div>
  );
}
