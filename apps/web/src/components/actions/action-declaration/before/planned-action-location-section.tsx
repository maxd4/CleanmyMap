import { CheckCircle2, Info, Navigation } from "lucide-react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import { ActionFormDisclosureSummary } from "../action-form-disclosure-summary";
import { ActionAddressAutocomplete } from "../action-address-autocomplete";
import { OperationalRouteEditor } from "../operational-route-editor";
import type { FormState } from "../model";
import { cn } from "@/lib/utils";
import { hasValidationIssue, RequiredMark, type BaseSectionProps } from "./section-contract";

export function PlannedActionLocationSection({
  form,
  updateField,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  const hasConfirmedCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);

  return (
    <section aria-labelledby="before-action-location" className="space-y-3">
      <SectionHeading id="before-action-location" title="Localisation et parcours" />
      <div className="grid gap-4 lg:grid-cols-2">
        <CmmField id="before-commune-zone" label="Commune ou secteur d’intervention" hint="Secteur principal, indépendant du rendez-vous et de l’arrivée.">
          <CmmInput
            type="text"
            value={form.communeZoneLabel}
            onChange={(event) => updateField("communeZoneLabel", event.target.value)}
            placeholder="Ex. Paris 15e, berges nord"
          />
        </CmmField>
        <MeetingLocationFields
          form={form}
          updateField={updateField}
          updateFields={updateFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationIssueFields={validationIssueFields}
        />
      </div>
      <RouteDestinationField
        form={form}
        updateField={updateField}
        updateFields={updateFields}
        hasAttemptedSubmit={hasAttemptedSubmit}
        validationIssueFields={validationIssueFields}
      />
      {form.operationalRoute ? (
        <CmmDisclosure summary={<ActionFormDisclosureSummary label="Parcours existant" detail="parcours calculé conservé" />} tone="emerald" size="sm">
          <p className="mb-3 text-sm text-emerald-900/70">Le parcours calculé par le planificateur est repris ici sans nouvelle géométrie.</p>
          <OperationalRouteEditor operationalRoute={form.operationalRoute} onChange={(operationalRoute) => updateField("operationalRoute", operationalRoute)} />
        </CmmDisclosure>
      ) : null}
      <CmmDisclosure summary={<ActionFormDisclosureSummary label="Options avancées" detail={hasConfirmedCoordinates ? "coordonnées renseignées" : "coordonnées facultatives"} />} tone="emerald" size="sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <CmmField id="before-latitude" label="Latitude">
            <CmmInput type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} placeholder="Latitude" />
          </CmmField>
          <CmmField id="before-longitude" label="Longitude">
            <CmmInput type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} placeholder="Longitude" />
          </CmmField>
        </div>
      </CmmDisclosure>
    </section>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return <h4 id={id} className="text-base font-black text-emerald-950">{title}</h4>;
}

export function hasValidCoordinatePair(latitude: string, longitude: string): boolean {
  if (!latitude.trim() || !longitude.trim()) return false;
  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  return Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90 && Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180;
}

export function MeetingLocationFields({
  form,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  const missingDeparture = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "departureLocationLabel"));
  const hasConfirmedCoordinates = hasValidCoordinatePair(form.latitude, form.longitude);
  const hasFreeAddress = form.departureLocationLabel.trim().length > 0;
  const updateDepartureLocation = (value: string, coordinates?: FormState["midRouteCoordinates"]) => {
    updateFields?.({
      departureLocationLabel: value,
      locationLabel: value,
      latitude: coordinates ? String(coordinates.latitude) : "",
      longitude: coordinates ? String(coordinates.longitude) : "",
    });
  };

  return (
    <div className="space-y-2">
      <ActionAddressAutocomplete
        id="before-departure-location"
        label="Point de rendez-vous précis"
        placeholder="Ex. Entrée principale, côté métro"
        value={form.departureLocationLabel}
        onChange={updateDepartureLocation}
        helperText="Adresse exacte du rendez-vous"
        ariaInvalid={missingDeparture}
        ariaDescribedBy={missingDeparture ? "before-departure-location-error" : "before-location-status"}
      />
      {missingDeparture ? <span id="before-departure-location-error" className="block text-xs font-medium text-rose-700">Indiquez le point de rendez-vous avant d’enregistrer.</span> : null}
      <p id="before-location-status" role="status" className={cn("flex items-center gap-1.5 px-1 text-xs", hasConfirmedCoordinates ? "text-emerald-700" : hasFreeAddress ? "text-amber-700" : "text-emerald-900/50")}>
        {hasConfirmedCoordinates ? <CheckCircle2 size={13} aria-hidden="true" /> : <Info size={13} aria-hidden="true" />}
        <span>{hasConfirmedCoordinates ? "Localisation confirmée · coordonnées conservées" : hasFreeAddress ? "Adresse libre non géolocalisée · l’entrée ou le repère est conservé sans coordonnées" : "Localisation à préciser"}</span>
      </p>
    </div>
  );
}

export function RouteDestinationField({
  form,
  updateFields,
  hasAttemptedSubmit,
  validationIssueFields,
}: BaseSectionProps) {
  if (form.routeTopology !== "point_to_point") {
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-sky-200/70 bg-sky-50/70 px-4 py-3 text-xs leading-5 text-sky-900/75 md:col-span-2">
        <Navigation size={15} className="mt-0.5 shrink-0 text-sky-700" aria-hidden="true" />
        <span><strong>Boucle :</strong> le secteur d’intervention reste celui indiqué ci-dessus ; aucun point d’arrivée distinct n’est fabriqué.</span>
      </p>
    );
  }

  const missingArrival = Boolean(hasAttemptedSubmit && hasValidationIssue(validationIssueFields, "arrivalLocationLabel"));
  return (
    <div className="space-y-2 md:col-span-2">
      <ActionAddressAutocomplete
        id="before-arrival-location"
        label={<span>Arrivée<RequiredMark /></span>}
        placeholder="Ex. Place de la République"
        value={form.arrivalLocationLabel}
        onChange={(value, coordinates) => updateFields?.({ arrivalLocationLabel: value, arrivalCoordinates: coordinates ?? null })}
        helperText="Adresse exacte de l’arrivée"
        ariaInvalid={missingArrival}
        ariaDescribedBy={missingArrival ? "before-arrival-location-error" : undefined}
      />
      {missingArrival ? <span id="before-arrival-location-error" className="block px-1 text-xs font-medium text-rose-700">Indiquez l’arrivée pour un parcours départ → arrivée.</span> : null}
    </div>
  );
}
