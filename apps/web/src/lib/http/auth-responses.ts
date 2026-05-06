import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { AdminAccessResult } from "@/lib/authz";

/**
 * User-friendly messages (same as api-errors.ts for consistency)
 */
const USER_MESSAGES = {
  auth: "Vous devez vous reconnecter pour continuer.",
  forbidden: "Vous n'avez pas accès à cette page.",
};

export function unauthorizedJsonResponse(params?: {
  hint?: string;
  operationId?: string;
}) {
  const operationId = params?.operationId ?? randomUUID();
  return NextResponse.json(
    {
      error: USER_MESSAGES.auth,
      kind: "permission",
      code: "unauthorized",
      hint: params?.hint ?? "Connectez-vous pour accéder à cette ressource.",
      referenceCode: `AUTH-${operationId.slice(0, 8)}`,
    },
    { status: 401 },
  );
}

export function forbiddenJsonResponse(params?: {
  hint?: string;
  operationId?: string;
}) {
  const operationId = params?.operationId ?? randomUUID();
  return NextResponse.json(
    {
      error: USER_MESSAGES.forbidden,
      kind: "permission",
      code: "forbidden",
      hint: params?.hint ?? "Vous n'avez pas les permissions suffisantes pour cette action.",
      referenceCode: `FRB-${operationId.slice(0, 8)}`,
    },
    { status: 403 },
  );
}

export function adminAccessErrorJsonResponse(
  access: Extract<AdminAccessResult, { ok: false }>,
  operationId?: string,
) {
  return access.status === 401
    ? unauthorizedJsonResponse({ hint: access.error, operationId })
    : forbiddenJsonResponse({ hint: access.error, operationId });
}
