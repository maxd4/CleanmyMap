import { validateActionBackup } from "./action-backup-contract.mjs";

export const PUBLIC_ACTION_FICHES = Object.freeze([
  { id: "b1f71234-21e2-4954-8526-f45f238249ae", date: "2026-02-14", file: "2026-02-14-b1f71234-21e2-4954-8526-f45f238249ae.md" },
  { id: "15ee0be8-3747-48c8-9de0-c12b40e79eb9", date: "2026-03-06", file: "2026-03-06-15ee0be8-3747-48c8-9de0-c12b40e79eb9.md" },
  { id: "e168fb7a-034c-4b22-9b5f-b138188bf1e2", date: "2026-03-21", file: "2026-03-21-e168fb7a-034c-4b22-9b5f-b138188bf1e2.md" },
  { id: "da367653-530f-4554-9e9b-164519336f52", date: "2026-04-11", file: "2026-04-11-da367653-530f-4554-9e9b-164519336f52.md" },
  { id: "f92499c2-aa14-4a51-8b56-c835a7d436f6", date: "2026-04-22", file: "2026-04-22-f92499c2-aa14-4a51-8b56-c835a7d436f6.md" },
]);

const PUBLIC_FIELDS = ["id", "action_date", "status", "action_phase", "organizer_type", "organizer_name", "location_label", "volunteers_count", "collectors_count", "waste_kg", "cigarette_butts", "duration_minutes", "published_at"];

export function projectPublicAction(action) {
  const projected = Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, action[field] ?? null]));
  if (typeof projected.id !== "string" || typeof projected.action_date !== "string") throw new Error("Invalid public action identity");
  if (projected.status !== "approved" || projected.action_phase !== "post_action_complete") throw new Error(`Action ${projected.id} is not publicly completed`);
  for (const field of ["volunteers_count", "collectors_count", "waste_kg", "cigarette_butts", "duration_minutes"]) {
    const value = projected[field];
    if (value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`Invalid public field ${field}`);
    if (value !== null) projected[field] = Number(value);
  }
  return projected;
}

function display(value, unit = "") {
  return value === null ? "Inconnu" : `${value}${unit}`;
}

export function renderPublicActionFiche(action) {
  const p = projectPublicAction(action);
  return `<!-- GENERATED from validated Actions backup v2; public whitelist only. -->\n# Action historique — ${p.action_date}\n\n- UUID : \`${p.id}\`\n- Capture : ${p.action_date}\n- État Supabase au snapshot : ${p.status} / ${p.action_phase}\n- Organisateur : ${display(p.organizer_name)}${p.organizer_type ? ` (${p.organizer_type})` : ""}\n- Lieu public : ${display(p.location_label)}\n- Participants : ${display(p.volunteers_count)}\n- Collecteurs : ${display(p.collectors_count)}\n- Masse hors mégots : ${display(p.waste_kg, " kg")}\n- Mégots : ${display(p.cigarette_butts)}\n- Durée : ${display(p.duration_minutes, " min")}\n\nLes champs inconnus restent inconnus. Cette projection ne contient pas les notes, identités, géométries privées, données de préparation, relations, médias ou conversations. Les hypothèses et sources éditoriales sont conservées dans la section historique relue de cette fiche.\n`;
}

export function mergePublicActionSnapshot(existing, generated) {
  const start = "<!-- ACTION_SNAPSHOT_START -->";
  const end = "<!-- ACTION_SNAPSHOT_END -->";
  const block = `${start}\n${generated.trim()}\n${end}`;
  const startIndex = existing.indexOf(start);
  const endIndex = existing.indexOf(end);
  if ((startIndex < 0) !== (endIndex < 0) || (startIndex >= 0 && endIndex < startIndex)) {
    throw new Error("Existing public fiche has malformed generated snapshot markers");
  }
  if (startIndex >= 0) return `${existing.slice(0, startIndex)}${block}${existing.slice(endIndex + end.length)}`;
  return `${existing.trimEnd()}\n\n${block}\n`;
}

export function generatePublicActionFiches(backup) {
  validateActionBackup(backup);
  const rows = new Map(backup.tables.actions.map((action) => [action.id, action]));
  return PUBLIC_ACTION_FICHES.map(({ id, date, file }) => {
    const action = rows.get(id);
    if (!action || action.action_date !== date) throw new Error(`Public action ${id} missing or date mismatch`);
    return { id, file, markdown: renderPublicActionFiche(action) };
  });
}
