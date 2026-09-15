import type { ActionRow } from "@/types/database";

export function normalizeStoredAction(row: ActionRow): ActionRow {
  return {
    ...row,
    department_code: row.department_code ?? null,
    department_name: row.department_name ?? null,
    waste_kg: normalizeNullableStoredNumber(row.waste_kg),
    cigarette_butts: normalizeNullableStoredNumber(row.cigarette_butts),
    volunteers_count: Number(row.volunteers_count ?? 0),
    duration_minutes: Number(row.duration_minutes ?? 0),
    action_phase: row.action_phase ?? "post_action_complete",
    preparation_data: (row.preparation_data ?? {}) as ActionRow["preparation_data"],
  };
}

function normalizeNullableStoredNumber(value: number | null): number | null {
  return value === null || !Number.isFinite(Number(value)) ? null : Number(value);
}
