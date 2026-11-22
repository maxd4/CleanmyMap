import { CmmField, CmmInput, CmmTextarea } from "@/components/ui/cmm-field";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  ACTION_EQUIPMENT_INVENTORY,
  ACTION_REFRESHMENT_OPTIONS,
  type ActionEquipmentInventory,
  type ActionEquipmentQuantityKey,
} from "@/lib/actions/preparation-contract";
import {
  actionChecklistProvenanceLabel,
  deriveActionVolunteerChecklist,
  type ActionVolunteerChecklist,
} from "@/lib/actions/action-preparation-checklist";
import type { BaseSectionProps } from "./section-contract";
import { PreparationMaterialFields } from "./preparation-material-fields";
import { characterLimitError, characterLimitHint, PREPARATION_FIELD_LIMITS } from "./preparation-field-utils";
import {
  createActionPreparationWeatherRequest,
  useActionPreparationWeather,
} from "../../use-action-preparation-weather";

const quantityOptions = ACTION_EQUIPMENT_INVENTORY.filter(
  (option): option is Extract<(typeof ACTION_EQUIPMENT_INVENTORY)[number], { kind: "quantity" }> => option.kind === "quantity",
);
const availabilityOptions = ACTION_EQUIPMENT_INVENTORY.filter(
  (option): option is Extract<(typeof ACTION_EQUIPMENT_INVENTORY)[number], { kind: "availability" }> => option.kind === "availability",
);

type ChecklistItem = ActionVolunteerChecklist["toBring"][number];

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

function inventoryStatusLines(inventory: ActionEquipmentInventory): string[] {
  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    if (option.kind === "quantity") {
      if (typeof value !== "number") return [];
      return [value === 0 ? `${option.label} : aucune unité annoncée` : `${option.label} : ${value}`];
    }
    if (typeof value !== "boolean") return [];
    return [`${option.label} : ${value ? "disponible" : "non disponible"}`];
  });
}

function ChecklistLines({
  values,
  empty,
}: {
  values: ChecklistItem[];
  empty: string;
}) {
  return values.length > 0
    ? <ul className="mt-2 space-y-2 text-sm text-sky-950">{values.map((value) => <li key={value.key}><span className="font-semibold">{value.label}</span>{value.detail ? <span className="block cmm-text-caption text-sky-800">{value.detail}</span> : null}<span className="block cmm-text-caption text-sky-700">Source : {value.provenance.map(actionChecklistProvenanceLabel).join(", ")}</span></li>)}</ul>
    : <p className="mt-2 text-sm text-slate-700">{empty}</p>;
}

function EquipmentSummary({
  staffing,
  inventoryLines,
  insufficiencies,
}: {
  staffing: ActionVolunteerChecklist["staffing"];
  inventoryLines: string[];
  insufficiencies: string[];
}) {
  const knownInventoryCount = inventoryLines.length;

  return (
    <section aria-label="Synthèse de l’inventaire" className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3" data-testid="preparation-equipment-summary">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="cmm-text-caption font-bold uppercase tracking-wide text-sky-800">Effectif prévu</dt>
          <dd className="mt-1 text-sm font-semibold text-sky-950">{staffing.source === "unknown" ? "Non renseigné" : staffing.label}</dd>
        </div>
        <div>
          <dt className="cmm-text-caption font-bold uppercase tracking-wide text-sky-800">Équipements renseignés</dt>
          <dd className="mt-1 text-sm font-semibold text-sky-950">{knownInventoryCount}/{ACTION_EQUIPMENT_INVENTORY.length}</dd>
        </div>
      </dl>
      {inventoryLines.length > 0 ? <p className="mt-2 text-sm leading-5 text-sky-950">{inventoryLines.join(" · ")}</p> : <p className="mt-2 text-sm text-sky-800">Aucun équipement déclaré dans l’inventaire.</p>}
      <div className="mt-3 border-t border-sky-200 pt-3">
        <p className="cmm-text-caption font-bold uppercase tracking-wide text-sky-800">Insuffisances calculables</p>
        {insufficiencies.length > 0
          ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-950">{insufficiencies.map((item) => <li key={item}>{item}</li>)}</ul>
          : <p className="mt-1 text-sm text-sky-950">Aucune insuffisance calculable actuellement. Le manque de gants n’est évalué que si l’effectif et le stock sont connus.</p>}
      </div>
    </section>
  );
}

