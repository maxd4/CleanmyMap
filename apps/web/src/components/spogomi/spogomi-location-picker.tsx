"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin } from "lucide-react";
import type { ActionLocationCoordinates } from "@/lib/actions/types";
import { ActionAddressAutocomplete } from "@/components/actions/action-declaration/action-address-autocomplete";

const SpogomiLocationMap = dynamic(
  () => import("./spogomi-location-map").then((module) => module.SpogomiLocationMap),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-2xl bg-emerald-50 sm:h-[320px]" aria-label="Chargement de la carte" /> },
);

export function SpogomiLocationPicker({
  value,
  coordinates,
  onChange,
  error,
}: {
  value: string;
  coordinates: ActionLocationCoordinates | null;
  onChange: (value: string, coordinates: ActionLocationCoordinates | null) => void;
  error?: readonly string[];
}) {
  const googleMapsHref = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : null;

  return (
    <fieldset className="space-y-3 md:col-span-2" aria-describedby={error?.length ? "spogomi-create-locationLabel-error" : "spogomi-create-location-help"}>
      <legend className="sr-only">Localisation de la compétition</legend>
      <ActionAddressAutocomplete
        id="spogomi-create-locationLabel"
        name="locationLabel"
        label="Lieu"
        placeholder="Recherchez une adresse ou collez un lien Google Maps"
        value={value}
        required
        onChange={(nextValue, nextCoordinates) => onChange(nextValue, nextCoordinates ?? null)}
        helperText="Sélectionnez une adresse précise pour placer la compétition"
        ariaInvalid={Boolean(error?.length)}
        ariaDescribedBy={error?.length ? "spogomi-create-locationLabel-error" : "spogomi-create-location-help"}
      />
      <p id="spogomi-create-location-help" className="flex items-start gap-2 text-xs font-medium text-emerald-900/65">
        <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
        Un libellé seul ne suffit pas : confirmez une adresse, utilisez un lien Google Maps ou choisissez le point sur la carte.
      </p>
      <SpogomiLocationMap coordinates={coordinates} onSelect={(nextCoordinates) => onChange(value, nextCoordinates)} />
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        <output className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-950">
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-emerald-800/65">Latitude</span>
          <span className="mt-1 block font-mono font-semibold">{coordinates ? coordinates.latitude.toFixed(7) : "À sélectionner"}</span>
        </output>
        <output className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-950">
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-emerald-800/65">Longitude</span>
          <span className="mt-1 block font-mono font-semibold">{coordinates ? coordinates.longitude.toFixed(7) : "À sélectionner"}</span>
        </output>
      </div>
      {googleMapsHref ? (
        <a href={googleMapsHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          Ouvrir ce point dans Google Maps <ExternalLink size={15} aria-hidden="true" />
        </a>
      ) : null}
      {error?.length ? <div id="spogomi-create-locationLabel-error" className="text-sm font-semibold text-red-700"><ul className="list-disc pl-5">{error.map((message) => <li key={message}>{message}</li>)}</ul></div> : null}
    </fieldset>
  );
}
