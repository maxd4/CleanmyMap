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