export function PreparationEquipmentFields({ form, updateField }: BaseSectionProps) {
  const providedMaterialsError = characterLimitError(form.materialsProvided, "Le matériel fourni", PREPARATION_FIELD_LIMITS.materialsProvided);
  const weatherRequest = createActionPreparationWeatherRequest({
    actionDate: form.actionDate,
    scheduledStartTime: form.eventStartTime || form.departureTime || form.meetingTime,
    scheduledEndTime: form.eventEndTime,
    latitude: form.latitude,
    longitude: form.longitude,
    timeZone: form.actionTimezone,
  });
  const weather = useActionPreparationWeather({
    contextId: null,
    request: weatherRequest,
    initialWeatherContext: form.routeCalibrationContext?.plannerSnapshot?.weatherContext ?? null,
  });
  const parsedVolunteersExpected = Number(form.volunteersCount.trim());
  const volunteersExpected = form.volunteersCount.trim() !== "" &&
    Number.isInteger(parsedVolunteersExpected) && parsedVolunteersExpected >= 0
    ? parsedVolunteersExpected
    : undefined;
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
    weatherState: weather.weatherState,
  });
  const inventoryLines = inventoryStatusLines(form.equipmentInventory);
  const wasteRecommendations = volunteerChecklist.toBring.filter((item) => item.provenance.includes("waste_catalog"));

  return (
    <div className="space-y-4" data-testid="preparation-equipment-fields">
      <section aria-labelledby="before-materials-bring-title" className="space-y-3">
        <h3 id="before-materials-bring-title" className="text-sm font-bold text-emerald-950">À apporter</h3>
        <PreparationMaterialFields form={form} updateField={updateField} />
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3" data-testid="preparation-waste-recommendations">
          <p className="cmm-text-caption font-bold uppercase tracking-wide text-emerald-800">Conseils liés aux déchets attendus</p>
          <ChecklistLines values={wasteRecommendations} empty={form.wasteCategories?.length ? "Aucun conseil matériel supplémentaire pour les catégories choisies." : "Renseignez les catégories attendues pour afficher les conseils du catalogue."} />
        </div>
      </section>

      <section aria-labelledby="before-materials-provided-title" className="space-y-3 border-t border-slate-200 pt-4">
        <h3 id="before-materials-provided-title" className="text-sm font-bold text-sky-950">Fourni sur place</h3>
        <CmmField id="before-materials-provided" label="Matériel ou contribution annoncée sur place" hint={`Décrivez l’apport annoncé par l’organisateur ou un partenaire ; ce texte reste distinct des quantités déclarées dans l’inventaire. ${characterLimitHint(form.materialsProvided, PREPARATION_FIELD_LIMITS.materialsProvided)}`} error={providedMaterialsError}>
          <CmmTextarea value={form.materialsProvided} onChange={(event) => updateField("materialsProvided", event.target.value)} rows={2} maxLength={PREPARATION_FIELD_LIMITS.materialsProvided} placeholder="Ex. Sacs renforcés disponibles au point de rendez-vous..." />
        </CmmField>
      </section>

      <section aria-labelledby="before-equipment-inventory-title" className="space-y-3 border-t border-slate-200 pt-4">
        <h3 id="before-equipment-inventory-title" className="text-sm font-bold text-sky-950">Inventaire</h3>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-emerald-950">Équipements quantifiables</legend>
          <p className="text-sm leading-5 text-slate-700">Valeur vide = inconnu · 0 = absence déclarée · quantité positive = stock annoncé.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {quantityOptions.map((option) => {
              const value = form.equipmentInventory[option.key];
              return (
                <CmmField key={option.key} id={`before-equipment-${option.key}`} label={option.label} hint="Entier de 0 à 10 000.">
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
        <EquipmentSummary staffing={volunteerChecklist.staffing} inventoryLines={inventoryLines} insufficiencies={volunteerChecklist.insufficiencies} />
      </section>

      <section aria-labelledby="before-refreshments-title" className="space-y-3 border-t border-slate-200 pt-4">
        <h3 id="before-refreshments-title" className="text-sm font-bold text-sky-950">Convivialité</h3>
        <p className="text-sm text-slate-700">Prestations annoncées séparément du stock d’équipements.</p>
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
      </section>

      <section aria-labelledby="before-weather-recommendations-title" className="space-y-2 border-t border-slate-200 pt-4" data-testid="preparation-weather-recommendations">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="before-weather-recommendations-title" className="text-sm font-bold text-sky-950">Conseils selon la météo</h3>
          {volunteerChecklist.weatherMessage ? <span className="cmm-text-caption font-semibold text-sky-800">Source : prévision météo · {volunteerChecklist.weatherMessage}</span> : null}
        </div>
        {volunteerChecklist.weatherState === "success"
          ? <ChecklistLines values={volunteerChecklist.weatherRecommendations} empty="Aucune recommandation météo supplémentaire pour ce créneau." />
          : <div className="space-y-2"><p className="text-sm text-slate-700">{weather.weatherState === "idle" ? "Prévisions non consultées." : weather.weatherState === "loading" ? "Analyse des prévisions en cours…" : "Prévisions indisponibles ; cela ne bloque pas la préparation."}</p><CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ weather.requestWeather(); }} disabled={weather.weatherState === "loading"} aria-busy={weather.weatherState === "loading"}>Voir les recommandations météo</CmmButton></div>}
      </section>
    </div>
  );
}
