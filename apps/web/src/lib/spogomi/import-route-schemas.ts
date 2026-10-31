import { z } from "zod";

const spogomiImportMappingSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  participantLastName: z.string().min(1).max(255).optional(),
  participantFirstName: z.string().min(1).max(255).optional(),
  group: z.string().min(1).max(255).optional(),
  sourceRowId: z.string().min(1).max(255).optional(),
  ticketReference: z.string().min(1).max(255).optional(),
  orderReference: z.string().min(1).max(255).optional(),
  orderAlternativeReference: z.string().min(1).max(255).optional(),
  ticketStatus: z.string().min(1).max(255).optional(),
  ticketDeleted: z.string().min(1).max(255).optional(),
}).strict();

export function parseSpogomiImportMapping(value: FormDataEntryValue | null) {
  if (value === null) return { ok: true as const, mapping: undefined };
  if (typeof value !== "string") return { ok: false as const };
  try {
    const parsed = spogomiImportMappingSchema.safeParse(JSON.parse(value));
    return parsed.success ? { ok: true as const, mapping: parsed.data } : { ok: false as const };
  } catch {
    return { ok: false as const };
  }
}

function readOptionalText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readSpogomiRosterImportForm(form: FormData) {
  return {
    file: form.get("file"),
    mappingResult: parseSpogomiImportMapping(form.get("mapping")),
    divisionId: readOptionalText(form, "divisionId"),
    sheetName: readOptionalText(form, "sheetName"),
    headerRow: readOptionalText(form, "headerRow"),
    acceptedRowNumbers: readOptionalText(form, "acceptedRowNumbers"),
    allowIncompatibleMapping: form.get("allowIncompatibleMapping") === "true",
  };
}
