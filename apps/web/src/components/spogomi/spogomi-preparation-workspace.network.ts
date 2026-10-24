import type { SpogomiRosterPreview } from "@/lib/spogomi/types";
import type { SpogomiTeamCompositionPreview } from "@/lib/spogomi/preparation-service";
import { parseRosterPreview, parseTeamPreview, parseWorkspaceData } from "./spogomi-preparation-workspace.model";
import type { WorkspaceData } from "./spogomi-preparation-workspace-contract";

export type RosterPreviewOptions = { mapping?: Record<string, string>; sheetName?: string; headerRow?: number; allowIncompatibleMapping?: boolean };

function scopedUrl(url: string, divisionId: string | null): string {
  return divisionId ? `${url}${url.includes("?") ? "&" : "?"}divisionId=${encodeURIComponent(divisionId)}` : url;
}

async function readJsonRecord(response: Response): Promise<Record<string, unknown>> {
  let raw: unknown;
  try { raw = await response.json(); } catch { throw new Error("Le serveur a renvoyé une réponse illisible."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Le serveur a renvoyé une réponse invalide.");
  return raw as Record<string, unknown>;
}

function responseError(body: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof body.error === "string" ? body.error : fallback);
}

export async function fetchWorkspaceData(eventId: string, divisionId: string | null): Promise<WorkspaceData> {
  const response = await fetch(scopedUrl(`/api/spogomi/events/${eventId}`, divisionId), { cache: "no-store" });
  const body = await readJsonRecord(response);
  if (!response.ok) throw responseError(body, "Événement indisponible.");
  const data = parseWorkspaceData(body);
  if (!data) throw new Error("Événement renvoyé dans un format invalide.");
  return data;
}

export async function requestWorkspaceAction(divisionId: string | null, url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(scopedUrl(url, divisionId), init);
  const body = await readJsonRecord(response);
  if (!response.ok) throw responseError(body, "Opération refusée.");
  return body;
}

export async function requestRosterPreview(eventId: string, divisionId: string | null, file: File, options?: RosterPreviewOptions): Promise<SpogomiRosterPreview> {
  const form = new FormData();
  form.set("file", file);
  if (divisionId) form.set("divisionId", divisionId);
  if (options?.mapping) form.set("mapping", JSON.stringify(options.mapping));
  if (options?.sheetName) form.set("sheetName", options.sheetName);
  if (options?.headerRow) form.set("headerRow", String(options.headerRow));
  if (options?.allowIncompatibleMapping) form.set("allowIncompatibleMapping", "true");
  const body = await requestWorkspaceAction(null, `/api/spogomi/events/${eventId}/imports/preview`, { method: "POST", body: form });
  const preview = parseRosterPreview(body);
  if (!preview) throw new Error("Aperçu renvoyé dans un format invalide.");
  return preview;
}

export async function requestTeamPreview(eventId: string, divisionId: string | null): Promise<SpogomiTeamCompositionPreview> {
  const body = await requestWorkspaceAction(divisionId, `/api/spogomi/events/${eventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId }) });
  const preview = parseTeamPreview(body);
  if (!preview) throw new Error("La prévisualisation des équipes est invalide.");
  return preview;
}
