import type { ActionPreparationChecklistItem } from "@/lib/actions/preparation-contract";
import { deriveActionPreparationReadiness } from "@/lib/actions/action-preparation-checklist";
import { ACTION_EQUIPMENT_INVENTORY, ACTION_MATERIAL_SUGGESTIONS } from "@/lib/actions/preparation-contract";
import type { FormState } from "../model";
import { getWasteCategory } from "@/lib/waste";

export type PreparationMoment = "before" | "start" | "during" | "end" | "unassigned";

export const PREPARATION_MOMENTS: ReadonlyArray<{
  id: Exclude<PreparationMoment, "unassigned">;
  label: string;
  description: string;
}> = [
  { id: "before", label: "Avant", description: "Matériel, reconnaissance et informations aux participants." },
  { id: "start", label: "Début", description: "Accueil, rendez-vous, briefing et départ." },
  { id: "during", label: "Pendant", description: "Consignes, organisation et points de vigilance." },
  { id: "end", label: "Fin", description: "Regroupement, déchets, pesée prévue et restitution." },
];

export type PreparationSuggestion = {
  key: string;
  moment: Exclude<PreparationMoment, "unassigned">;
  label: string;
};

export type PreparationMomentContext = Record<Exclude<PreparationMoment, "unassigned">, string[]>;

