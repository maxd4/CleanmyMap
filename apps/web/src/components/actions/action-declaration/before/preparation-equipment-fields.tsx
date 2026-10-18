import { CmmCard } from "@/components/ui/cmm-card";
import { CmmField, CmmInput } from "@/components/ui/cmm-field";
import {
  ACTION_EQUIPMENT_INVENTORY,
  ACTION_MATERIAL_SUGGESTIONS,
  ACTION_REFRESHMENT_OPTIONS,
  isActionEquipmentProvided,
  type ActionEquipmentQuantityKey,
  type ActionRefreshmentsProvided,
} from "@/lib/actions/preparation-contract";
import type { ActionEquipmentInventory } from "@/lib/actions/preparation-contract";
import { deriveActionVolunteerChecklist, actionChecklistProvenanceLabel } from "@/lib/actions/action-preparation-checklist";
import type { BaseSectionProps } from "./section-contract";
import { useActionPreparationWeather } from "../../use-action-preparation-weather";

const quantityOptions = ACTION_EQUIPMENT_INVENTORY.filter(
  (option): option is Extract<(typeof ACTION_EQUIPMENT_INVENTORY)[number], { kind: "quantity" }> => option.kind === "quantity",
);
const availabilityOptions = ACTION_EQUIPMENT_INVENTORY.filter(
  (option): option is Extract<(typeof ACTION_EQUIPMENT_INVENTORY)[number], { kind: "availability" }> => option.kind === "availability",
);

function updateQuantity(
  inventory: ActionEquipmentInventory,
  key: ActionEquipmentQuantityKey,
  value: string,
): ActionEquipmentInventory {
  const next = { ...inventory };
  if (value.trim() === "") {
    delete next[key];
  } else {
    next[key] = Number(value);
  }
  return next;
}

function updateAvailability(
  inventory: ActionEquipmentInventory,
  key: keyof ActionEquipmentInventory,
  checked: boolean,
): ActionEquipmentInventory {
  return { ...inventory, [key]: checked };
}

function declaredEquipmentLines(inventory: ActionEquipmentInventory): string[] {
  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    if (!isActionEquipmentProvided(option, value)) return [];
    if (option.kind === "quantity") return [`${option.label} : ${value}`];
    return [option.label];
  });
}

function explicitlyUnavailableEquipmentLines(inventory: ActionEquipmentInventory): string[] {
  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    return option.kind === "quantity" && value === 0
      ? [`${option.label} : aucune unité fournie`]
      : [];
  });
}

function declaredRefreshmentLines(refreshments: ActionRefreshmentsProvided): string[] {
  return ACTION_REFRESHMENT_OPTIONS.flatMap((option) => refreshments[option.key] ? [option.label] : []);
}

