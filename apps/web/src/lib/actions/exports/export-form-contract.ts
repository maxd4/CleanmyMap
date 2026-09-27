import type { ActionRecordType } from "@/lib/actions/types";

/**
 * The export domain's narrow view of the declaration form.
 *
 * FormState remains owned by the UI parcours. This contract contains only the
 * values consumed by local PDF, image, bundle and export-history modules.
 */
export type ExportForm = {
  actionDate: string;
  arrivalLocationLabel: string;
  associationName: string;
  departureLocationLabel: string;
  durationMinutes: string;
  latitude: string;
  locationLabel: string;
  longitude: string;
  notes: string;
  placeType: string;
  recordType: ActionRecordType;
  volunteersCount: string;
  wasteKg: string;
  wasteMegotsKg: string;
};
