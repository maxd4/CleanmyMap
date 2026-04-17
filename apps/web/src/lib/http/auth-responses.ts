import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { AdminAccessResult } from "@/lib/authz";

export function unauthorizedJsonResponse(params?: {
  hint?: string;
  operationId?: string;
}) {
  const error = "Unauthorized";
  const operationId = params?.operationId ?? randomUUID();
  return NextResponse.json(
    {
      error,
      message: error,
      code: "unauthorized",
      hint: params?.hint ?? "Connecte-toi pour acceder a cette ressource.",
      operationId,
    },
    { status: 401 },
  );
}

export function forbiddenJsonResponse(params?: {
  hint?: string;
  operationId?: string;
}) {
  const error = "Forbidden";
  const operationId = params?.operationId ?? randomUUID();
  return NextResponse.json(
    {
      error,
      message: error,
      code: "forbidden",
      hint:
        params?.hint ??
        "Tu n'as pas les permissions suffisantes pour cette action.",
      operationId,
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