export function PreparationEquipmentFields({ form, updateField }: BaseSectionProps) {
  const inventoryLines = declaredEquipmentLines(form.equipmentInventory);
  const unavailableEquipmentLines = explicitlyUnavailableEquipmentLines(form.equipmentInventory);
  const refreshmentLines = declaredRefreshmentLines(form.refreshmentsProvided);
  const weather = useActionPreparationWeather({
    actionDate: form.actionDate,
    scheduledStartTime: form.eventStartTime || form.departureTime || form.meetingTime,
    scheduledEndTime: form.eventEndTime,
    latitude: form.latitude,
    longitude: form.longitude,
  });
  const parsedVolunteersExpected = Number(form.volunteersCount.trim());
  const volunteersExpected = form.volunteersCount.trim() !== "" &&
    Number.isInteger(parsedVolunteersExpected) && parsedVolunteersExpected >= 0
    ? parsedVolunteersExpected
    : undefined;
  const recommendedLines = [
    form.recommendedMaterials.trim() ? form.recommendedMaterials.trim() : null,
    form.suggestedMaterials.length > 0
      ? `Suggestions : ${form.suggestedMaterials.flatMap((value) => {
          const option = ACTION_MATERIAL_SUGGESTIONS.find((candidate) => candidate.value === value);
          return option ? [option.label] : [];
        }).join(", ")}`
      : null,
  ].filter((value): value is string => Boolean(value));
  const volunteerChecklist = deriveActionVolunteerChecklist({
    preparation: {
      recommendedMaterials: form.recommendedMaterials,
      materialsProvided: form.materialsProvided,
      suggestedMaterials: form.suggestedMaterials,
      equipmentInventory: form.equipmentInventory,
      refreshmentsProvided: form.refreshmentsProvided,
      expectedWasteCategories: form.wasteCategories,
      routeCalibrationContext: form.routeCalibrationContext ?? undefined,
      ...(volunteersExpected !== undefined ? { volunteersExpected } : {}),
    },
    weatherContext: weather.weatherContext,
    weatherRequest: weather.weatherRequest,
  });
  const checklistLines = (values: typeof volunteerChecklist.toBring) => values.length > 0
    ? <ul className="mt-2 space-y-2 text-sm text-sky-950">{values.map((value) => <li key={value.key}><span className="font-semibold">{value.label}</span>{value.detail ? <span className="block text-xs text-sky-800">{value.detail}</span> : null}<span className="block text-xs text-sky-700">Source : {value.provenance.map(actionChecklistProvenanceLabel).join(", ")}</span></li>)}</ul>
    : <p className="mt-2 text-sm text-sky-900/70">Aucun élément calculé.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="preparation-equipment-fields">
      <div className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-emerald-950">Équipements quantifiables</legend>
          <p className="text-xs leading-5 text-emerald-900/70">Laissez vide si la quantité n’est pas renseignée. La valeur 0 signifie explicitement absent.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {quantityOptions.map((option) => {
              const value = form.equipmentInventory[option.key];
              return (
                <CmmField
                  key={option.key}
                  id={`before-equipment-${option.key}`}
                  label={option.label}
                  hint="Entier de 0 à 10 000."
                >
                  <CmmInput
                    type="number"
                    min={0}
                    max={10_000}
                    step={1}
                    inputMode="numeric"
                    value={value === undefined ? "" : String(value)}
                    onChange={(event) => updateField("equipmentInventory", updateQuantity(form.equipmentInventory, option.key, event.target.value))}
                  />
                </CmmField>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-emerald-950">Équipements collectifs</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {availabilityOptions.map((option) => (
              <label key={option.key} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-sm font-medium text-emerald-950">
                <input
                  type="checkbox"
                  checked={form.equipmentInventory[option.key] === true}
                  onChange={(event) => updateField("equipmentInventory", updateAvailability(form.equipmentInventory, option.key, event.target.checked))}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-emerald-950">Convivialité</legend>
          <p className="text-xs leading-5 text-emerald-900/70">Ces annonces sont indépendantes : l’eau pendant l’action ne vaut pas annonce de boissons ou de collation après.</p>
          <div className="grid gap-2">
            {ACTION_REFRESHMENT_OPTIONS.map((option) => (
              <label key={option.key} className="flex min-h-11 items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-sm font-medium text-emerald-950">
                <input
                  type="checkbox"
                  checked={form.refreshmentsProvided[option.key] === true}
                  onChange={(event) => updateField("refreshmentsProvided", { ...form.refreshmentsProvided, [option.key]: event.target.checked })}
                  className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <CmmCard tone="sky" variant="muted" size="md" data-testid="preparation-equipment-preview">
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-black uppercase tracking-[0.12em] text-sky-900">Aperçu déclaré</h5>
            <p className="mt-1 text-xs leading-5 text-sky-900/75">Lecture seule : seules les informations annoncées aux bénévoles sont reprises.</p>
          </div>
          <div>
            <h6 className="text-sm font-bold text-sky-950">Équipements fournis</h6>
            {inventoryLines.length > 0 ? <ul className="mt-2 space-y-1 text-sm text-sky-950">{inventoryLines.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-2 text-sm text-sky-900/70">Aucun équipement fourni.</p>}
          </div>
          {unavailableEquipmentLines.length > 0 ? <div>
            <h6 className="text-sm font-bold text-sky-950">Équipements explicitement non fournis</h6>
            <ul className="mt-2 space-y-1 text-sm text-sky-900/80">{unavailableEquipmentLines.map((line) => <li key={line}>{line}</li>)}</ul>
          </div>
          : null}
          <div>
            <h6 className="text-sm font-bold text-sky-950">Convivialité</h6>
            {refreshmentLines.length > 0 ? <ul className="mt-2 space-y-1 text-sm text-sky-950">{refreshmentLines.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-2 text-sm text-sky-900/70">Aucune prestation renseignée.</p>}
          </div>
          <div>
            <h6 className="text-sm font-bold text-sky-950">Matériel actuellement conseillé</h6>
            {recommendedLines.length > 0 ? <ul className="mt-2 space-y-1 text-sm text-sky-950">{recommendedLines.map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-2 text-sm text-sky-900/70">Aucun complément renseigné.</p>}
          </div>
          <div className="border-t border-sky-100 pt-4" data-testid="preparation-volunteer-checklist">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h6 className="text-sm font-bold text-sky-950">Checklist bénévole calculée</h6><span className="text-xs font-semibold text-sky-800">{weather.weatherLoading ? "Prévisions météo en cours de récupération" : volunteerChecklist.weatherMessage}</span></div>
            <p className="mt-1 text-xs leading-5 text-sky-900/75">{volunteerChecklist.staffing.label}. Les données se recalculent sans modifier la checklist interne.</p>
            <div className="mt-3 space-y-3">
              <div><p className="text-xs font-black uppercase tracking-wide text-sky-700">À apporter</p>{checklistLines(volunteerChecklist.toBring)}</div>
              <div><p className="text-xs font-black uppercase tracking-wide text-sky-700">Recommandé selon la météo</p>{checklistLines(volunteerChecklist.weatherRecommendations)}</div>
              <div><p className="text-xs font-black uppercase tracking-wide text-sky-700">Fourni par l’organisateur</p>{checklistLines(volunteerChecklist.provided)}</div>
            </div>
          </div>
        </div>
      </CmmCard>
    </div>
  );
}
