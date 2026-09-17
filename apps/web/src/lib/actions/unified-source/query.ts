import { ACTION_ENTITY_TYPES } from "@/lib/actions/types";
import type { ActionEntityType } from "@/lib/actions/contracts/contract-model";

export function parseEntityTypesParam(
  raw: string | null,
): ActionEntityType[] | null {
  if (!raw || raw.trim() === "" || raw === "all") {
    return null;
  }

  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is ActionEntityType =>
      ACTION_ENTITY_TYPES.includes(token as ActionEntityType),
    );

  if (tokens.length === 0) {
    return null;
  }

  return [...new Set(tokens)];
}
