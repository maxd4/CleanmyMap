export const ACTION_VALIDATION_FIELD_IDS: Record<string, string> = {
  organizerType: "action-organizer-type",
  associationName: "action-organizer-structure",
  organizerName: "action-organizer-structure",
  actionDate: "action-action-date",
  locationLabel: "departure",
  arrivalLocationLabel: "arrival",
  manualDrawing: "action-location-geometry",
  gpxImport: "gpx-import",
  wasteKg: "harvest-waste-kg",
  wasteRecyclablesKg: "harvest-waste-recyclables-kg",
  wasteGlassKg: "harvest-waste-glass-kg",
  wasteHouseholdKg: "harvest-waste-household-kg",
  wasteOtherKg: "harvest-waste-other-kg",
  wasteMegotsKg: "harvest-megots-kg",
  cigaretteButtsCount: "harvest-megots-count",
  cigaretteButtsVolumeLiters: "harvest-megots-volume",
  volunteersCount: "action-volunteers-count",
  volunteerParticipation: "action-children-count",
  durationMinutes: "action-duration-minutes",
  eventStartTime: "action-event-start",
  eventEndTime: "action-event-end",
};

export function getActionValidationFieldErrorId(field: string): string {
  return `action-validation-error-${field}`;
}

export function getActionValidationTargetId(field: string): string | null {
  return ACTION_VALIDATION_FIELD_IDS[field] ?? null;
}
