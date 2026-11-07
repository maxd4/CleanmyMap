import type { ActionRecordType } from "@/lib/actions/types";
import { deriveVolunteerCountFromForm } from "@/lib/actions/volunteer-participation";

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
  childrenCount?: string;
  adultCount?: string;
  retiredCount?: string;
  wasteKg: string;
  wasteMegotsKg: string;
};

export function normalizeActionDeclarationExportForm(form: ExportForm): ExportForm {
  const volunteersCount = deriveVolunteerCountFromForm({
    childrenCount: form.childrenCount ?? "",
    adultCount: form.adultCount ?? "",
    retiredCount: form.retiredCount ?? "",
  });

  return {
    ...form,
    volunteersCount: volunteersCount === null ? "" : String(volunteersCount),
  };
}
