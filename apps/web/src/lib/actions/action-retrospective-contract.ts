import { z } from "zod";

export const ACTION_RETROSPECTIVE_LIMITS = {
  thanksMessage: 500,
  workedWell: 1000,
  blockers: 1000,
  improveNextTime: 1000,
} as const;

export const actionRetrospectiveDraftSchema = z.object({
  thanksMessage: z.string().max(ACTION_RETROSPECTIVE_LIMITS.thanksMessage).nullable().optional(),
  workedWell: z.string().max(ACTION_RETROSPECTIVE_LIMITS.workedWell).nullable().optional(),
  blockers: z.string().max(ACTION_RETROSPECTIVE_LIMITS.blockers).nullable().optional(),
  improveNextTime: z.string().max(ACTION_RETROSPECTIVE_LIMITS.improveNextTime).nullable().optional(),
}).strict();

export type ActionRetrospectiveDraftInput = z.infer<typeof actionRetrospectiveDraftSchema>;

export type ActionRetrospectivePublic = {
  thanksMessage: string | null;
  workedWell: string | null;
  blockers: string | null;
  improveNextTime: string | null;
  publishedAt: string;
  updatedAt: string;
};

export type ActionRetrospectiveEditor = Omit<ActionRetrospectivePublic, "publishedAt"> & {
  publishedAt: string | null;
};

function normalizeActionRetrospectiveText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.replace(/\s+/gu, " ").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeActionRetrospectiveDraft(
  input: ActionRetrospectiveDraftInput,
): ActionRetrospectiveDraftInput {
  return {
    thanksMessage: normalizeActionRetrospectiveText(input.thanksMessage),
    workedWell: normalizeActionRetrospectiveText(input.workedWell),
    blockers: normalizeActionRetrospectiveText(input.blockers),
    improveNextTime: normalizeActionRetrospectiveText(input.improveNextTime),
  };
}

export function isActionRetrospectivePublic(
  value: unknown,
): value is ActionRetrospectivePublic {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.publishedAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    ["thanksMessage", "workedWell", "blockers", "improveNextTime"].every(
      (key) => candidate[key] === null || typeof candidate[key] === "string",
    );
}

export function isActionRetrospectiveEditor(
  value: unknown,
): value is ActionRetrospectiveEditor {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (candidate.publishedAt === null || typeof candidate.publishedAt === "string") &&
    typeof candidate.updatedAt === "string" &&
    ["thanksMessage", "workedWell", "blockers", "improveNextTime"].every(
      (key) => candidate[key] === null || typeof candidate[key] === "string",
    );
}
