import { createInitialFormState } from "./payload";

export function buildBaseForm() {
  const form = createInitialFormState("Alice");
  form.locationLabel = "Jardin du Luxembourg";
  form.latitude = "48.8462";
  form.longitude = "2.3372";
  form.wasteKg = "12.7";
  form.wasteMegotsKg = "1.5";
  form.wasteMegotsCondition = "propre";
  form.volunteersCount = "5";
  form.durationMinutes = "75";
  form.notes = "Collecte de test";
  form.routeAdjustmentMessage = "Éviter l'avenue principale";
  form.organizerType = "association";
  return form;
}
