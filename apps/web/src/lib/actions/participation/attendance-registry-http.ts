import type { ActionAttendanceEntryRow } from "@/types/database";

export type AttendanceRegistrySnapshot = {
  actionId: string;
  entries: ActionAttendanceEntryRow[];
  declared: {
    total: number | null;
    adults: number | null;
    retired: number | null;
    children: number | null;
  };
  canMarkPresent: boolean;
};

export type AttendanceRegistryMutationRequest = {
  requestId: string;
  operation: "add" | "rename" | "delete" | "link" | "mark";
  entryId?: string;
  expectedRevision?: number;
  displayLabel?: string;
  clerkUserId?: string;
  attendanceStatus?: "unknown" | "present" | "absent";
};

export class AttendanceRegistryHttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AttendanceRegistryHttpError";
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "Le registre de présence n’a pas pu être mis à jour.";
    throw new AttendanceRegistryHttpError(message, response.status);
  }
  if (!body) throw new AttendanceRegistryHttpError("La réponse du registre est incomplète.", 500);
  return body as T;
}

export function fetchAttendanceRegistry(actionId: string): Promise<AttendanceRegistrySnapshot> {
  return fetch(`/api/actions/${encodeURIComponent(actionId)}/attendance-registry`, { cache: "no-store" })
    .then((response) => readResponse<AttendanceRegistrySnapshot>(response));
}

export function mutateAttendanceRegistry(
  actionId: string,
  mutation: AttendanceRegistryMutationRequest,
): Promise<{ entry: ActionAttendanceEntryRow }> {
  return fetch(`/api/actions/${encodeURIComponent(actionId)}/attendance-registry`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mutation),
  }).then((response) => readResponse<{ entry: ActionAttendanceEntryRow }>(response));
}