export function preparationMomentContext(form: FormState): PreparationMomentContext {
  const stock = ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = form.equipmentInventory[option.key];
    if (option.kind === "quantity" && typeof value === "number") return [`${option.label} : ${value}`];
    if (option.kind === "availability" && typeof value === "boolean") return [`${option.label} : ${value ? "annoncé disponible" : "déclaré indisponible"}`];
    return [];
  });
  const suggestedMaterials = form.suggestedMaterials.flatMap((value) => {
    const material = ACTION_MATERIAL_SUGGESTIONS.find((option) => option.value === value);
    return material ? [material.label] : [];
  });
  const expectedWaste = (form.wasteCategories ?? []).flatMap((slug) => {
    const waste = getWasteCategory(slug);
    return waste ? [waste.labels.fr] : [];
  });

  return {
    before: [
      form.recommendedMaterials.trim() ? `À apporter : ${form.recommendedMaterials.trim()}` : null,
      suggestedMaterials.length ? `Suggestions de matériel : ${suggestedMaterials.join(", ")}` : null,
      form.materialsProvided.trim() ? `Déclaré fourni : ${form.materialsProvided.trim()}` : null,
      stock.length ? `Inventaire annoncé : ${stock.join(" · ")}` : null,
      form.participantMessage.trim() ? `Information aux participants : ${form.participantMessage.trim()}` : null,
    ].filter((value): value is string => Boolean(value)),
    start: [
      form.departureLocationLabel.trim() ? `Accueil et rendez-vous : ${form.departureLocationLabel.trim()}` : null,
      `Horaires canoniques : rendez-vous ${form.meetingTime.trim() || "à préciser"} · départ ${form.departureTime.trim() || "à préciser"}`,
      form.accessibilityStatus !== "not_evaluated" ? `Accessibilité : ${form.accessibilityStatus}` : null,
    ].filter((value): value is string => Boolean(value)),
    during: [
      form.safetyInstructions.trim() ? `Consignes opérationnelles : ${form.safetyInstructions.trim()}` : null,
      form.logisticsNotes.trim() ? `Note interne (non transmise aux participants) : ${form.logisticsNotes.trim()}` : null,
    ].filter((value): value is string => Boolean(value)),
    end: [
      expectedWaste.length ? `Déchets attendus : ${expectedWaste.join(", ")}` : null,
      form.equipmentInventory.luggageScaleAvailable === true ? "Pesée : pèse-bagage annoncé disponible" : form.equipmentInventory.luggageScaleAvailable === false ? "Pesée : pèse-bagage déclaré indisponible" : "Pesée : disponibilité du pèse-bagage non renseignée",
      expectedWaste.length ? "Regroupement et restitution à confirmer selon la filière locale." : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

const DEFAULT_MOMENT_BY_KEY: Record<string, Exclude<PreparationMoment, "unassigned">> = {
  materials_checked: "before",
  participants_informed: "before",
  meeting_point_confirmed: "start",
  instructions_shared: "start",
};

const MODE_SUGGESTIONS: Record<string, PreparationSuggestion[]> = {
  fixed_area: [
    { key: "reconnaissance", moment: "before", label: "Reconnaissance de la zone effectuée" },
    { key: "vigilance", moment: "during", label: "Points de vigilance rappelés au groupe" },
    { key: "waste_restitution", moment: "end", label: "Déchets regroupés et restitution prévue" },
    { key: "weighing", moment: "end", label: "Pesée prévue après la collecte" },
  ],
  itinerary: [
    { key: "route_reconnaissance", moment: "before", label: "Parcours et points de sortie reconnus" },
    { key: "route_briefing", moment: "start", label: "Itinéraire et consignes de déplacement présentés" },
    { key: "route_regroup", moment: "during", label: "Point de regroupement intermédiaire rappelé" },
    { key: "route_restitution", moment: "end", label: "Arrivée, regroupement et restitution prévus" },
  ],
  multi_zone: [
    { key: "zones_reconnaissance", moment: "before", label: "Zones et responsables reconnus" },
    { key: "zones_briefing", moment: "start", label: "Briefing commun et répartition des groupes faits" },
    { key: "zones_contact", moment: "during", label: "Moyen de contact et regroupement rappelés" },
    { key: "zones_restitution", moment: "end", label: "Groupes regroupés et déchets restitués" },
  ],
};

function normalizedLabel(label: string): string {
  return label.trim().toLocaleLowerCase("fr-FR");
}

export function preparationMomentForItem(key: string): PreparationMoment {
  const defaultMoment = DEFAULT_MOMENT_BY_KEY[key];
  if (defaultMoment) return defaultMoment;
  const customMoment = key.match(/^custom_(before|start|during|end)_/i)?.[1]?.toLowerCase();
  return customMoment === "before" || customMoment === "start" || customMoment === "during" || customMoment === "end"
    ? customMoment
    : "unassigned";
}

export function preparationChecklistSummary(
  form: Pick<FormState, "preparationChecklist" | "actionDate" | "departureLocationLabel" | "meetingTime" | "departureTime" | "participantMessage" | "safetyInstructions">,
) {
  const readiness = deriveActionPreparationReadiness({
    preparationChecklist: form.preparationChecklist,
    actionDate: form.actionDate,
    pointDeRendezVous: form.departureLocationLabel,
    meetingTime: form.meetingTime,
    departureTime: form.departureTime,
    participantMessage: form.participantMessage,
    safetyInstructions: form.safetyInstructions,
  });
  return {
    confirmed: readiness.confirmedChecks,
    unconfirmed: readiness.unconfirmedChecks,
    missingInformation: readiness.missingInformation,
  };
}

export function contextualPreparationSuggestions(
  form: Pick<FormState, "interventionMode" | "preparationChecklist">,
): PreparationSuggestion[] {
  const mode = form.interventionMode?.mode ?? "fixed_area";
  const existingLabels = new Set(form.preparationChecklist.map((item) => normalizedLabel(item.label)));
  return (MODE_SUGGESTIONS[mode] ?? MODE_SUGGESTIONS.fixed_area).filter(
    (suggestion) => !existingLabels.has(normalizedLabel(suggestion.label)),
  );
}

export function addSuggestedPreparationItem(
  items: ActionPreparationChecklistItem[],
  suggestion: PreparationSuggestion,
): ActionPreparationChecklistItem[] {
  if (items.length >= 12 || items.some((item) => normalizedLabel(item.label) === normalizedLabel(suggestion.label))) {
    return items;
  }
  const prefix = `custom_${suggestion.moment}_`;
  let index = 1;
  while (items.some((item) => item.key === `${prefix}${index}`)) index += 1;
  return [...items, { key: `${prefix}${index}`, label: suggestion.label, checked: false }];
}
